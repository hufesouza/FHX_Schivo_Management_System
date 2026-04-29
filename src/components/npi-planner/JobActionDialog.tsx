import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Zap, Shuffle } from 'lucide-react';
import { Part } from '@/hooks/useNPIPlanning';

export type ReadinessReport = {
  earliest: Date;
  scheduledStart: Date;
  driftDays: number;        // earliest - scheduledStart in days (positive = late)
  matReady: boolean;
  matLabel: string;
  toolReady: boolean;
  toolLabel: string;
  hasOverlap: boolean;
  overlapWith: string[];
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  part: Part | null;
  report: ReadinessReport | null;
  onReallocate: () => void;
  onExpedite: () => void;
}

const Row = ({ ok, label, detail }: { ok: boolean; label: string; detail: string }) => (
  <div className="flex items-start gap-2 text-xs">
    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
        : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />}
    <div>
      <div className="font-medium">{label}</div>
      <div className="text-muted-foreground">{detail}</div>
    </div>
  </div>
);

export function JobActionDialog({ open, onOpenChange, part, report, onReallocate, onExpedite }: Props) {
  if (!part || !report) return null;
  const blocked = report.driftDays > 0 || report.hasOverlap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {blocked ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                     : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {part.part_number}
            {part.customer_name && <span className="text-xs text-muted-foreground font-normal">· {part.customer_name}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 bg-muted/30 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Scheduled to start: <strong>{format(report.scheduledStart, 'MMM d, yyyy')}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>Feasible earliest start: <strong>{format(report.earliest, 'MMM d, yyyy')}</strong></span>
              {report.driftDays > 0 && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-800 border-amber-500/30">
                  +{Math.ceil(report.driftDays)}d slip
                </Badge>
              )}
            </div>
          </div>

          <Row ok={report.matReady} label="Material" detail={report.matLabel} />
          <Row ok={report.toolReady} label="Tooling" detail={report.toolLabel} />

          {report.hasOverlap && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <div className="font-medium text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Overlap detected
              </div>
              <div className="text-muted-foreground mt-1">
                Conflicts with: {report.overlapWith.join(', ')}
              </div>
            </div>
          )}

          {report.driftDays > 0 && !report.hasOverlap && (
            <div className="text-xs text-muted-foreground">
              Lead-time clock has not started — start date will drift one day for each day this is delayed.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="secondary" onClick={onExpedite}>
            <Zap className="h-4 w-4 mr-1" /> Expedite
          </Button>
          <Button onClick={onReallocate}>
            <Shuffle className="h-4 w-4 mr-1" /> Reallocate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
