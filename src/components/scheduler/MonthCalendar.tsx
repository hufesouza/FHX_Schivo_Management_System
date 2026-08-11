import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { fmtDuration, fmtHours, fromISO, monthMatrix, productionHours, toISO } from '@/utils/schedulerEngine';
import type { SchedAllocation, SchedHoliday, SchedJob, SchedSetter } from '@/types/scheduler';
import { activityColor } from '@/utils/schedulerColors';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export interface MonthCalendarProps {
  year: number;
  month: number; // 0-11
  allocations: SchedAllocation[];
  jobById: Record<string, SchedJob>;
  setterById: Record<string, SchedSetter>;
  holidays: SchedHoliday[];
  selectedDate?: string | null;
  canEdit?: boolean;
  onSelectDate?: (iso: string) => void;
  onCreateAt?: (iso: string) => void;
  onOpenJob?: (jobId: string) => void;
  onMoveJob?: (jobId: string, iso: string) => void;
  nonWorking?: (iso: string) => boolean;
  /**
   * 'production' shows quantity, 'programming' shows the programmer on each chip,
   * 'machine' shows combined machine occupancy (development + production) colour-coded by activity.
   */
  mode?: 'development' | 'production' | 'programming' | 'machine';



}

export function MonthCalendar({
  year,
  month,
  allocations,
  jobById,
  setterById,
  holidays,
  selectedDate,
  canEdit = true,
  onSelectDate,
  onCreateAt,
  onOpenJob,
  onMoveJob,
  nonWorking,
  mode = 'development',

}: MonthCalendarProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const weeks = useMemo(() => monthMatrix(year, month), [year, month]);
  const todayISO = toISO(new Date());

  const byDate = useMemo(() => {
    const map: Record<string, SchedAllocation[]> = {};
    for (const a of allocations) {
      map[a.alloc_date] = map[a.alloc_date] || [];
      map[a.alloc_date].push(a);
    }
    return map;
  }, [allocations]);

  const holidayLabel = (iso: string) =>
    holidays.find((h) => h.holiday_date === iso && !h.setter_id && !h.machine_id)?.label ?? null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/50">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'px-2 py-1.5 text-[11px] font-semibold tracking-wide text-center text-muted-foreground',
              i >= 5 && 'bg-muted',
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((iso) => {
          const d = fromISO(iso);
          const inMonth = d.getMonth() === month;
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          const blocked = nonWorking ? nonWorking(iso) : weekend;
          const dayAllocs = byDate[iso] || [];
          const hol = holidayLabel(iso);
          return (
            <div
              key={iso}
              onClick={() => onSelectDate?.(iso)}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOver(iso);
              }}
              onDragLeave={() => setDragOver((v) => (v === iso ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const jobId = e.dataTransfer.getData('text/job-id');
                if (jobId && canEdit) onMoveJob?.(jobId, iso);
              }}
              className={cn(
                'min-h-[104px] border-b border-r border-border p-1 relative group transition-colors',
                !inMonth && 'bg-muted/30 opacity-60',
                blocked && inMonth && 'bg-muted/60',
                selectedDate === iso && 'ring-2 ring-inset ring-primary',
                dragOver === iso && 'bg-primary/10',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-semibold px-1 rounded',
                    iso === todayISO && 'bg-primary text-primary-foreground',
                    !inMonth && 'text-muted-foreground',
                  )}
                >
                  {d.getDate()}
                </span>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateAt?.(iso);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                    title="Add job on this date"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {hol && <div className="text-[10px] text-destructive truncate px-1">{hol}</div>}
              <div className="mt-1 space-y-1">
                {dayAllocs.slice(0, 4).map((a) => {
                  const job = jobById[a.job_id];
                  if (!job) return null;
                  const isSetup = a.alloc_type === 'setup';
                  const isProd = a.alloc_type === 'production';
                  const activity = isSetup
                    ? activityColor('setup')
                    : mode === 'machine'
                      ? activityColor(a.alloc_type)
                      : mode === 'production'
                        ? activityColor('production')
                        : mode === 'programming'
                          ? activityColor('programming')
                          : activityColor('development');
                  const resourceId = mode === 'programming' || isSetup ? a.setter_id : job.setter_id;
                  const setter = resourceId ? setterById[resourceId] : undefined;
                  const typeTag = job.is_production
                    ? job.production_type === 'standard_production' ? 'STD' : 'NPI'
                    : 'NPI';
                  const activityLabel = isSetup
                    ? `SETUP (${typeTag})`
                    : mode === 'machine'
                      ? (isProd ? `PRODUCTION / RUN (${typeTag})` : 'DEVELOPMENT')
                      : mode === 'programming'
                        ? 'PROGRAMMING'
                        : mode === 'production'
                          ? `PRODUCTION / RUN (${typeTag})`
                          : job.job_number;
                  const secondary = isSetup
                    ? setter?.name ?? 'No setter'
                    : mode === 'production' || (mode === 'machine' && isProd)
                      ? `${Number(job.production_quantity) || 0} pcs`
                      : setter?.name ?? (mode === 'programming' ? 'No programmer' : 'No setter');
                  const tip = [
                    `PO#: ${job.po_number ?? '—'}`,
                    `Job: ${job.job_number}`,
                    `Part: ${job.part_number ?? '—'}`,
                    `Customer: ${job.customer ?? '—'}`,
                    `Activity: ${isSetup ? 'Setup (setter + machine)' : mode === 'machine' ? (isProd ? 'Production / Run' : 'Development') : activityLabel}`,
                    job.is_production ? `Production type: ${job.production_type === 'standard_production' ? 'Standard Production' : 'NPI Production'}` : null,
                    isSetup ? `Setup setter: ${setter?.name ?? '—'}` : null,
                    isProd
                      ? `Quantity: ${Number(job.production_quantity) || 0} pcs`
                      : `Setter: ${setter?.name ?? '—'}`,
                    isProd && Number(job.cycle_time) > 0
                      ? `Cycle time: ${job.cycle_time} ${job.cycle_time_unit === 'hours' ? 'h' : job.cycle_time_unit === 'seconds' ? 's' : 'min'}/pc`
                      : null,
                    isProd
                      ? `Total machine time: ${fmtDuration(productionHours(job.production_quantity, job.cycle_time, job.cycle_time_unit))} (${job.production_start ?? '—'} -> ${job.production_end ?? '—'})`
                      : null,
                    `Allocated: ${fmtHours(a.hours)} on ${a.alloc_date}`,
                  ].filter(Boolean).join('\n');
                  const dragAllowed = canEdit && !isProd && !isSetup;
                  return (
                    <div
                      key={a.id}
                      draggable={dragAllowed}
                      onDragStart={(e) => e.dataTransfer.setData('text/job-id', job.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenJob?.(job.id);
                      }}
                      className="rounded px-1 py-0.5 cursor-pointer text-[10px] leading-tight border-l-2 hover:brightness-95"
                      style={{ borderLeftColor: activity.hex, backgroundColor: activity.bg }}
                      title={tip}
                    >
                      <div className="font-semibold truncate">{job.po_number || job.job_number}</div>
                      <div className="truncate" style={{ color: activity.hex }}>{activityLabel}</div>
                      <div className="truncate text-muted-foreground">{secondary}</div>
                      <div className="text-muted-foreground">{fmtHours(a.hours)}</div>
                    </div>
                  );
                })}
                {dayAllocs.length > 4 && (
                  <div className="text-[10px] text-muted-foreground px-1">+{dayAllocs.length - 4} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface MonthNavProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function MonthNav({ year, month, onChange }: MonthNavProps) {
  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChange(d.getFullYear(), d.getMonth());
  };
  const now = new Date();
  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 2 + i);
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onChange(now.getFullYear(), now.getMonth())}>
        Today
      </Button>
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={month}
        onChange={(e) => onChange(year, Number(e.target.value))}
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>{m}</option>
        ))}
      </select>
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={year}
        onChange={(e) => onChange(Number(e.target.value), month)}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export { MONTHS };
