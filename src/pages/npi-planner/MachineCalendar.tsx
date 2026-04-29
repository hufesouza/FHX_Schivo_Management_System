import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNPIPlanning, computeEarliestStart, Part } from '@/hooks/useNPIPlanning';
import { isNonWorkingDay, idleNonWorkingDaysAfter } from '@/utils/workingCalendar';
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, CalendarOff } from 'lucide-react';
import { JobActionDialog, ReadinessReport } from '@/components/npi-planner/JobActionDialog';
import { ExpediteDialog } from '@/components/npi-planner/ExpediteDialog';
import { ReallocateDialog } from '@/components/npi-planner/ReallocateDialog';
import { format } from 'date-fns';

const statusLabel = (status: string | null | undefined, orderedAt: string | null | undefined, leadTime: number | null | undefined) => {
  if (status === 'Received') return 'Received';
  if (status === 'Not Required') return 'Not required';
  if (status === 'Ordered' && orderedAt) {
    return `Ordered ${format(new Date(orderedAt), 'MMM d')} · ${leadTime || 0}d lead`;
  }
  return `Not ordered · ${leadTime || 0}d lead (clock not started)`;
};

const isReady = (status: string | null | undefined) =>
  status === 'Received' || status === 'Not Required' || status === 'Ordered';

// Aggregate tooling status from per-part tooling links (worst-case)
const aggregateTooling = (links: any[]): { status: string; leadTime: number; orderedAt: string | null } => {
  if (!links || links.length === 0) return { status: 'Not Required', leadTime: 0, orderedAt: null };
  const order = ['Issue', 'Delayed', 'Required', 'Not Ordered', 'Ordered', 'Received', 'Not Required'];
  let worst = 'Not Required';
  let lead = 0;
  let orderedAt: string | null = null;
  for (const l of links) {
    const s = l.ordered_status || 'Not Ordered';
    if (order.indexOf(s) < order.indexOf(worst)) worst = s;
    if (l.lead_time_days && l.lead_time_days > lead) lead = l.lead_time_days;
    if (l.ordered_at && (!orderedAt || new Date(l.ordered_at) < new Date(orderedAt))) orderedAt = l.ordered_at;
  }
  // Normalize "Not Ordered" → null-ish so statusLabel renders "Not ordered..."
  const normalized = worst === 'Not Ordered' ? null : worst;
  return { status: normalized as any, leadTime: lead, orderedAt };
};

