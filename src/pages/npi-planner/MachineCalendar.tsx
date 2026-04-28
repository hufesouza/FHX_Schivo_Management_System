import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MachineCalendar() {
  const { machines, schedule, loading } = useNPIPlanning();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    d.setHours(0,0,0,0);
    return d;
  });

  const days = useMemo(() => {
    return Array.from({length: 14}, (_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
    });
  }, [weekStart]);

  const cellEntries = (machineId: string, day: Date) => {
    const start = new Date(day); start.setHours(0,0,0,0);
    const end = new Date(day); end.setHours(23,59,59,999);
    return schedule.filter(s =>
      s.machine_id === machineId &&
      new Date(s.start_date) <= end &&
      new Date(s.end_date) >= start
    );
  };

  if (loading) return <AppLayout title="Calendar" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Machine Calendar" subtitle="2-week view" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; })}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="font-semibold">{weekStart.toLocaleDateString()} — {days[13].toLocaleDateString()}</h3>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; })}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-left sticky left-0">Machine</th>
                  {days.map(d => (
                    <th key={d.toISOString()} className="border p-2 bg-muted whitespace-nowrap">
                      {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.map(m => (
                  <tr key={m.id}>
                    <td className="border p-2 font-medium sticky left-0 bg-background">{m.machine_name}</td>
                    {days.map(d => {
                      const entries = cellEntries(m.id, d);
                      return (
                        <td key={d.toISOString()} className={`border p-1 align-top ${entries.length === 0 ? 'bg-emerald-50' : entries.length > 1 ? 'bg-destructive/10' : 'bg-blue-50'}`} style={{minWidth:80}}>
                          {entries.map(e => (
                            <div key={e.id} className="text-[10px] bg-primary/15 text-primary rounded px-1 py-0.5 mb-1 truncate" title={`${e.part_number} — ${e.customer_name}`}>
                              {e.part_number}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <div className="text-xs text-muted-foreground flex gap-4">
          <span><span className="inline-block w-3 h-3 bg-emerald-50 border align-middle mr-1" />Available</span>
          <span><span className="inline-block w-3 h-3 bg-blue-50 border align-middle mr-1" />Allocated</span>
          <span><span className="inline-block w-3 h-3 bg-destructive/10 border align-middle mr-1" />Overloaded</span>
        </div>
      </main>
    </AppLayout>
  );
}
