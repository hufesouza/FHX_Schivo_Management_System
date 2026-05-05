import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function MachineCapacity() {
  const { machines, schedule, parts, loading } = useNPIPlanning();

  const machinedPartIds = useMemo(
    () => new Set(parts.filter(p => p.overall_status === 'Machined' || p.overall_status === 'Completed').map(p => p.id)),
    [parts]
  );

  const rows = useMemo(() => machines.map(m => {
    const used = schedule
      .filter(s => s.machine_id === m.id && s.allocation_status !== 'Cancelled' && s.allocation_status !== 'Completed' && !(s.part_id && machinedPartIds.has(s.part_id)))
      .reduce((sum, s) => sum + Number(s.total_required_time || 0), 0);
    const cap = (Number(m.daily_available_hours) || 24) * 30;
    const util = cap ? Math.round((used / cap) * 100) : 0;
    return { ...m, used, cap, util };
  }).sort((a, b) => b.util - a.util), [machines, schedule, machinedPartIds]);

  if (loading) return <AppLayout title="Capacity" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Machine Capacity" subtitle="30-day rolling load" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(r => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {r.machine_name}
                  {r.util > 90 && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1"/>Bottleneck</Badge>}
                  {r.util > 70 && r.util <= 90 && <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30" variant="outline">Tight</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">{r.machine_type || 'Machine'} · {r.daily_available_hours}h/day</div>
                <Progress value={Math.min(r.util, 100)} className="h-2" />
                <div className="flex justify-between text-xs">
                  <span>{Math.round(r.used)}h used</span>
                  <span className="text-muted-foreground">{r.cap}h capacity (30d)</span>
                  <span className="font-bold">{r.util}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
