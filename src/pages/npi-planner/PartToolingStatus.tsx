import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, format, parseISO } from 'date-fns';

const TOOLING_STATUSES = ['Not Required', 'Required', 'Ordered', 'Received', 'Delayed', 'Issue'];

const TONE: Record<string, string> = {
  'Received': 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'Ordered': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'Required': 'bg-amber-500/15 text-amber-800 border-amber-500/30',
  'Not Required': 'bg-muted text-muted-foreground',
  'Delayed': 'bg-destructive/15 text-destructive border-destructive/30',
  'Issue': 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function PartToolingStatus() {
  const { parts, loading, reload } = useNPIPlanning();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(() => parts.filter(p => {
    if (search && !`${p.part_number} ${p.tooling || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && (p.tooling_status || 'Required') !== statusFilter) return false;
    return true;
  }), [parts, search, statusFilter]);

  const updateStatus = async (partId: string, value: string) => {
    setSavingId(partId);
    const patch: any = { tooling_status: value };
    const now = new Date().toISOString();
    if (value === 'Ordered') patch.tooling_ordered_at = now;
    if (value === 'Received') patch.tooling_received_at = now;
    const { error } = await supabase.from('npi_parts').update(patch).eq('id', partId);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Tooling → ${value}`);
    reload();
  };

  const expectedDate = (p: any) => {
    if (p.tooling_status === 'Received' && p.tooling_received_at) {
      return `Received ${format(parseISO(p.tooling_received_at), 'MMM d')}`;
    }
    if (p.tooling_status === 'Ordered' && p.tooling_ordered_at && p.tooling_lead_time) {
      const eta = addDays(parseISO(p.tooling_ordered_at), Number(p.tooling_lead_time));
      return `ETA ${format(eta, 'MMM d, yyyy')}`;
    }
    if (p.tooling_lead_time) return `${p.tooling_lead_time}d lead (clock not started)`;
    return '-';
  };

  if (loading) return <AppLayout title="Tooling Status" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout title="Tooling Status (per part)" subtitle="Mark Ordered to start lead-time clock; Received frees the part for production" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Parts ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-2">
              <Input placeholder="Search part / tooling" value={search} onChange={e => setSearch(e.target.value)} />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {TOOLING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tooling</TableHead>
                    <TableHead>Lead time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received / ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No parts.</TableCell></TableRow>
                  ) : filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.part_number}</TableCell>
                      <TableCell>{p.customer_name || '-'}</TableCell>
                      <TableCell>{p.tooling || '-'}</TableCell>
                      <TableCell>{p.tooling_lead_time ? `${p.tooling_lead_time}d` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select value={p.tooling_status || 'Required'} onValueChange={v => updateStatus(p.id, v)}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TOOLING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {savingId === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          <Badge variant="outline" className={TONE[p.tooling_status || 'Required'] || ''}>{p.tooling_status || 'Required'}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{p.tooling_ordered_at ? format(parseISO(p.tooling_ordered_at), 'MMM d, yyyy') : '-'}</TableCell>
                      <TableCell>{expectedDate(p)}</TableCell>
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
