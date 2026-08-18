import { useMemo, useState, useEffect } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays } from 'lucide-react';

export type CustomerRevRow = { customer: string; revenue: number; date: Date | null };

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

const fmtCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `€${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  if (abs >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${Math.round(n)}`;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

type Delta = { pct: number | null; dir: 'up' | 'down' | 'flat' };

const delta = (curr: number, prev: number): Delta => {
  if (!prev) return { pct: null, dir: curr > 0 ? 'up' : 'flat' };
  const pct = ((curr - prev) / prev) * 100;
  return { pct, dir: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat' };
};

const DeltaText = ({ d, suffix }: { d: Delta; suffix?: string }) => {
  const cls = d.dir === 'up' ? 'text-emerald-600' : d.dir === 'down' ? 'text-red-600' : 'text-muted-foreground';
  const arrow = d.dir === 'up' ? '▲' : d.dir === 'down' ? '▼' : '–';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}>
      <span>{arrow}</span>
      <span className="tabular-nums">{d.pct === null ? 'new' : `${d.pct > 0 ? '' : ''}${d.pct.toFixed(0)}%`}</span>
      {suffix && <span className="text-muted-foreground font-normal">{suffix}</span>}
    </span>
  );
};

const ALL = '__all__';

export function TopCustomersPanel({ rows }: { rows: CustomerRevRow[] }) {
  const [range, setRange] = useState('12');
  const [metric, setMetric] = useState('revenue');
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL);

  // month -> customer -> revenue
  const { monthKeys, byMonth, totals } = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const tot = new Map<string, number>();
    rows.forEach(r => {
      if (!r.date || !r.customer) return;
      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, new Map());
      const inner = map.get(key)!;
      inner.set(r.customer, (inner.get(r.customer) || 0) + r.revenue);
      tot.set(key, (tot.get(key) || 0) + r.revenue);
    });
    return { monthKeys: Array.from(map.keys()).sort(), byMonth: map, totals: tot };
  }, [rows]);

  const visibleMonths = useMemo(() => {
    if (range === 'all') return monthKeys;
    const n = parseInt(range, 10);
    return monthKeys.slice(-n);
  }, [monthKeys, range]);

  useEffect(() => {
    if (!visibleMonths.length) { setSelectedMonth(ALL); return; }
    if (selectedMonth !== ALL && !visibleMonths.includes(selectedMonth)) {
      // default to the most recent month that is not in the future
      const now = new Date();
      const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const past = visibleMonths.filter(m => m <= nowKey);
      setSelectedMonth((past.length ? past : visibleMonths)[(past.length ? past : visibleMonths).length - 1]);
    }
  }, [visibleMonths, selectedMonth]);


  const isAll = selectedMonth === ALL;
  const monthIdx = monthKeys.indexOf(selectedMonth);
  const prevMonthKey = monthIdx > 0 ? monthKeys[monthIdx - 1] : '';

  // previous comparable window (same number of months immediately before the visible range)
  const prevWindow = useMemo(() => {
    if (!visibleMonths.length) return [] as string[];
    const firstIdx = monthKeys.indexOf(visibleMonths[0]);
    const n = visibleMonths.length;
    return monthKeys.slice(Math.max(0, firstIdx - n), firstIdx);
  }, [monthKeys, visibleMonths]);

  const periodLabel = isAll
    ? visibleMonths.length
      ? `${monthLabel(visibleMonths[0])} – ${monthLabel(visibleMonths[visibleMonths.length - 1])}`
      : '—'
    : selectedMonth
      ? monthLabel(selectedMonth)
      : '—';

  const ranking = useMemo(() => {
    const aggregate = (keys: string[]) => {
      const m = new Map<string, number>();
      let total = 0;
      keys.forEach(k => {
        const inner = byMonth.get(k);
        if (inner) inner.forEach((v, name) => m.set(name, (m.get(name) || 0) + v));
        total += totals.get(k) || 0;
      });
      return { m, total };
    };

    const cur = isAll ? aggregate(visibleMonths) : aggregate(selectedMonth ? [selectedMonth] : []);
    const prevAgg = isAll ? aggregate(prevWindow) : aggregate(prevMonthKey ? [prevMonthKey] : []);
    const prev = prevAgg.m;
    const totalRev = cur.total;
    const list = Array.from(cur.m.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const top = list.slice(0, 10).map(([name, revenue], i) => ({
      name,
      revenue,
      color: PALETTE[i % PALETTE.length],
      share: totalRev > 0 ? (revenue / totalRev) * 100 : 0,
      d: delta(revenue, prev.get(name) || 0),
    }));
    const topTotal = top.reduce((s, c) => s + c.revenue, 0);
    const prevTopTotal = top.reduce((s, c) => s + (prev.get(c.name) || 0), 0);
    return {
      top,
      totalRev,
      topTotal,
      others: Math.max(totalRev - topTotal, 0),
      topDelta: delta(topTotal, prevTopTotal),
      monthDelta: delta(totalRev, prevAgg.total),
    };
  }, [byMonth, totals, selectedMonth, prevMonthKey, isAll, visibleMonths, prevWindow]);


  const colorOf = useMemo(() => {
    const m = new Map<string, string>();
    ranking.top.forEach(c => m.set(c.name, c.color));
    return m;
  }, [ranking.top]);

  const top5 = ranking.top.slice(0, 5);

  const trendData = useMemo(() =>
    visibleMonths.map(k => {
      const inner = byMonth.get(k);
      const point: Record<string, any> = { month: monthLabel(k) };
      top5.forEach(c => { point[c.name] = inner?.get(c.name) || 0; });
      return point;
    }), [visibleMonths, byMonth, top5]);

  const donutData = useMemo(() => {
    const d = ranking.top.map(c => ({ name: c.name, value: c.revenue, color: c.color }));
    if (ranking.others > 0) d.push({ name: 'Others', value: ranking.others, color: '#cbd5e1' });
    return d;
  }, [ranking]);

  if (!monthKeys.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No dated revenue rows available for this site and filter selection.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Top 10 Customers by Month (Revenue)</h2>
          <p className="text-sm text-muted-foreground">Revenue contribution and ranking of top customers over time</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-[168px] text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 Months</SelectItem>
              <SelectItem value="6">Last 6 Months</SelectItem>
              <SelectItem value="8">Last 8 Months</SelectItem>
              <SelectItem value="12">Last 12 Months</SelectItem>
              <SelectItem value="all">All Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Whole range</SelectItem>
              {visibleMonths.map(k => <SelectItem key={k} value={k}>{monthLabel(k)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Trend + month overview */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Trend – Top 5 Customers</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
                <Tooltip
                  formatter={(v: any, n: any) => [fmtEur(v as number), n as string]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {top5.map(c => (
                  <Line
                    key={c.name}
                    type="linear"
                    dataKey={c.name}
                    stroke={c.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: c.color, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">
              {isAll ? 'Period Overview' : 'Month Overview'} ({periodLabel})
            </h3>
            <div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
              <div className="text-2xl font-semibold text-foreground tabular-nums">{fmtCompact(ranking.totalRev)}</div>
              <DeltaText d={ranking.monthDelta} suffix={isAll ? 'vs previous period' : prevMonthKey ? `vs ${monthLabel(prevMonthKey)}` : ''} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Top 10 Customers</div>
              <div className="text-2xl font-semibold text-foreground tabular-nums">{fmtCompact(ranking.topTotal)}</div>
              <div className="text-xs text-muted-foreground">
                {ranking.totalRev > 0 ? Math.round((ranking.topTotal / ranking.totalRev) * 100) : 0}% of total revenue
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Remaining Customers</div>
              <div className="text-2xl font-semibold text-foreground tabular-nums">{fmtCompact(ranking.others)}</div>
              <div className="text-xs text-muted-foreground">
                {ranking.totalRev > 0 ? Math.round((ranking.others / ranking.totalRev) * 100) : 0}% of total revenue
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking + donut */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Top 10 Customers – {isAll ? 'Period' : 'Current Month'} ({periodLabel})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-xs">#</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">% of Total</TableHead>
                  <TableHead className="text-xs text-right">{isAll ? 'vs Prev Period' : 'vs Last Month'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.top.map((c, i) => (
                  <TableRow key={c.name}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                        <span className="truncate max-w-[190px]" title={c.name}>{c.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtEur(c.revenue)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{c.share.toFixed(1)}%</TableCell>
                    <TableCell className="text-right"><DeltaText d={c.d} /></TableCell>
                  </TableRow>
                ))}
                {!ranking.top.length && (
                  <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground text-center py-6">No revenue in this period.</TableCell></TableRow>
                )}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={2} className="text-xs">Top 10 Total</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{fmtEur(ranking.topTotal)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {ranking.totalRev > 0 ? ((ranking.topTotal / ranking.totalRev) * 100).toFixed(1) : '0.0'}%
                  </TableCell>
                  <TableCell className="text-right"><DeltaText d={ranking.topDelta} /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Revenue Share – {isAll ? 'Period' : 'Current Month'} ({periodLabel})
            </h3>
            <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] items-center">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={92} paddingAngle={1}>
                    {donutData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [fmtEur(v as number), n as string]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="truncate" title={d.name}>{d.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                      {fmtEur(d.value)} ({ranking.totalRev > 0 ? Math.round((d.value / ranking.totalRev) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
