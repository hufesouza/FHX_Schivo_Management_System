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
import { Loader2, Plus } from 'lucide-react';

const STATUS_TONE: Record<string,string> = {
  'Not Started': 'bg-slate-200 text-slate-700',
  'Late': 'bg-destructive/15 text-destructive',
  'At Risk': 'bg-amber-200 text-amber-800',
  'In Production': 'bg-emerald-200 text-emerald-800',
  'Scheduled': 'bg-blue-200 text-blue-800',
  'Completed': 'bg-muted text-muted-foreground',
  'On Hold': 'bg-slate-300 text-slate-800',
};

export default function JobList() {
  const navigate = useNavigate();
  const { parts, customers, machines, loading } = useNPIPlanning();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');

  const filtered = useMemo(() => parts.filter(p => {
    if (search && !`${p.part_number} ${p.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.overall_status !== statusFilter) return false;
    if (customerFilter !== 'all' && p.customer_id !== customerFilter) return false;
    if (machineFilter !== 'all' && p.machine_id !== machineFilter) return false;
    return true;
  }), [parts, search, statusFilter, customerFilter, machineFilter]);

  if (loading) return <AppLayout title="Jobs" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Job List" subtitle="All NPI parts/jobs" showBackButton backTo="/npi/capacity-planner">
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
                    <TableHead>Project</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Total time (h)</TableHead>
                    <TableHead>Committed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No jobs match.</TableCell></TableRow>
                  ) : filtered.map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/npi/capacity-planner/parts/${p.id}`)}>
                      <TableCell className="font-medium">{p.part_number}</TableCell>
                      <TableCell>{p.customer_name || '-'}</TableCell>
                      <TableCell>{p.project_name || '-'}</TableCell>
                      <TableCell>{p.engineer || '-'}</TableCell>
                      <TableCell>{p.machine_name || '-'}</TableCell>
                      <TableCell>{p.total_required_time}</TableCell>
                      <TableCell>{p.committed_date || '-'}</TableCell>
                      <TableCell><Badge className={STATUS_TONE[p.overall_status] || ''} variant="outline">{p.overall_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
