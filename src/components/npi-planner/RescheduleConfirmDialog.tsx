import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CalendarClock, Loader2 } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ReschedulePayload = {
  scheduleId: string;
  partId: string | null;
  partNumber: string | null;
  fromMachineId: string;
  fromMachineName: string;
  toMachineId: string;
  toMachineName: string;
  oldStart: Date;
  newStart: Date;
  newEnd: Date;
  totalHours: number;
  committedDate: Date | null;
  shipDate: Date | null;
  overlapsWith: string[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: ReschedulePayload | null;
  onApplied?: () => void;
}

export function RescheduleConfirmDialog({ open, onOpenChange, payload, onApplied }: Props) {
  const [saving, setSaving] = useState(false);
  if (!payload) return null;

  const dayShift = differenceInCalendarDays(payload.newStart, payload.oldStart);
  const machineChanged = payload.fromMachineId !== payload.toMachineId;
  // Estimated new ship date = new end date (machining end). If we know an old ship_date,
  // we can show its delta vs the committed date too.
  const newShipDate = payload.newEnd;
  const committedImpactDays = payload.committedDate
    ? differenceInCalendarDays(newShipDate, payload.committedDate)
    : null;
  const breachesCommitted = committedImpactDays !== null && committedImpactDays > 0;

  const apply = async () => {
    setSaving(true);
    try {
      // 1. Update the existing schedule row with new machine + dates
      const { error: schedErr } = await supabase
        .from('npi_machine_schedule')
        .update({
          machine_id: payload.toMachineId,
          machine_name: payload.toMachineName,
          start_date: payload.newStart.toISOString(),
          end_date: payload.newEnd.toISOString(),
        })
        .eq('id', payload.scheduleId);
      if (schedErr) throw schedErr;

      // 2. Update the part record (machine + best_commence_date)
      if (payload.partId) {
        const { error: partErr } = await supabase
          .from('npi_parts')
          .update({
            machine_id: payload.toMachineId,
            machine_name: payload.toMachineName,
            best_commence_date: payload.newStart.toISOString().slice(0, 10),
          })
          .eq('id', payload.partId);
        if (partErr) throw partErr;

        // 3. Ensure target machine is in capable machines list
        if (machineChanged) {
          const { data: existing } = await supabase
            .from('npi_part_machine_options')
            .select('id')
            .eq('part_id', payload.partId)
            .eq('machine_id', payload.toMachineId)
            .maybeSingle();
          if (!existing) {
            await supabase
              .from('npi_part_machine_options')
              .insert({ part_id: payload.partId, machine_id: payload.toMachineId });
          }
        }
      }

      toast.success(
        machineChanged
          ? `Moved ${payload.partNumber} to ${payload.toMachineName} on ${format(payload.newStart, 'MMM d')}`
          : `Rescheduled ${payload.partNumber} to ${format(payload.newStart, 'MMM d')}`
      );
      onOpenChange(false);
      onApplied?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to reschedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Confirm reschedule — {payload.partNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded border p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Machine</span>
              <span className={machineChanged ? 'font-medium text-primary' : ''}>
                {machineChanged
                  ? `${payload.fromMachineName} → ${payload.toMachineName}`
                  : payload.toMachineName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start date</span>
              <span className="font-medium">
                {format(payload.oldStart, 'MMM d')} → {format(payload.newStart, 'MMM d, yyyy')}
                {dayShift !== 0 && (
                  <span className={`ml-1 text-xs ${dayShift > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ({dayShift > 0 ? '+' : ''}{dayShift}d)
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New end date</span>
              <span>{format(payload.newEnd, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Run time</span>
              <span>{payload.totalHours.toFixed(1)} h</span>
            </div>
          </div>

          {payload.committedDate && (
            <div className="rounded border p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Committed date</span>
                <span>{format(payload.committedDate, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected finish</span>
                <span className={breachesCommitted ? 'text-destructive font-medium' : 'text-emerald-700'}>
                  {format(newShipDate, 'MMM d, yyyy')}
                  {committedImpactDays !== null && (
                    <span className="ml-1 text-xs">
                      ({committedImpactDays > 0 ? `+${committedImpactDays}d late` : `${Math.abs(committedImpactDays)}d early`})
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {breachesCommitted && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This change will <strong>miss the committed date</strong> by {committedImpactDays}{' '}
                day{committedImpactDays === 1 ? '' : 's'}. Customer notification may be required.
              </AlertDescription>
            </Alert>
          )}

          {!payload.committedDate && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No committed date set for this part — committed-date impact cannot be checked.
              </AlertDescription>
            </Alert>
          )}

          {payload.overlapsWith.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Will overlap on {payload.toMachineName} with:{' '}
                <strong>{payload.overlapsWith.join(', ')}</strong>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={saving} variant={breachesCommitted ? 'destructive' : 'default'}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {breachesCommitted ? 'Save anyway' : 'Save change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
