import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchedulerNav } from '@/components/scheduler/SchedulerNav';
import { MonthNav } from '@/components/scheduler/MonthCalendar';
import { useScheduler } from '@/hooks/useScheduler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  fmtHours,
  isoWeekKey,
  machineHoursOn,
  monthMatrix,
  setterHoursOn,
  toISO,
  fromISO,
} from '@/utils/schedulerEngine';

type Granularity = 'day' | 'week' | 'month';

const utilColor = (pct: number) =>
  pct > 100 ? 'text-destructive' : pct >= 90 ? 'text-amber-600' : 'text-emerald-600';

export default function SchedulerCapacity() {
  const { setters, machines, allocations, devAllocations, prodAllocations, calendar, holidays, loading } = useScheduler();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [granularity, setGranularity] = useState<Granularity>('week');

  const monthDays = useMemo(
    () => monthMatrix(year, month).flat().filter((iso) => fromISO(iso).getMonth() === month),
    [year, month],
  );

  const buckets = useMemo(() => {
    if (granularity === 'day') return monthDays.map((iso) => ({ key: iso, label: iso, days: [iso] }));
    if (granularity === 'month') {
      const label = `${year}-${String(month + 1).padStart(2, '0')}`;
      return [{ key: label, label, days: monthDays }];
    }
    const map = new Map<string, string[]>();
    monthDays.forEach((iso) => {
      const k = isoWeekKey(iso);
      map.set(k, [...(map.get(k) ?? []), iso]);
    });
    return Array.from(map.entries()).map(([key, days]) => ({ key, label: key, days }));
  }, [granularity, monthDays, year, month]);

  const setterRows = setters.map((s) => {
    const rows = buckets.map((b) => {
      const capacity = b.days.reduce((sum, iso) => sum + setterHoursOn(iso, s.id, calendar, holidays), 0);
      const allocated = devAllocations

        .filter((a) => a.setter_id === s.id && b.days.includes(a.alloc_date))
        .reduce((sum, a) => sum + Number(a.hours), 0);
      return {
        key: b.key,
        label: b.label,
        capacity: Math.round(capacity * 10) / 10,
        allocated: Math.round(allocated * 10) / 10,
        available: Math.round((capacity - allocated) * 10) / 10,
        util: capacity > 0 ? Math.round((allocated / capacity) * 1000) / 10 : 0,
      };
    });
    const capacity = rows.reduce((a, b) => a + b.capacity, 0);
    const allocated = rows.reduce((a, b) => a + b.allocated, 0);
    const weekly = [0, 1, 2, 3, 4, 5, 6].reduce((sum, dow) => sum + (calendar[s.id]?.[dow] ?? 0), 0);
    return {
      resource: s,
      rows,
      capacity: Math.round(capacity * 10) / 10,
      allocated: Math.round(allocated * 10) / 10,
      util: capacity > 0 ? Math.round((allocated / capacity) * 1000) / 10 : 0,
      weekly: Math.round(weekly * 10) / 10,
    };
  });

  const machineRows = machines.map((m) => {
    const rows = buckets.map((b) => {
      const capacity = b.days.reduce((sum, iso) => sum + machineHoursOn(iso, m, holidays), 0);
      const sum = (list: typeof allocations) =>
        list.filter((a) => a.machine_id === m.id && b.days.includes(a.alloc_date))
          .reduce((acc, a) => acc + Number(a.hours), 0);
      const dev = sum(devAllocations);
      const prod = sum(prodAllocations);
      const allocated = dev + prod;
      return {
        key: b.key,
        label: b.label,
        capacity: Math.round(capacity * 10) / 10,
        allocated: Math.round(allocated * 10) / 10,
        dev: Math.round(dev * 10) / 10,
        prod: Math.round(prod * 10) / 10,
        available: Math.round((capacity - allocated) * 10) / 10,
        util: capacity > 0 ? Math.round((allocated / capacity) * 1000) / 10 : 0,
      };
    });
    const capacity = rows.reduce((a, b) => a + b.capacity, 0);
    const allocated = rows.reduce((a, b) => a + b.allocated, 0);
    const dev = rows.reduce((a, b) => a + b.dev, 0);
    const prod = rows.reduce((a, b) => a + b.prod, 0);
    return {
      resource: m,
      rows,
      capacity: Math.round(capacity * 10) / 10,
      allocated: Math.round(allocated * 10) / 10,
      dev: Math.round(dev * 10) / 10,
      prod: Math.round(prod * 10) / 10,
      util: capacity > 0 ? Math.round((allocated / capacity) * 1000) / 10 : 0,
    };
  });


  const renderRows = (
    items: { name: string; sub?: string; capacity: number; allocated: number; util: number; rows: { key: string; label: string; capacity: number; allocated: number; available: number; util: number }[] }[],
  ) => (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.name}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex flex-wrap items-center gap-2">
              {item.name}
              {item.sub && <span className="text-xs font-normal text-muted-foreground">{item.sub}</span>}
              <Badge variant="outline" className={cn('ml-auto', utilColor(item.util))}>
                {item.util}% utilised
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Capacity</div>
                <div className="font-semibold">{fmtHours(item.capacity)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Allocated</div>
                <div className="font-semibold">{fmtHours(item.allocated)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Available</div>
                <div className={cn('font-semibold', item.capacity - item.allocated < 0 && 'text-destructive')}>
                  {fmtHours(item.capacity - item.allocated)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Utilisation</div>
                <div className={cn('font-semibold', utilColor(item.util))}>{item.util}%</div>
              </div>
            </div>
            <Progress value={Math.min(item.util, 100)} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2">Period</th>
                    <th className="text-right py-1 px-2">Capacity</th>
                    <th className="text-right py-1 px-2">Allocated</th>
                    <th className="text-right py-1 px-2">Available</th>
                    <th className="text-right py-1 px-2">Utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((r) => (
                    <tr key={r.key} className="border-b border-border/60 last:border-0">
                      <td className="py-1 px-2">{r.label}</td>
                      <td className="py-1 px-2 text-right">{fmtHours(r.capacity)}</td>
                      <td className="py-1 px-2 text-right">{fmtHours(r.allocated)}</td>
                      <td className={cn('py-1 px-2 text-right', r.available < 0 && 'text-destructive font-semibold')}>
                        {fmtHours(r.available)}
                      </td>
                      <td className={cn('py-1 px-2 text-right', utilColor(r.util))}>{r.util}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AppLayout title="Capacity" subtitle="Setter and machine utilisation" showBackButton backTo="/scheduling">
      <SchedulerNav />
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <div className="flex items-center gap-1 ml-auto">
            {(['day', 'week', 'month'] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md border',
                  granularity === g ? 'bg-primary text-primary-foreground border-primary' : 'border-input',
                )}
              >
                By {g}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading capacity…</p>
        ) : (
          <Tabs defaultValue="setters">
            <TabsList>
              <TabsTrigger value="setters">Setters</TabsTrigger>
              <TabsTrigger value="machines">Machines</TabsTrigger>
            </TabsList>
            <TabsContent value="setters" className="mt-3">
              {renderRows(
                setterRows.map((r) => ({
                  name: r.resource.name,
                  sub: `Weekly capacity ${fmtHours(r.weekly)}${r.resource.is_active ? '' : ' · inactive'}`,
                  capacity: r.capacity,
                  allocated: r.allocated,
                  util: r.util,
                  rows: r.rows,
                })),
              )}
            </TabsContent>
            <TabsContent value="machines" className="mt-3">
              {renderRows(
                machineRows.map((r) => ({
                  name: `${r.resource.code} — ${r.resource.name}`,
                  sub: `${fmtHours(r.resource.daily_hours)}/day`,
                  capacity: r.capacity,
                  allocated: r.allocated,
                  util: r.util,
                  rows: r.rows,
                })),
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
