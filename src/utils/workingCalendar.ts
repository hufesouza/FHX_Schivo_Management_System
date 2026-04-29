// Working-day & holiday helpers for the NPI Capacity Planner.
// Static holiday tables for IE / GB / US (current + next 2 years).
// Easy to extend: add more years or countries to HOLIDAYS_BY_COUNTRY.

export type CountryCode = 'IE' | 'GB' | 'US';

export interface CalendarSettings {
  countryCode: CountryCode | string;
  countryLabel: string;
  weekendDays: number[]; // 0=Sun ... 6=Sat
}

export const DEFAULT_CALENDAR: CalendarSettings = {
  countryCode: 'IE',
  countryLabel: 'Ireland',
  weekendDays: [0, 6],
};

export const COUNTRY_OPTIONS: { code: CountryCode; label: string }[] = [
  { code: 'IE', label: 'Ireland' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
];

// ---- Holidays (YYYY-MM-DD) ----
// Sources: Irish Government, UK Gov, US Federal holidays. Update yearly.
const IE_2026 = ['2026-01-01','2026-02-02','2026-03-17','2026-04-06','2026-05-04','2026-06-01','2026-08-03','2026-10-26','2026-12-25','2026-12-28'];
const IE_2027 = ['2027-01-01','2027-02-01','2027-03-17','2027-03-29','2027-05-03','2027-06-07','2027-08-02','2027-10-25','2027-12-27','2027-12-28'];
const IE_2028 = ['2028-01-03','2028-02-07','2028-03-17','2028-04-17','2028-05-01','2028-06-05','2028-08-07','2028-10-30','2028-12-25','2028-12-26'];

const GB_2026 = ['2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28'];
const GB_2027 = ['2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28'];
const GB_2028 = ['2028-01-03','2028-04-14','2028-04-17','2028-05-01','2028-05-29','2028-08-28','2028-12-25','2028-12-26'];

const US_2026 = ['2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-12-25'];
const US_2027 = ['2027-01-01','2027-01-18','2027-02-15','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-10-11','2027-11-11','2027-11-25','2027-12-24'];
const US_2028 = ['2028-01-03','2028-01-17','2028-02-21','2028-05-29','2028-06-19','2028-07-04','2028-09-04','2028-10-09','2028-11-10','2028-11-23','2028-12-25'];

const HOLIDAYS_BY_COUNTRY: Record<string, string[]> = {
  IE: [...IE_2026, ...IE_2027, ...IE_2028],
  GB: [...GB_2026, ...GB_2027, ...GB_2028],
  US: [...US_2026, ...US_2027, ...US_2028],
};

const holidaySet = (country: string): Set<string> =>
  new Set(HOLIDAYS_BY_COUNTRY[country] || []);

export const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const isWeekend = (d: Date, settings: CalendarSettings): boolean =>
  settings.weekendDays.includes(d.getDay());

export const isHoliday = (d: Date, settings: CalendarSettings): boolean =>
  holidaySet(settings.countryCode).has(ymd(d));

export const isNonWorkingDay = (d: Date, settings: CalendarSettings): boolean =>
  isWeekend(d, settings) || isHoliday(d, settings);

/** Move forward to the next working day if `d` is a weekend or holiday. */
export const nextWorkingDay = (d: Date, settings: CalendarSettings): Date => {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  while (isNonWorkingDay(out, settings)) {
    out.setDate(out.getDate() + 1);
  }
  return out;
};

/**
 * Add `hours` of work starting at `start`, given a daily-hours capacity and
 * skipping non-working days when `respectCalendar` is true. Production that
 * runs through weekends sets respectCalendar=false (continuous machining).
 */
export const addWorkingHours = (
  start: Date,
  hours: number,
  dailyHours: number,
  settings: CalendarSettings,
  respectCalendar: boolean,
): Date => {
  if (hours <= 0) return new Date(start);
  if (!respectCalendar) {
    return new Date(start.getTime() + (hours / dailyHours) * 24 * 3600 * 1000);
  }
  let remaining = hours;
  const cursor = new Date(start);
  while (remaining > 0) {
    if (isNonWorkingDay(cursor, settings)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    const take = Math.min(remaining, dailyHours);
    remaining -= take;
    if (remaining > 0) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
    } else {
      // Partial day — advance proportional fraction of 24h
      const fraction = take / dailyHours;
      cursor.setTime(cursor.getTime() + fraction * 24 * 3600 * 1000);
    }
  }
  return cursor;
};

/**
 * Detect "idle weekend" risk: a job that ends on Friday (or last working day)
 * before a non-working stretch, leaving the machine idle through the weekend.
 * Returns the number of idle non-working days that follow the job.
 */
export const idleNonWorkingDaysAfter = (
  end: Date,
  nextStart: Date | null,
  settings: CalendarSettings,
): number => {
  const cursor = new Date(end);
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  let count = 0;
  const limit = nextStart ? new Date(nextStart) : null;
  if (limit) limit.setHours(0, 0, 0, 0);
  while (isNonWorkingDay(cursor, settings)) {
    if (limit && cursor >= limit) break;
    count++;
    cursor.setDate(cursor.getDate() + 1);
    if (count > 14) break; // safety
  }
  return count;
};
