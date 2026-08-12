import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtHours, fromISO, toISO } from '@/utils/schedulerEngine';
import type { SchedAllocation, SchedHoliday, SchedJob, SchedSetter } from '@/types/scheduler';
import { activityColor } from '@/utils/schedulerColors';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLS = 37; // max offset (6) + 31 days
const DOW_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface YearCalendarProps {
  year: number;
  allocations: SchedAllocation[];
  jobById: Record<string, SchedJob>;
  setterById: Record<string, SchedSetter>;
  holidays: SchedHoliday[];
  selectedDate?: string | null;
  onSelectDate?: (iso: string) => void;
  onOpenJob?: (jobId: string) => void;
  nonWorking?: (iso: string) => boolean;
  mode?: 'development' | 'production' | 'programming' | 'machine';
}

const shortCode = (allocType: string | null | undefined) => {
  switch (allocType) {
    case 'setup':
      return 'S';
    case 'production':
      return 'R';
    case 'programming':
      return 'P';
    default:
      return 'D';
  }
};

export function YearCalendar({
  year,
  allocations,
  jobById,
  setterById,
  holidays,
  selectedDate,
  onSelectDate,
  onOpenJob,
  nonWorking,
  mode = 'development',
}: YearCalendarProps) {
  const todayISO = toISO(new Date());

  const byDate = useMemo(() => {
    const map: Record<string, SchedAllocation[]> = {};
    for (const a of allocations) {
      if (!a.alloc_date.startsWith(String(year))) continue;
      map[a.alloc_date] = map[a.alloc_date] || [];
      map[a.alloc_date].push(a);
    }
    return map;
  }, [allocations, year]);

  const holidayLabel = (iso: string) =>
    holidays.find((h) => h.holiday_date === iso && !h.setter_id && !h.machine_id)?.label ?? null;

  return (
    <div className="border border-border rounded-lg bg-card overflow-x-auto">
      <div className="min-w-[1100px]">
        {/* header */}
        <div
          className="grid border-b border-border bg-muted/50"
          style={{ gridTemplateColumns: `48px repeat(${COLS}, minmax(26px, 1fr))` }}
        >
          <div />
          {Array.from({ length: COLS }, (_, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-semibold text-muted-foreground py-1"
            >
              {DOW_LETTER[i % 7]}
            </div>
          ))}
        </div>

        {MONTHS_SHORT.map((label, m) => {
          const first = new Date(year, m, 1);
          const offset = first.getDay();
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          return (
            <div
              key={label}
              className="grid border-b border-border last:border-b-0"
              style={{ gridTemplateColumns: `48px repeat(${COLS}, minmax(26px, 1fr))` }}
            >
              <div className="text-[11px] font-semibold px-1.5 py-2 border-r border-border flex items-center">
                {label}
              </div>
              {Array.from({ length: COLS }, (_, col) => {
                const day = col - offset + 1;
                if (day < 1 || day > daysInMonth) {
                  return <div key={col} className="bg-muted/40 border-r border-border/60 min-h-[38px]" />;
                }
                const iso = toISO(new Date(year, m, day));
                const d = fromISO(iso);
                const weekend = d.getDay() === 0 || d.getDay() === 6;
                const blocked = nonWorking ? nonWorking(iso) : weekend;
                const dayAllocs = byDate[iso] || [];
                const hol = holidayLabel(iso);
                return (
                  <div
                    key={col}
                    onClick={() => onSelectDate?.(iso)}
                    title={hol ?? undefined}
                    className={cn(
                      'min-h-[38px] border-r border-border/60 px-[2px] pt-[1px] relative cursor-pointer',
                      blocked ? 'bg-muted/60' : 'bg-primary/5',
                      selectedDate === iso && 'ring-2 ring-inset ring-primary',
                    )}
                  >
                    <div
                      className={cn(
                        'text-[9px] leading-none text-center rounded',
                        iso === todayISO && 'bg-primary text-primary-foreground font-bold',
                        hol && 'text-destructive font-semibold',
                      )}
                    >
                      {day}
                    </div>
                    <div className="mt-[1px] space-y-[1px]">
                      {dayAllocs.slice(0, 2).map((a) => {
                        const job = jobById[a.job_id];
                        if (!job) return null;
                        const isSetup = a.alloc_type === 'setup';
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
                        const tip = [
                          `PO#: ${job.po_number ?? '—'}`,
                          `Part: ${job.part_number ?? job.job_number}`,
                          `Customer: ${job.customer ?? '—'}`,
                          `Activity: ${a.alloc_type ?? 'development'}`,
                          `Resource: ${setter?.name ?? '—'}`,
                          `Allocated: ${fmtHours(a.hours)} on ${a.alloc_date}`,
                        ].join('\n');
                        return (
                          <div
                            key={a.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenJob?.(job.id);
                            }}
                            title={tip}
                            className="rounded-sm text-[8px] leading-[10px] text-center font-semibold truncate border-l-2 hover:brightness-95"
                            style={{ borderLeftColor: activity.hex, backgroundColor: activity.bg, color: activity.hex }}
                          >
                            {shortCode(a.alloc_type)}
                          </div>
                        );
                      })}
                      {dayAllocs.length > 2 && (
                        <div className="text-[8px] leading-[10px] text-center text-muted-foreground">
                          +{dayAllocs.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
        <span>D = Development</span>
        <span>S = Setup</span>
        <span>R = Production / Run</span>
        <span>P = Programming</span>
      </div>
    </div>
  );
}

export interface YearNavProps {
  year: number;
  onChange: (year: number) => void;
}

export function YearNav({ year, onChange }: YearNavProps) {
  const now = new Date();
  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 2 + i);
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => onChange(year - 1)} aria-label="Previous year">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => onChange(year + 1)} aria-label="Next year">
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onChange(now.getFullYear())}>
        This year
      </Button>
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={year}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
