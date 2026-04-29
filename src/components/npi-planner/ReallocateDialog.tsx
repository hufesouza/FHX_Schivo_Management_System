import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Part, Machine, ScheduleEntry, MachineAvailability,
  recommendAllocations, AllocationOption, CalendarSettings,
} from '@/hooks/useNPIPlanning';
import { DEFAULT_CALENDAR } from '@/utils/workingCalendar';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  part: Part | null;
  machines: Machine[];
  schedule: ScheduleEntry[];
  availability: MachineAvailability[];
  calendar?: CalendarSettings;
  onApplied?: () => void;
}

const STATUS_TONE: Record<string, string> = {
  'On Track': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'At Risk': 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  'Late': 'bg-destructive/15 text-destructive border-destructive/30',
};

export function ReallocateDialog({ open, onOpenChange, part, machines, schedule, availability, calendar, onApplied }: Props) {
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Load this part's candidate machine options (fall back to all machines)
  useEffect(() => {
    if (!open || !part) return;
    setLoading(true);
    supabase.from('npi_part_machine_options')
      .select('machine_id')
      .eq('part_id', part.id)
      .then(({ data }) => {
        const ids = (data || []).map((r: any) => r.machine_id);
        setCandidateIds(ids);
        setLoading(false);
      });
  }, [open, part?.id]);

  const options: AllocationOption[] = useMemo(() => {
    if (!part) return [];
    const candidateMachines = candidateIds.length
      ? machines.filter(m => candidateIds.includes(m.id))
      : machines;
    return recommendAllocations(candidateMachines, schedule, availability, {
      qty: Number(part.qty) || 0,
      cycleTimeHrs: Number(part.cycle_time) || 0,
      developmentTimeHrs: Number(part.development_time) || 0,
      materialLeadTime: part.material_lead_time,
      materialStatus: part.material_status,
      materialOrderedAt: (part as any).material_ordered_at,
      materialReceivedAt: (part as any).material_received_at,
      toolingLeadTime: part.tooling_lead_time,
      toolingStatus: part.tooling_status,
      toolingOrderedAt: (part as any).tooling_ordered_at,
      toolingReceivedAt: (part as any).tooling_received_at,
      subconRequired: !!part.subcon,
      subconLeadTime: part.subcon_lead_time,
      backendLeadTime: 0,
      bestCommenceDate: part.best_commence_date ? new Date(part.best_commence_date) : null,
      committedDate: part.committed_date ? new Date(part.committed_date) : null,
      calendar: calendar || DEFAULT_CALENDAR,
      devAllowWeekends: !!(part as any).dev_allow_weekends,
      prodAllowWeekends: (part as any).prod_allow_weekends !== false,
    }).slice(0, 5);
  }, [part, candidateIds, machines, schedule, availability, calendar]);

  const apply = async (opt: AllocationOption) => {
    if (!part) return;
    setApplyingId(opt.machine.id);
    try {
      // Cancel any existing active schedule rows for this part
      await supabase.from('npi_machine_schedule')
        .update({ allocation_status: 'Cancelled' })
        .eq('part_id', part.id)
        .in('allocation_status', ['Scheduled', 'In Production']);

      // Insert new schedule row
      const totalHrs = (Number(part.development_time) || 0) + (Number(part.cycle_time) || 0) * (Number(part.qty) || 0);
      const { error: schedErr } = await supabase.from('npi_machine_schedule').insert({
        part_id: part.id,
        part_number: part.part_number,
        customer_name: part.customer_name,
        project_name: part.project_name,
        machine_id: opt.machine.id,
        machine_name: opt.machine.machine_name,
        start_date: opt.machiningStart.toISOString(),
        end_date: opt.machiningEnd.toISOString(),
        total_required_time: totalHrs,
        allocation_status: 'Scheduled',
      });
      if (schedErr) throw schedErr;

      // Update part with new machine + status
      const { error: partErr } = await supabase.from('npi_parts')
        .update({
          machine_id: opt.machine.id,
          machine_name: opt.machine.machine_name,
          best_commence_date: opt.machiningStart.toISOString().slice(0, 10),
          overall_status: opt.status === 'Late' ? 'Late' : opt.status === 'At Risk' ? 'At Risk' : 'Scheduled',
        })
        .eq('id', part.id);
      if (partErr) throw partErr;

      toast.success(`Reallocated to ${opt.machine.machine_name}`);
      onOpenChange(false);
      onApplied?.();
    } catch (e: any) {
      toast.error(e.message || 'Reallocation failed');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recommend reallocation — {part?.part_number}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : options.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No candidate machines/slots available with current constraints.</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {options.map((opt, i) => (
              <div key={opt.machine.id} className="border rounded-md p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {i === 0 && <Badge variant="secondary">Best</Badge>}
                    <span className="font-medium">{opt.machine.machine_name}</span>
                    <Badge variant="outline" className={STATUS_TONE[opt.status]}>{opt.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-x-3">
                    <span>Earliest start: <strong>{format(opt.earliestStart, 'MMM d, yyyy')}</strong></span>
                    <span>Machining: {format(opt.machiningStart, 'MMM d')} → {format(opt.machiningEnd, 'MMM d')}</span>
                    <span>Ship: <strong>{format(opt.shipDate, 'MMM d, yyyy')}</strong></span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{opt.reason}</div>
                </div>
                <Button size="sm" disabled={applyingId === opt.machine.id} onClick={() => apply(opt)}>
                  {applyingId === opt.machine.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
