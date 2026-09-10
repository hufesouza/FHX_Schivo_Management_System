import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrdersLayout } from '@/components/orders/OrdersLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, ClipboardList, AlertTriangle } from 'lucide-react';
import { useOrders } from '@/hooks/useOrderTracker';
import {
  DUE_BUCKETS,
  daysRemaining,
  dueBucket,
  fmtDate,
  fmtMoney,
  isOpen,
  type DueBucketKey,
} from '@/types/orderTracker';
import { StatusBadge } from '@/components/orders/StatusSelect';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function OrdersDashboard() {
  const navigate = useNavigate();
  const { orders, loading } = useOrders();

  const stats = useMemo(() => {
    const open = orders.filter((o) => isOpen(o.status));
    const counts: Record<DueBucketKey, number> = {
      overdue: 0, d7: 0, d14: 0, d21: 0, d30: 0, d30plus: 0, none: 0,
    };
    open.forEach((o) => { counts[dueBucket(o.due_date).key] += 1; });
    return {
      open: open.length,
      counts,
      completed: orders.filter((o) => o.status === 'Completed' || o.status === 'Shipped').length,
      cancelled: orders.filter((o) => o.status === 'Cancelled').length,
      openValue: open.reduce((s, o) => s + (Number(o.total_price) || 0), 0),
    };
  }, [orders]);

  const urgent = useMemo(
    () =>
      orders
        .filter((o) => isOpen(o.status) && o.due_date && daysRemaining(o.due_date)! <= 7)
        .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 12),
    [orders],
  );

  const byCustomer = useMemo(() => {
    const map = new Map<string, number>();
    orders.filter((o) => isOpen(o.status)).forEach((o) => {
      const key = o.customer_name || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [orders]);

  const go = (params: string) => navigate(`/orders/list?${params}`);

  const kpis: { label: string; value: number; onClick: () => void; tone: string }[] = [
    { label: 'Total open orders', value: stats.open, onClick: () => go('scope=open'), tone: 'bg-primary/5 border-primary/20' },
    { label: 'Overdue', value: stats.counts.overdue, onClick: () => go('scope=open&due=overdue'), tone: DUE_BUCKETS.overdue.className },
    { label: 'Due < 7 days', value: stats.counts.d7, onClick: () => go('scope=open&due=d7'), tone: DUE_BUCKETS.d7.className },
    { label: 'Due 8–14 days', value: stats.counts.d14, onClick: () => go('scope=open&due=d14'), tone: DUE_BUCKETS.d14.className },
    { label: 'Due 15–21 days', value: stats.counts.d21, onClick: () => go('scope=open&due=d21'), tone: DUE_BUCKETS.d21.className },
    { label: 'Due 22–30 days', value: stats.counts.d30, onClick: () => go('scope=open&due=d30'), tone: DUE_BUCKETS.d30.className },
    { label: 'Due > 30 days', value: stats.counts.d30plus, onClick: () => go('scope=open&due=d30plus'), tone: DUE_BUCKETS.d30plus.className },
    { label: 'Completed / shipped', value: stats.completed, onClick: () => go('scope=completed'), tone: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
    { label: 'Cancelled', value: stats.cancelled, onClick: () => go('scope=cancelled'), tone: 'bg-muted text-muted-foreground border-border' },
  ];

  return (
    <OrdersLayout
      title="Dashboard"
      subtitle="Open orders by urgency — click any card to see the matching orders"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/orders/list')}>
            <ClipboardList className="mr-2 h-4 w-4" /> All orders
          </Button>
          <Button onClick={() => navigate('/orders/upload')}>
            <Upload className="mr-2 h-4 w-4" /> Upload PO
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpis.map((k) => (
              <button
                key={k.label}
                onClick={k.onClick}
                className={cn(
                  'rounded-lg border p-4 text-left transition-shadow hover:shadow-md',
                  k.tone,
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide opacity-80">{k.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{k.value}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Needs attention — overdue and due within 7 days
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {urgent.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">Nothing overdue or due this week.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-y border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Customer</th>
                          <th className="px-4 py-2 text-left font-medium">PO</th>
                          <th className="px-4 py-2 text-left font-medium">Part</th>
                          <th className="px-4 py-2 text-left font-medium">Due</th>
                          <th className="px-4 py-2 text-right font-medium">Days</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {urgent.map((o) => {
                          const days = daysRemaining(o.due_date);
                          const b = dueBucket(o.due_date);
                          return (
                            <tr
                              key={o.id}
                              onClick={() => navigate(`/orders/view/${o.id}`)}
                              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                            >
                              <td className="px-4 py-2 font-medium">{o.customer_name || '—'}</td>
                              <td className="px-4 py-2 text-muted-foreground">{o.po_number || '—'}</td>
                              <td className="px-4 py-2">{o.part_number || '—'}</td>
                              <td className="px-4 py-2">{fmtDate(o.due_date)}</td>
                              <td className={cn('px-4 py-2 text-right font-semibold tabular-nums', b.key === 'overdue' && 'text-destructive')}>
                                {days === null ? '—' : days}
                              </td>
                              <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Open order value</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tabular-nums text-primary">{fmtMoney(stats.openValue)}</p>
                  <p className="text-xs text-muted-foreground">Across {stats.open} open order lines</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Open orders by customer</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {byCustomer.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No open orders yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byCustomer} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid horizontal={false} strokeOpacity={0.2} />
                        <XAxis type="number" allowDecimals={false} fontSize={11} />
                        <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </OrdersLayout>
  );
}
