import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_TONE: Record<string, string> = {
  'Not Started': 'bg-slate-200 text-slate-700',
  'Late': 'bg-destructive/15 text-destructive',
  'At Risk': 'bg-amber-200 text-amber-800',
  'In Production': 'bg-emerald-200 text-emerald-800',
  'Scheduled': 'bg-blue-200 text-blue-800',
  'Completed': 'bg-muted text-muted-foreground',
  'On Hold': 'bg-slate-300 text-slate-800',
};

const MAT_TOOL_TONE: Record<string, string> = {
  'Received': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'Ordered': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'Not Ordered': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'Required': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'Delayed': 'bg-destructive/15 text-destructive border-destructive/30',
  'Issue': 'bg-destructive/15 text-destructive border-destructive/30',
  'Not Required': 'bg-muted text-muted-foreground',
};

export default function JobList() {
  const navigate = useNavigate();
  const { parts, customers, machines, loading, reload } = useNPIPlanning();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');
  const [shipDates, setShipDates] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => parts.filter(p => {
    if (search && !`${p.part_number} ${p.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.overall_status !== statusFilter) return false;
    if (customerFilter !== 'all' && p.customer_id !== customerFilter) return false;
    if (machineFilter !== 'all' && p.machine_id !== machineFilter) return false;
    return true;
  }), [parts, search, statusFilter, customerFilter, machineFilter]);

  const saveShipDate = async (partId: string) => {
    const value = shipDates[partId];
    if (!value) return;
    setSavingId(partId);
    const { error } = await supabase
      .from('npi_parts')
      .update({ ship_date: value, overall_status: 'Completed' })
      .eq('id', partId);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success('Ship date saved');
    setShipDates(prev => { const n = { ...prev }; delete n[partId]; return n; });
    reload();
  };

  if (loading) return <AppLayout title="Jobs" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout title="Job Tracker" subtitle="Material, tooling & ship status" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Jobs ({filtered.length})</CardTitle>
            <Button onClick={() => navigate('/npi/capacity-planner/parts/new')}><Plus className="h-4 w-4 mr-2" />New part</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-4 gap-2">
              <Input placeholder="Search part number / description" value={search} onChange={e => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Array.from(new Set(parts.map(p => p.overall_status))).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={machineFilter} onValueChange={setMachineFilter}>
                <SelectTrigger><SelectValue placeholder="Machine" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All machines</SelectItem>
                  {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.machine_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Tooling</TableHead>
                    <TableHead>Committed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[200px]">Ship date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No jobs match.</TableCell></TableRow>
                  ) : filtered.map(p => {
                    const matStatus = p.material_status || 'Not Ordered';
                    const toolStatus = p.tooling_status || 'Not Ordered';
                    const pendingShip = shipDates[p.id];
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium cursor-pointer" onClick={() => navigate(`/npi/capacity-planner/parts/${p.id}`)}>{p.part_number}</TableCell>
                        <TableCell className="cursor-pointer" onClick={() => navigate(`/npi/capacity-planner/parts/${p.id}`)}>{p.customer_name || '-'}</TableCell>
                        <TableCell>{p.machine_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={MAT_TOOL_TONE[matStatus] || ''}>
                            {matStatus}
                          </Badge>
                          {p.material_lead_time ? <div className="text-xs text-muted-foreground mt-1">{p.material_lead_time}d lead</div> : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={MAT_TOOL_TONE[toolStatus] || ''}>
                            {toolStatus}
                          </Badge>
                          {p.tooling_lead_time ? <div className="text-xs text-muted-foreground mt-1">{p.tooling_lead_time}d lead</div> : null}
                        </TableCell>
                        <TableCell>{p.committed_date || '-'}</TableCell>
                        <TableCell><Badge className={STATUS_TONE[p.overall_status] || ''} variant="outline">{p.overall_status}</Badge></TableCell>
                        <TableCell>
                          {p.ship_date ? (
                            <span className="text-sm font-medium text-emerald-700">Shipped {p.ship_date}</span>
                          ) : (
                            <div className="flex gap-1 items-center">
                              <Input
                                type="date"
                                value={pendingShip || ''}
                                onChange={e => setShipDates(prev => ({ ...prev, [p.id]: e.target.value }))}
                                className="h-8 w-[150px]"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                disabled={!pendingShip || savingId === p.id}
                                onClick={() => saveShipDate(p.id)}
                                title="Mark as shipped"
                              >
                                {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
