import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Unlock, AlertTriangle, Calendar as CalIcon, ChevronLeft, ChevronRight, Play, RotateCcw, Trash2 } from 'lucide-react';

type Resource = { id: string; resource_name: string; resource_type: string | null; available_hours_per_day: number; status: string };
type Part = { id: string; part_number: string; revision: string | null; description: string | null };
type Job = { id: string; job_number: string; part_id: string | null; quantity: number; due_date: string | null; priority: string; status: string; planned_start: string | null; planned_finish: string | null; schedule_status: string };
type JobOp = {
  id: string; job_id: string; operation_number: number; operation_name: string;
  resource_id: string | null; setup_time_hours: number; cycle_time_seconds: number;
  total_time_hours: number | null; planned_start: string | null; planned_finish: string | null;
  is_locked: boolean; has_conflict: boolean; sequence_warning: boolean; sequence_order: number | null;
};

type ViewMode = 'day' | 'week';
const ROW_H = 56;
const HEADER_H = 40;
const LEFT_W = 200;

const PRIORITY_COLOR: Record<string, string> = {
  Urgent: 'bg-red-500', High: 'bg-orange-500', Normal: 'bg-blue-500', Low: 'bg-slate-400',
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function GanttChart() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));
  const [resources, setResources] = useState<Resource[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [ops, setOps] = useState<JobOp[]>([]);
  const [selectedOp, setSelectedOp] = useState<JobOp | null>(null);
  const [showConflicts, setShowConflicts] = useState(true);
  const [showLate, setShowLate] = useState(true);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const [r, j, o] = await Promise.all([
      supabase.from('resources').select('*').eq('status', 'Active').order('resource_name'),
      supabase.from('jobs').select('*'),
      supabase.from('job_operations').select('*'),
    ]);
    setResources((r.data as Resource[]) || []);
    setJobs((j.data as Job[]) || []);
    setOps((o.data as JobOp[]) || []);
    const partIds = Array.from(new Set(((j.data || []) as Job[]).map(x => x.part_id).filter(Boolean))) as string[];
    if (partIds.length) {
      const { data } = await supabase.from('parts').select('id,part_number,revision,description').in('id', partIds);
      setParts((data as Part[]) || []);
    } else setParts([]);
  };
  useEffect(() => { load(); }, []);

  const jobsById = useMemo(() => new Map(jobs.map(j => [j.id, j])), [jobs]);
  const partsById = useMemo(() => new Map(parts.map(p => [p.id, p])), [parts]);
  const resourcesById = useMemo(() => new Map(resources.map(r => [r.id, r])), [resources]);

  // Recompute conflict + sequence flags client-side for display
  const flaggedOps = useMemo(() => {
    const byRes = new Map<string, JobOp[]>();
    ops.forEach(o => {
      if (!o.resource_id || !o.planned_start || !o.planned_finish) return;
      const arr = byRes.get(o.resource_id) || [];
      arr.push(o); byRes.set(o.resource_id, arr);
    });
    const conflictIds = new Set<string>();
    byRes.forEach(arr => {
      const sorted = [...arr].sort((a, b) => new Date(a.planned_start!).getTime() - new Date(b.planned_start!).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1];
        if (new Date(a.planned_finish!) > new Date(b.planned_start!)) { conflictIds.add(a.id); conflictIds.add(b.id); }
      }
    });
    const seqIds = new Set<string>();
    const byJob = new Map<string, JobOp[]>();
    ops.forEach(o => { const arr = byJob.get(o.job_id) || []; arr.push(o); byJob.set(o.job_id, arr); });
    byJob.forEach(arr => {
      const sorted = [...arr].sort((a, b) => (a.sequence_order ?? a.operation_number) - (b.sequence_order ?? b.operation_number));
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1], cur = sorted[i];
        if (prev.planned_finish && cur.planned_start && new Date(cur.planned_start) < new Date(prev.planned_finish)) seqIds.add(cur.id);
      }
    });
    return ops.map(o => ({ ...o, has_conflict: conflictIds.has(o.id), sequence_warning: seqIds.has(o.id) }));
  }, [ops]);

  // Timeline range
  const days = view === 'day' ? 3 : 21;
  const pxPerHour = view === 'day' ? 24 : 4;
  const pxPerDay = pxPerHour * 24;
  const timelineStart = anchor;
  const timelineEnd = addDays(anchor, days);
  const totalWidth = days * pxPerDay;

  const dateToX = (d: Date) => ((d.getTime() - timelineStart.getTime()) / 3600000) * pxPerHour;
  const xToDate = (x: number) => new Date(timelineStart.getTime() + (x / pxPerHour) * 3600000);

  // Drag state
  const dragRef = useRef<{ opId: string; mode: 'move' | 'resize'; startX: number; startY: number; origStart: Date; origEnd: Date; resourceId: string | null } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; startX: number; width: number; resourceId: string | null } | null>(null);

  const onMouseDown = (e: React.MouseEvent, op: JobOp, mode: 'move' | 'resize') => {
    e.stopPropagation();
    if (!op.planned_start || !op.planned_finish) return;
    dragRef.current = {
      opId: op.id, mode, startX: e.clientX, startY: e.clientY,
      origStart: new Date(op.planned_start), origEnd: new Date(op.planned_finish),
      resourceId: op.resource_id,
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current; if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const durMs = d.origEnd.getTime() - d.origStart.getTime();
    const newStartMs = d.origStart.getTime() + (dx / pxPerHour) * 3600000;
    const startX = dateToX(new Date(newStartMs));
    const width = (durMs / 3600000) * pxPerHour;
    // vertical: target resource row
    let targetResource = d.resourceId;
    if (d.mode === 'move') {
      const rowDelta = Math.round(dy / ROW_H);
      const idx = resources.findIndex(r => r.id === d.resourceId);
      const newIdx = Math.max(0, Math.min(resources.length - 1, idx + rowDelta));
      targetResource = resources[newIdx]?.id || d.resourceId;
    }
    if (d.mode === 'resize') {
      const newWidth = Math.max(pxPerHour, (durMs / 3600000) * pxPerHour + dx);
      setDragPreview({ id: d.opId, startX: dateToX(d.origStart), width: newWidth, resourceId: d.resourceId });
    } else {
      setDragPreview({ id: d.opId, startX, width, resourceId: targetResource });
    }
  }, [pxPerHour, resources]);

  const onMouseUp = useCallback(async () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    const d = dragRef.current; const preview = dragPreview;
    dragRef.current = null; setDragPreview(null);
    if (!d || !preview) return;
    const newStart = xToDate(preview.startX);
    const durHours = preview.width / pxPerHour;
    const newEnd = new Date(newStart.getTime() + durHours * 3600000);
    const update: any = {
      planned_start: newStart.toISOString(),
      planned_finish: newEnd.toISOString(),
      is_locked: true,
    };
    if (d.mode === 'move' && preview.resourceId !== d.resourceId) update.resource_id = preview.resourceId;
    if (d.mode === 'resize') update.total_time_hours = Number(durHours.toFixed(3));
    const { error } = await supabase.from('job_operations').update(update).eq('id', d.opId);
    if (error) { toast.error(error.message); return; }
    setOps(prev => prev.map(o => o.id === d.opId ? { ...o, ...update } : o));
    toast.success('Schedule updated');
  }, [dragPreview, pxPerHour]);

  const toggleLock = async (op: JobOp) => {
    const { error } = await supabase.from('job_operations').update({ is_locked: !op.is_locked }).eq('id', op.id);
    if (error) return toast.error(error.message);
    setOps(prev => prev.map(o => o.id === op.id ? { ...o, is_locked: !op.is_locked } : o));
    setSelectedOp(s => s && s.id === op.id ? { ...s, is_locked: !op.is_locked } : s);
    toast.success(op.is_locked ? 'Unlocked' : 'Locked');
  };

  const markCompleted = async (op: JobOp) => {
    await supabase.from('job_operations').update({ is_locked: true }).eq('id', op.id);
    await supabase.from('jobs').update({ status: 'Completed' }).eq('id', op.job_id);
    toast.success('Marked completed');
    setSelectedOp(null);
    load();
  };

  // Schedule actions (mirror SchedulingEngine basics)
  const runSchedule = async () => {
    setLoading(true);
    try {
      const activeRes = new Map(resources.map(r => [r.id, r]));
      const eligible = jobs.filter(j => j.status === 'Planned' || j.status === 'Scheduled')
        .sort((a, b) => {
          const po: any = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
          const pa = po[a.priority] ?? 2, pb = po[b.priority] ?? 2;
          if (pa !== pb) return pa - pb;
          return (a.due_date ? new Date(a.due_date).getTime() : Infinity) - (b.due_date ? new Date(b.due_date).getTime() : Infinity);
        });
      const resFree = new Map<string, Date>();
      const base = startOfDay(new Date());
      ops.filter(o => o.is_locked && o.planned_finish && o.resource_id).forEach(o => {
        const e = new Date(o.planned_finish!);
        if (!resFree.get(o.resource_id!) || e > resFree.get(o.resource_id!)!) resFree.set(o.resource_id!, e);
      });
      const addH = (start: Date, hours: number, daily: number) => {
        let rem = hours; const c = new Date(start);
        while (isWeekend(c)) { c.setDate(c.getDate() + 1); c.setHours(0, 0, 0, 0); }
        const ds = new Date(c); ds.setHours(0, 0, 0, 0);
        let used = (c.getTime() - ds.getTime()) / 3600000;
        while (rem > 0) {
          const avail = Math.max(0, daily - used);
          if (avail <= 0) { c.setDate(c.getDate() + 1); c.setHours(0, 0, 0, 0); while (isWeekend(c)) c.setDate(c.getDate() + 1); used = 0; continue; }
          const take = Math.min(rem, avail);
          c.setTime(c.getTime() + take * 3600000); used += take; rem -= take;
        }
        return c;
      };
      const opUpdates: any[] = []; const jobUpdates: any[] = [];
      for (const job of eligible) {
        const jobOps = ops.filter(o => o.job_id === job.id)
          .sort((a, b) => (a.sequence_order ?? a.operation_number) - (b.sequence_order ?? b.operation_number));
        let prev = base; let js: Date | null = null; let je: Date | null = null;
        for (const op of jobOps) {
          if (op.is_locked && op.planned_start && op.planned_finish) {
            const s = new Date(op.planned_start), e = new Date(op.planned_finish);
            if (!js || s < js) js = s; if (!je || e > je) je = e;
            if (e > prev) prev = e;
            continue;
          }
          if (!op.resource_id || !activeRes.has(op.resource_id)) continue;
          const r = activeRes.get(op.resource_id)!;
          const dur = (op.total_time_hours && op.total_time_hours > 0) ? Number(op.total_time_hours)
            : Number(op.setup_time_hours || 0) + (Number(op.cycle_time_seconds || 0) * Number(job.quantity || 0)) / 3600;
          if (dur <= 0) continue;
          const free = resFree.get(op.resource_id) || base;
          const startAt = new Date(Math.max(prev.getTime(), free.getTime()));
          while (isWeekend(startAt)) { startAt.setDate(startAt.getDate() + 1); startAt.setHours(0, 0, 0, 0); }
          const endAt = addH(startAt, dur, r.available_hours_per_day || 8);
          resFree.set(op.resource_id, endAt); prev = endAt;
          if (!js || startAt < js) js = startAt; if (!je || endAt > je) je = endAt;
          opUpdates.push({ id: op.id, planned_start: startAt.toISOString(), planned_finish: endAt.toISOString() });
        }
        const late = !!(je && job.due_date && je > new Date(job.due_date + 'T23:59:59'));
        jobUpdates.push({ id: job.id, planned_start: js?.toISOString() || null, planned_finish: je?.toISOString() || null, schedule_status: je ? (late ? 'Late' : 'Scheduled') : 'Unscheduled', status: je ? 'Scheduled' : job.status });
      }
      for (const u of opUpdates) await supabase.from('job_operations').update({ planned_start: u.planned_start, planned_finish: u.planned_finish }).eq('id', u.id);
      for (const u of jobUpdates) await supabase.from('jobs').update({ planned_start: u.planned_start, planned_finish: u.planned_finish, schedule_status: u.schedule_status, status: u.status }).eq('id', u.id);
      toast.success(`Scheduled ${jobUpdates.length} jobs`);
      load();
    } finally { setLoading(false); }
  };

  const clearSchedule = async () => {
    if (!window.confirm('Clear unlocked planned dates?')) return;
    await supabase.from('job_operations').update({ planned_start: null, planned_finish: null }).eq('is_locked', false);
    await supabase.from('jobs').update({ planned_start: null, planned_finish: null, schedule_status: 'Unscheduled', status: 'Planned' }).eq('status', 'Scheduled');
    toast.success('Schedule cleared'); load();
  };

  const today = startOfDay(new Date());
  const dayHeaders: Date[] = Array.from({ length: days }, (_, i) => addDays(timelineStart, i));

  const partLabel = (job?: Job) => job?.part_id ? partsById.get(job.part_id)?.part_number || '' : '';

  const goToday = () => setAnchor(startOfDay(new Date()));
  const shift = (n: number) => setAnchor(addDays(anchor, n));

  return (
    <AppLayout title="Schedule / Gantt" subtitle="Interactive visual scheduler" showBackButton backTo="/npi/capacity-planner-mvp">
      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border bg-card">
          <Button size="sm" onClick={runSchedule} disabled={loading}><Play className="h-4 w-4" /> Run Schedule</Button>
          <Button size="sm" variant="outline" onClick={runSchedule} disabled={loading}><RotateCcw className="h-4 w-4" /> Re-run</Button>
          <Button size="sm" variant="outline" onClick={clearSchedule}><Trash2 className="h-4 w-4" /> Clear</Button>
          <div className="h-6 w-px bg-border mx-1" />
          <Button size="sm" variant={view === 'day' ? 'default' : 'outline'} onClick={() => setView('day')}>Day</Button>
          <Button size="sm" variant={view === 'week' ? 'default' : 'outline'} onClick={() => setView('week')}>Week</Button>
          <Button size="sm" variant="outline" onClick={goToday}><CalIcon className="h-4 w-4" /> Today</Button>
          <Button size="icon" variant="ghost" onClick={() => shift(-days / 3)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => shift(days / 3)}><ChevronRight className="h-4 w-4" /></Button>
          <div className="h-6 w-px bg-border mx-1" />
          <div className="flex items-center gap-2"><Switch id="sc" checked={showConflicts} onCheckedChange={setShowConflicts} /><Label htmlFor="sc" className="text-xs">Conflicts</Label></div>
          <div className="flex items-center gap-2"><Switch id="sl" checked={showLate} onCheckedChange={setShowLate} /><Label htmlFor="sl" className="text-xs">Late</Label></div>
          <div className="ml-auto text-xs text-muted-foreground">
            {timelineStart.toLocaleDateString()} → {addDays(timelineEnd, -1).toLocaleDateString()}
          </div>
        </div>

        {/* Gantt */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex" style={{ minHeight: HEADER_H + resources.length * ROW_H }}>
            {/* Left column: resources */}
            <div className="shrink-0 border-r bg-muted/30" style={{ width: LEFT_W }}>
              <div className="border-b font-semibold text-xs px-3 flex items-center" style={{ height: HEADER_H }}>Resource</div>
              {resources.map(r => (
                <div key={r.id} className="border-b px-3 flex flex-col justify-center" style={{ height: ROW_H }}>
                  <div className="text-sm font-medium truncate">{r.resource_name}</div>
                  <div className="text-[10px] text-muted-foreground">{r.resource_type || '—'} · {r.available_hours_per_day}h/day</div>
                </div>
              ))}
              {resources.length === 0 && <div className="px-3 py-6 text-xs text-muted-foreground">No active resources</div>}
            </div>

            {/* Timeline */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto relative">
              <div style={{ width: totalWidth, position: 'relative' }}>
                {/* Header */}
                <div className="flex border-b sticky top-0 bg-card z-10" style={{ height: HEADER_H }}>
                  {dayHeaders.map((d, i) => (
                    <div key={i} className={`border-r text-[10px] flex flex-col items-center justify-center ${isWeekend(d) ? 'bg-muted/50 text-muted-foreground' : ''} ${sameDay(d, today) ? 'bg-primary/10 font-semibold' : ''}`} style={{ width: pxPerDay }}>
                      <div>{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                      <div>{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                    </div>
                  ))}
                </div>

                {/* Rows */}
                <div className="relative">
                  {/* Day columns background */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {dayHeaders.map((d, i) => (
                      <div key={i} className={`border-r ${isWeekend(d) ? 'bg-muted/30' : ''}`} style={{ width: pxPerDay, height: resources.length * ROW_H }} />
                    ))}
                  </div>
                  {/* Today line */}
                  {today >= timelineStart && today < timelineEnd && (
                    <div className="absolute top-0 bottom-0 w-px bg-primary z-20 pointer-events-none" style={{ left: dateToX(new Date()) }} />
                  )}
                  {/* Resource rows */}
                  {resources.map((r, ri) => (
                    <div key={r.id} className="border-b relative" style={{ height: ROW_H }}>
                      {flaggedOps.filter(o => o.resource_id === r.id && o.planned_start && o.planned_finish).map(op => {
                        const job = jobsById.get(op.job_id);
                        const part = job?.part_id ? partsById.get(job.part_id) : null;
                        const s = new Date(op.planned_start!);
                        const e = new Date(op.planned_finish!);
                        if (e <= timelineStart || s >= timelineEnd) return null;
                        const x = Math.max(0, dateToX(s));
                        const right = Math.min(totalWidth, dateToX(e));
                        const w = Math.max(20, right - x);
                        const isLate = !!(job?.due_date && e > new Date(job.due_date + 'T23:59:59'));
                        const previewing = dragPreview?.id === op.id;
                        const usingPreview = previewing && dragPreview!.resourceId === r.id;
                        const bx = usingPreview ? dragPreview!.startX : x;
                        const bw = usingPreview ? dragPreview!.width : w;
                        if (previewing && !usingPreview) return null;
                        const color = PRIORITY_COLOR[job?.priority || 'Normal'] || 'bg-blue-500';
                        return (
                          <div
                            key={op.id}
                            onMouseDown={(ev) => onMouseDown(ev, op, 'move')}
                            onClick={(ev) => { ev.stopPropagation(); setSelectedOp(op); }}
                            className={`absolute top-2 rounded-md text-white text-[10px] px-2 flex items-center gap-1 cursor-grab active:cursor-grabbing shadow-sm border ${color}
                              ${showLate && isLate ? 'ring-2 ring-red-600' : ''}
                              ${showConflicts && op.has_conflict ? 'ring-2 ring-amber-500' : ''}
                              ${op.is_locked ? 'border-black/40' : 'border-white/20'}`}
                            style={{ left: bx, width: bw, height: ROW_H - 16 }}
                            title={`${job?.job_number} | ${part?.part_number || ''} | OP${op.operation_number}`}
                          >
                            {op.is_locked && <Lock className="h-3 w-3 shrink-0" />}
                            {(op.has_conflict || op.sequence_warning) && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            <span className="truncate font-medium">{job?.job_number} | {part?.part_number || ''} | OP{op.operation_number}</span>
                            <div
                              onMouseDown={(ev) => onMouseDown(ev, op, 'resize')}
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {flaggedOps.filter(o => o.planned_start).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  No scheduled operations. Click "Run Schedule".
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-500" />Urgent</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-orange-500" />High</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-500" />Normal</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-slate-400" />Low</span>
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Conflict / Sequence</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded ring-2 ring-red-600" /> Late</span>
        </div>
      </main>

      {/* Side panel */}
      <Sheet open={!!selectedOp} onOpenChange={(o) => !o && setSelectedOp(null)}>
        <SheetContent>
          {selectedOp && (() => {
            const job = jobsById.get(selectedOp.job_id);
            const part = job?.part_id ? partsById.get(job.part_id) : null;
            const res = selectedOp.resource_id ? resourcesById.get(selectedOp.resource_id) : null;
            const dur = selectedOp.planned_start && selectedOp.planned_finish
              ? ((new Date(selectedOp.planned_finish).getTime() - new Date(selectedOp.planned_start).getTime()) / 3600000).toFixed(2) : '—';
            const isLate = !!(job?.due_date && selectedOp.planned_finish && new Date(selectedOp.planned_finish) > new Date(job.due_date + 'T23:59:59'));
            return (
              <>
                <SheetHeader>
                  <SheetTitle>{job?.job_number} · OP{selectedOp.operation_number}</SheetTitle>
                  <SheetDescription>{selectedOp.operation_name}</SheetDescription>
                </SheetHeader>
                <div className="space-y-3 mt-4 text-sm">
                  <Row label="Part" value={`${part?.part_number || '—'}${part?.revision ? ` Rev ${part.revision}` : ''}`} />
                  <Row label="Resource" value={res?.resource_name || '—'} />
                  <Row label="Quantity" value={String(job?.quantity || 0)} />
                  <Row label="Planned Start" value={selectedOp.planned_start ? new Date(selectedOp.planned_start).toLocaleString() : '—'} />
                  <Row label="Planned Finish" value={selectedOp.planned_finish ? new Date(selectedOp.planned_finish).toLocaleString() : '—'} />
                  <Row label="Duration" value={`${dur} h`} />
                  <Row label="Due Date" value={job?.due_date || '—'} />
                  <Row label="Priority" value={job?.priority || '—'} />
                  <Row label="Status" value={job?.status || '—'} />
                  <div className="flex gap-2 flex-wrap">
                    {selectedOp.is_locked ? <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Locked</Badge> : <Badge variant="outline">Unlocked</Badge>}
                    {isLate && <Badge variant="destructive">Late</Badge>}
                    {selectedOp.has_conflict && <Badge className="bg-amber-500">Conflict</Badge>}
                    {selectedOp.sequence_warning && <Badge className="bg-amber-500">Sequence</Badge>}
                  </div>
                  <div className="flex flex-col gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => toggleLock(selectedOp)}>
                      {selectedOp.is_locked ? <><Unlock className="h-4 w-4" /> Unlock</> : <><Lock className="h-4 w-4" /> Lock</>}
                    </Button>
                    <Button variant="outline" onClick={() => markCompleted(selectedOp)}>Mark Completed</Button>
                    <Button variant="outline" onClick={() => navigate(`/npi/capacity-planner-mvp/jobs-mvp/${selectedOp.job_id}`)}>Open Job Details</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
