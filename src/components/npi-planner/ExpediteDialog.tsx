import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Part, computeEarliestStart } from '@/hooks/useNPIPlanning';
import { Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  part: Part | null;
  scheduledStart: Date | null;
  onApplied?: () => void;
}

const STATUS_TONE: Record<string, string> = {
  'On Track': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'At Risk': 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  'Late': 'bg-destructive/15 text-destructive border-destructive/30',
};

export function ExpediteDialog({ open, onOpenChange, part, scheduledStart, onApplied }: Props) {
  const [matLT, setMatLT] = useState(0);
  const [toolLT, setToolLT] = useState(0);
  const [cycleMin, setCycleMin] = useState(0);
  const [devMin, setDevMin] = useState(0);
  const [backendHrs, setBackendHrs] = useState(0);
  const [subconLT, setSubconLT] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!part) return;
    setMatLT(Number(part.material_lead_time) || 0);
    setToolLT(Number(part.tooling_lead_time) || 0);
    setCycleMin((Number(part.cycle_time) || 0) * 60);
    setDevMin((Number(part.development_time) || 0) * 60);
    setBackendHrs(Number((part as any).backend_time) || 0);
    setSubconLT(Number(part.subcon_lead_time) || 0);
  }, [part?.id, open]);

  const original = useMemo(() => ({
    matLT: Number(part?.material_lead_time) || 0,
    toolLT: Number(part?.tooling_lead_time) || 0,
    cycleMin: (Number(part?.cycle_time) || 0) * 60,
    devMin: (Number(part?.development_time) || 0) * 60,
    backendHrs: Number((part as any)?.backend_time) || 0,
    subconLT: Number(part?.subcon_lead_time) || 0,
  }), [part]);

  const projection = useMemo(() => {
    if (!part) return null;
    const cycleHrs = cycleMin / 60;
    const devHrs = devMin / 60;
    const earliest = computeEarliestStart({
      materialLeadTime: matLT,
      materialStatus: part.material_status,
      materialOrderedAt: (part as any).material_ordered_at,
      materialReceivedAt: (part as any).material_received_at,
      toolingLeadTime: toolLT,
      toolingStatus: part.tooling_status,
      toolingOrderedAt: (part as any).tooling_ordered_at,
      toolingReceivedAt: (part as any).tooling_received_at,
      bestCommenceDate: null,
    });
    const machiningHrs = devHrs + cycleHrs * (Number(part.qty) || 0);
    const machiningStart = scheduledStart && scheduledStart > earliest ? scheduledStart : earliest;
    const machiningEnd = new Date(machiningStart.getTime() + machiningHrs * 3600 * 1000);
    const backendDays = (part.subcon ? subconLT : 0) + Math.ceil(backendHrs / 24);
    const ship = new Date(machiningEnd.getTime() + backendDays * 24 * 3600 * 1000);
    const committed = part.committed_date ? new Date(part.committed_date) : null;
    let status: 'On Track' | 'At Risk' | 'Late' = 'On Track';
    if (committed && ship > committed) {
      const overdue = (ship.getTime() - committed.getTime()) / (24 * 3600 * 1000);
      status = overdue > 3 ? 'Late' : 'At Risk';
    }
    return { earliest, machiningStart, machiningEnd, ship, committed, status };
  }, [part, matLT, toolLT, cycleMin, devMin, backendHrs, subconLT, scheduledStart]);

  const save = async () => {
    if (!part) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('npi_parts').update({
        material_lead_time: matLT,
        tooling_lead_time: toolLT,
        cycle_time: cycleMin / 60,
        development_time: devMin / 60,
        backend_time: backendHrs,
        subcon_lead_time: subconLT,
      } as any).eq('id', part.id);
      if (error) throw error;
      toast.success('Expedite values saved');
      onOpenChange(false);
      onApplied?.();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, setValue, originalValue, suffix }: any) => {
    const delta = value - originalValue;
    return (
      <div className="space-y-1">
        <Label className="text-xs flex items-center justify-between">
          <span>{label}</span>
          {delta !== 0 && (
            <span className={`text-[10px] ${delta < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
          )}
        </Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="h-8"
          />
          <span className="text-xs text-muted-foreground w-10">{suffix}</span>
        </div>
        <div className="text-[10px] text-muted-foreground">was {originalValue}{suffix}</div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Expedite — {part?.part_number}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Reduce lead times or cycle/dev hours to meet the committed date without reallocating.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          <Field label="Material lead time" value={matLT} setValue={setMatLT} originalValue={original.matLT} suffix="d" />
          <Field label="Tooling lead time" value={toolLT} setValue={setToolLT} originalValue={original.toolLT} suffix="d" />
          <Field label="Cycle time / pc" value={cycleMin} setValue={setCycleMin} originalValue={original.cycleMin} suffix="min" />
          <Field label="Development time" value={devMin} setValue={setDevMin} originalValue={original.devMin} suffix="min" />
          <Field label="Backend time" value={backendHrs} setValue={setBackendHrs} originalValue={original.backendHrs} suffix="h" />
          {part?.subcon && (
            <Field label="Subcon / backend" value={subconLT} setValue={setSubconLT} originalValue={original.subconLT} suffix="d" />
          )}
        </div>

        {projection && (
          <div className="mt-3 rounded-md border bg-muted/30 p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium">Projection</span>
              <Badge variant="outline" className={STATUS_TONE[projection.status]}>{projection.status}</Badge>
            </div>
            <div>Earliest ready: <strong>{format(projection.earliest, 'MMM d, yyyy')}</strong></div>
            <div>Machining: {format(projection.machiningStart, 'MMM d')} → {format(projection.machiningEnd, 'MMM d')}</div>
            <div>Ship date: <strong>{format(projection.ship, 'MMM d, yyyy')}</strong>
              {projection.committed && (
                <span className="text-muted-foreground"> (committed {format(projection.committed, 'MMM d')})</span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save expedite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