export default function MachineCalendar() {
  const { machines, schedule, parts, partTooling, availability, calendarSettings, reload, loading } = useNPIPlanning();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    d.setHours(0,0,0,0);
    return d;
  });

  const [actionOpen, setActionOpen] = useState(false);
  const [reallocOpen, setReallocOpen] = useState(false);
  const [expediteOpen, setExpediteOpen] = useState(false);
  const [activePart, setActivePart] = useState<Part | null>(null);
  const [activeReport, setActiveReport] = useState<ReadinessReport | null>(null);

  const days = useMemo(() => {
    return Array.from({length: 14}, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
    });
  }, [weekStart]);

  // Build a quick lookup of all active schedule rows per machine for overlap detection
  const machineBookings = useMemo(() => {
    const m: Record<string, { id: string; part_number: string | null; start: Date; end: Date }[]> = {};
    schedule.forEach(s => {
      if (!s.machine_id) return;
      if (s.allocation_status === 'Cancelled' || s.allocation_status === 'Completed') return;
      (m[s.machine_id] ||= []).push({
        id: s.id, part_number: s.part_number,
        start: new Date(s.start_date), end: new Date(s.end_date),
      });
    });
    return m;
  }, [schedule]);

  const buildReport = (entry: typeof schedule[number], part: Part): ReadinessReport => {
    const links = partTooling.filter((l: any) => l.part_id === part.id);
    const toolAgg = aggregateTooling(links);
    // Prefer aggregated link data; fall back to part-level fields if no links exist
    const effToolStatus = links.length ? toolAgg.status : part.tooling_status;
    const effToolLead = links.length ? toolAgg.leadTime : part.tooling_lead_time;
    const effToolOrderedAt = links.length ? toolAgg.orderedAt : part.tooling_ordered_at;
    const effToolReceivedAt = links.length ? null : part.tooling_received_at;

    const earliest = computeEarliestStart({
      materialLeadTime: part.material_lead_time,
      materialStatus: part.material_status,
      materialOrderedAt: part.material_ordered_at,
      materialReceivedAt: part.material_received_at,
      toolingLeadTime: effToolLead,
      toolingStatus: effToolStatus,
      toolingOrderedAt: effToolOrderedAt,
      toolingReceivedAt: effToolReceivedAt,
      bestCommenceDate: null,
    });
    const scheduledStart = new Date(entry.start_date);
    // Compare on calendar-day granularity — sub-day differences (e.g. ordered 21:12 vs scheduled 23:00)
    // shouldn't be treated as a "1 day slip". A job ready any time on its scheduled day = on time.
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const driftDays = Math.round(
      (startOfDay(earliest).getTime() - startOfDay(scheduledStart).getTime()) / (24 * 3600 * 1000)
    );

    // Overlap: any other booking on same machine whose interval intersects this one
    const others = (machineBookings[entry.machine_id || ''] || []).filter(b => b.id !== entry.id);
    const myStart = scheduledStart;
    const myEnd = new Date(entry.end_date);
    const overlaps = others.filter(b => b.start < myEnd && b.end > myStart);

    return {
      earliest,
      scheduledStart,
      driftDays,
      matReady: isReady(part.material_status),
      matLabel: `${part.material || '—'} · ${statusLabel(part.material_status, part.material_ordered_at, part.material_lead_time)}`,
      toolReady: isReady(effToolStatus),
      toolLabel: `${statusLabel(effToolStatus, effToolOrderedAt, effToolLead)}`,
      hasOverlap: overlaps.length > 0,
      overlapWith: overlaps.map(o => o.part_number || 'Unknown').slice(0, 5),
    };
  };

  const cellEntries = (machineId: string, day: Date) => {
    const start = new Date(day); start.setHours(0,0,0,0);
    const end = new Date(day); end.setHours(23,59,59,999);
    return schedule.filter(s =>
      s.machine_id === machineId &&
      s.allocation_status !== 'Cancelled' &&
      s.allocation_status !== 'Completed' &&
      new Date(s.start_date) <= end &&
      new Date(s.end_date) >= start
    );
  };

  const openAction = (entry: typeof schedule[number]) => {
    const part = parts.find(p => p.id === entry.part_id);
    if (!part) return;
    setActivePart(part);
    setActiveReport(buildReport(entry, part));
    setActionOpen(true);
  };

  if (loading) return <AppLayout title="Calendar" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Machine Calendar" subtitle="2-week view" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="font-semibold">{weekStart.toLocaleDateString()} — {days[13].toLocaleDateString()}</h3>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-left sticky left-0">Machine</th>
                  {days.map(d => {
                    const off = isNonWorkingDay(d, calendarSettings);
                    return (
                      <th key={d.toISOString()} className={`border p-2 whitespace-nowrap ${off ? 'bg-muted-foreground/15 text-muted-foreground' : 'bg-muted'}`}>
                        {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                        {off && <CalendarOff className="h-3 w-3 inline ml-1" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {machines.map(m => {
                  // Detect "idle weekend" risk for this row
                  const machineEntries = schedule
                    .filter(s => s.machine_id === m.id && s.allocation_status !== 'Cancelled' && s.allocation_status !== 'Completed')
                    .map(s => ({ ...s, _start: new Date(s.start_date), _end: new Date(s.end_date) }))
                    .sort((a, b) => a._start.getTime() - b._start.getTime());
                  const idleSpans: { after: Date; days: number }[] = [];
                  for (let i = 0; i < machineEntries.length; i++) {
                    const cur = machineEntries[i];
                    const next = machineEntries[i + 1] || null;
                    const idle = idleNonWorkingDaysAfter(cur._end, next?._start || null, calendarSettings);
                    if (idle >= 2) idleSpans.push({ after: cur._end, days: idle });
                  }
                  return (
                  <tr key={m.id}>
                    <td className="border p-2 font-medium sticky left-0 bg-background">
                      <div className="flex items-center gap-2">
                        <span>{m.machine_name}</span>
                        {idleSpans.length > 0 && (
                          <span title={`Idle ${idleSpans[0].days} non-working days after ${format(idleSpans[0].after, 'MMM d')} — consider a weekend-bridging job`}
                                className="text-amber-600 flex items-center gap-0.5 text-[10px] font-normal">
                            <CalendarOff className="h-3 w-3" /> idle wknd
                          </span>
                        )}
                      </div>
                    </td>
                    {days.map(d => {
                      const entries = cellEntries(m.id, d);
                      const off = isNonWorkingDay(d, calendarSettings);
                      const baseBg = off
                        ? 'bg-muted-foreground/10'
                        : entries.length === 0 ? 'bg-emerald-50' : entries.length > 1 ? 'bg-destructive/10' : 'bg-blue-50';
                      return (
                        <td key={d.toISOString()} className={`border p-1 align-top ${baseBg}`} style={{minWidth:80}}>
                          {entries.map(e => {
                            const part = parts.find(p => p.id === e.part_id);
                            const report = part ? buildReport(e, part) : null;
                            const driftWhole = report ? Math.round(report.driftDays) : 0;
                            const flagged = report && (driftWhole > 0 || report.hasOverlap || !report.matReady || !report.toolReady);
                            const notReady = report && (!report.matReady || !report.toolReady);
                            const tone = !report ? 'bg-primary/15 text-primary'
                              : report.hasOverlap ? 'bg-destructive/20 text-destructive border border-destructive/40'
                              : (notReady || driftWhole > 0) ? 'bg-destructive/15 text-destructive border border-destructive/40'
                              : 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30';
                            const titleText = !report ? `${e.part_number}` :
                              `${e.part_number} — ${e.customer_name || ''}\n` +
                              (report.hasOverlap ? `⚠ Overlap with: ${report.overlapWith.join(', ')}\n` : '') +
                              (driftWhole > 0 ? `⚠ Not ready — earliest ${format(report.earliest, 'MMM d')} (+${driftWhole}d)\n` : '') +
                              `Material: ${report.matLabel}\nTooling: ${report.toolLabel}`;
                            return (
                              <button
                                key={e.id}
                                onClick={() => openAction(e)}
                                title={titleText}
                                className={`w-full text-left text-[10px] rounded px-1 py-0.5 mb-1 truncate flex items-center gap-1 hover:opacity-80 ${tone}`}
                              >
                                {flagged && <AlertTriangle className="h-2.5 w-2.5 shrink-0" />}
                                <span className="truncate">{e.part_number}</span>
                              </button>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
          <span><span className="inline-block w-3 h-3 bg-emerald-50 border align-middle mr-1" />Available</span>
          <span><span className="inline-block w-3 h-3 bg-blue-50 border align-middle mr-1" />Allocated</span>
          <span><span className="inline-block w-3 h-3 bg-destructive/10 border align-middle mr-1" />Overloaded</span>
          <span><span className="inline-block w-3 h-3 bg-muted-foreground/10 border align-middle mr-1" />Non-working day ({calendarSettings.countryLabel})</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Not ready — material/tooling not ordered or schedule will slip</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Schedule overlap</span>
          <span className="flex items-center gap-1"><CalendarOff className="h-3 w-3 text-amber-600" /> Idle weekend — consider a longer/weekend-OK job to bridge</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-500/15 border border-emerald-500/30" /> Ready — on track for scheduled start</span>
        </div>
      </main>

      <JobActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        part={activePart}
        report={activeReport}
        onReallocate={() => { setActionOpen(false); setReallocOpen(true); }}
        onExpedite={() => { setActionOpen(false); setExpediteOpen(true); }}
      />

      <ReallocateDialog
        open={reallocOpen}
        onOpenChange={setReallocOpen}
        part={activePart}
        machines={machines}
        schedule={schedule}
        availability={availability}
        calendar={calendarSettings}
        onApplied={reload}
      />

      <ExpediteDialog
        open={expediteOpen}
        onOpenChange={setExpediteOpen}
        part={activePart}
        scheduledStart={activeReport?.scheduledStart || null}
        onApplied={reload}
      />
    </AppLayout>
  );
}
