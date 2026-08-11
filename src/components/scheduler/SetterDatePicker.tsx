import { useMemo, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { fmtHours, fromISO, setterHoursOn, toISO } from '@/utils/schedulerEngine';
import type { SchedAllocation, SchedHoliday, SetterCalendarMap } from '@/types/scheduler';

interface SetterDatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  setterId: string | null;
  setterName?: string | null;
  calendar: SetterCalendarMap;
  holidays: SchedHoliday[];
  allocations: SchedAllocation[];
  /** Allocations of the job being edited are ignored so its own hours don't block its dates. */
  excludeJobId?: string | null;
  disabled?: boolean;
}

/**
 * Date picker that greys out days where the selected setter has no remaining
 * capacity (weekend, holiday, zero-hour day or fully booked) and shows the
 * remaining free hours on every selectable day — like a booking calendar.
 */
export function SetterDatePicker({
  value,
  onChange,
  setterId,
  setterName,
  calendar,
  holidays,
  allocations,
  excludeJobId,
  disabled,
}: SetterDatePickerProps) {
  const [open, setOpen] = useState(false);

  const bookedByDate = useMemo(() => {
    const map: Record<string, number> = {};
    if (!setterId) return map;
    for (const a of allocations) {
      if (a.setter_id !== setterId) continue;
      if (a.alloc_type === 'production') continue; // machine-only activity
      if (excludeJobId && a.job_id === excludeJobId) continue;
      map[a.alloc_date] = (map[a.alloc_date] || 0) + Number(a.hours || 0);
    }
    return map;
  }, [allocations, setterId, excludeJobId]);

  const freeHours = (iso: string): number => {
    const cap = setterHoursOn(iso, setterId, calendar, holidays);
    if (cap <= 0) return 0;
    return Math.round((cap - (bookedByDate[iso] || 0)) * 100) / 100;
  };

  const selected = value ? fromISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          {value || 'Pick a start date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="px-3 pt-3 text-xs text-muted-foreground">
          {setterId
            ? <>Availability for <span className="font-medium text-foreground">{setterName ?? 'setter'}</span> — grey days are full, off or holidays.</>
            : 'Select a setter to see their availability.'}
        </div>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(toISO(d));
            setOpen(false);
          }}
          disabled={setterId ? (d: Date) => freeHours(toISO(d)) <= 0 : undefined}
          components={{
            DayContent: ({ date }) => {
              const iso = toISO(date);
              const free = setterId ? freeHours(iso) : null;
              return (
                <div className="flex flex-col items-center leading-none">
                  <span>{date.getDate()}</span>
                  {free != null && free > 0 && (
                    <span className="text-[9px] text-muted-foreground">{fmtHours(free)}</span>
                  )}
                </div>
              );
            },
          }}
          classNames={{ day: 'h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent' }}
          className="p-3"
        />
      </PopoverContent>
    </Popover>
  );
}
