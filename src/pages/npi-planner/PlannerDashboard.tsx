import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2, AlertTriangle, Clock, CheckCircle2, Wrench, Package, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const statusColor: Record<string, string> = {
  'Late': 'bg-destructive/10 text-destructive border-destructive/30',
  'At Risk': 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  'On Hold': 'bg-slate-500/10 text-slate-700 border-slate-500/30',
  'In Production': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  'Scheduled': 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  'Completed': 'bg-muted text-muted-foreground',
};

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#ec4899'];

export default function PlannerDashboard() {
  const { parts, machines, schedule, loading } = useNPIPlanning();

  const kpis = useMemo(() => {
    const today = new Date();
    const lateJobs = parts.filter(p => p.committed_date && new Date(p.committed_date) < today && p.overall_status !== 'Completed');
    const atRisk = parts.filter(p => p.overall_status === 'At Risk');
    const awaitingMaterial = parts.filter(p => p.material_status === 'Required' || p.material_status === 'Ordered' || p.material_status === 'Delayed');
    const awaitingTooling = parts.filter(p => p.tooling_status === 'Required' || p.tooling_status === 'Ordered' || p.tooling_status === 'Delayed');
    const awaitingSubcon = parts.filter(p => p.subcon_status === 'Sent Out' || p.subcon_status === 'In Progress' || p.subcon_status === 'Delayed');
    const totalSales = parts.reduce((s, p) => s + (Number(p.sales_price) || 0) * (Number(p.qty) || 1), 0);
    return { lateJobs, atRisk, awaitingMaterial, awaitingTooling, awaitingSubcon, totalSales };
  }, [parts]);

  const machineLoad = useMemo(() => {
    return machines.map(m => {
      const hrs = schedule
        .filter(s => s.machine_id === m.id && s.allocation_status !== 'Cancelled')
        .reduce((sum, s) => sum + Number(s.total_required_time || 0), 0);
      const cap30 = (Number(m.daily_available_hours) || 24) * 30;
      return { machine: m.machine_name, used: Math.round(hrs), capacity: cap30, util: cap30 ? Math.round((hrs / cap30) * 100) : 0 };
    });
  }, [machines, schedule]);

  const salesByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach(p => {
      const v = (Number(p.sales_price) || 0) * (Number(p.qty) || 1);
      map.set(p.customer_name || 'Unknown', (map.get(p.customer_name || 'Unknown') || 0) + v);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0,8);
  }, [parts]);

  const upcomingShips = useMemo(() => {
    return [...parts]
      .filter(p => p.ship_date)
      .sort((a, b) => new Date(a.ship_date!).getTime() - new Date(b.ship_date!).getTime())
      .slice(0, 8);
  }, [parts]);

  if (loading) return <AppLayout title="Dashboard" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Capacity Dashboard" subtitle="NPI Capacity Planner" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi icon={AlertTriangle} label="Late jobs" value={kpis.lateJobs.length} tone="destructive" />
          <Kpi icon={Clock} label="At risk" value={kpis.atRisk.length} tone="warning" />
          <Kpi icon={Package} label="Await material" value={kpis.awaitingMaterial.length} tone="info" />
          <Kpi icon={Wrench} label="Await tooling" value={kpis.awaitingTooling.length} tone="info" />
          <Kpi icon={Users} label="Await subcon" value={kpis.awaitingSubcon.length} tone="info" />
          <Kpi icon={CheckCircle2} label="Total sales (€)" value={kpis.totalSales.toLocaleString(undefined,{maximumFractionDigits:0})} tone="success" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Machine load (next 30 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={machineLoad}>
                  <XAxis dataKey="machine" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} />
                  <Tooltip />
                  <Bar dataKey="used" fill="hsl(var(--primary))" name="Used hrs" />
                  <Bar dataKey="capacity" fill="hsl(var(--muted))" name="Capacity hrs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sales by customer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={salesByCustomer} dataKey="value" nameKey="name" outerRadius={90} label>
                    {salesByCustomer.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Late jobs</CardTitle></CardHeader>
            <CardContent>
              {kpis.lateJobs.length === 0 ? <p className="text-sm text-muted-foreground">No late jobs 🎉</p> :
                <ul className="space-y-2">
                  {kpis.lateJobs.slice(0,8).map(p => (
                    <li key={p.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <span><strong>{p.part_number}</strong> · {p.customer_name}</span>
                      <Badge variant="destructive">{p.committed_date}</Badge>
                    </li>
                  ))}
                </ul>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming ship dates</CardTitle></CardHeader>
            <CardContent>
              {upcomingShips.length === 0 ? <p className="text-sm text-muted-foreground">None scheduled.</p> :
                <ul className="space-y-2">
                  {upcomingShips.map(p => (
                    <li key={p.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <span><strong>{p.part_number}</strong> · {p.customer_name}</span>
                      <Badge className={statusColor[p.overall_status] || ''} variant="outline">{p.ship_date}</Badge>
                    </li>
                  ))}
                </ul>}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}

function Kpi({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string,string> = {
    destructive: 'border-destructive/40 bg-destructive/5 text-destructive',
    warning: 'border-amber-500/40 bg-amber-500/5 text-amber-700',
    info: 'border-blue-500/40 bg-blue-500/5 text-blue-700',
    success: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700',
  };
  return (
    <Card className={`border ${tones[tone] || ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
