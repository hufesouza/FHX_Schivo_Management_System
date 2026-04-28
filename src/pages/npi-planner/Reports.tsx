import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function Reports() {
  const { parts, loading } = useNPIPlanning();

  const salesByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach(p => map.set(p.customer_name || 'Unknown',
      (map.get(p.customer_name || 'Unknown') || 0) + (Number(p.sales_price) || 0) * (Number(p.qty) || 1)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value);
  }, [parts]);

  const jobsByStatus = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach(p => map.set(p.overall_status, (map.get(p.overall_status) || 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [parts]);

  const jobsByEngineer = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach(p => map.set(p.engineer || 'Unassigned', (map.get(p.engineer || 'Unassigned') || 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [parts]);

  if (loading) return <AppLayout title="Reports" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Reports" subtitle="Sales, capacity, jobs" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Sales by customer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByCustomer}>
                  <XAxis dataKey="name" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip /><Legend />
                  <Bar dataKey="value" name="€" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Jobs by status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jobsByStatus}>
                  <XAxis dataKey="name" tick={{fontSize:10}} interval={0} angle={-30} textAnchor="end" height={80} /><YAxis tick={{fontSize:11}} /><Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Jobs by engineer</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={jobsByEngineer}>
                  <XAxis dataKey="name" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppLayout>
  );
}
