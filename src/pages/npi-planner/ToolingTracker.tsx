import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TONE: Record<string,string> = {
  'Required': 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  'Ordered': 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  'Received': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  'Not Ordered': 'bg-destructive/10 text-destructive border-destructive/30',
  'Issue': 'bg-destructive/10 text-destructive border-destructive/30',
  'Delayed': 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function ToolingTracker() {
  const { tooling, parts, loading, reload } = useNPIPlanning();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ part_id: '', tooling_description: '', supplier: '', expected_delivery_date: '', required_status: 'Required', ordered_status: 'Not Ordered' });

  const save = async () => {
    if (!form.tooling_description) return toast.error('Description required');
    const part = parts.find(p => p.id === form.part_id);
    const { error } = await supabase.from('npi_tooling_tracker').insert({
      ...form, part_number: part?.part_number || null,
      part_id: form.part_id || null,
      expected_delivery_date: form.expected_delivery_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Added'); setOpen(false); setForm({ part_id: '', tooling_description: '', supplier: '', expected_delivery_date: '', required_status: 'Required', ordered_status: 'Not Ordered' });
    reload();
  };

  const del = async (id: string) => {
    if (!confirm('Delete tooling item?')) return;
    const { error } = await supabase.from('npi_tooling_tracker').delete().eq('id', id);
    if (error) return toast.error(error.message);
    reload();
  };

  if (loading) return <AppLayout title="Tooling" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Tooling Tracker" subtitle="Required, ordered, delivery" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tooling items ({tooling.length})</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add tooling</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New tooling item</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Part (optional)</Label>
                    <Select value={form.part_id} onValueChange={v => setForm({ ...form, part_id: v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.part_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Input value={form.tooling_description} onChange={e => setForm({ ...form, tooling_description: e.target.value })} /></div>
                  <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
                  <div><Label>Expected delivery</Label><Input type="date" value={form.expected_delivery_date} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })} /></div>
                  <div><Label>Order status</Label>
                    <Select value={form.ordered_status} onValueChange={v => setForm({ ...form, ordered_status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{['Not Ordered','Ordered','Received','Delayed','Issue'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button onClick={save}>Add</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Part</TableHead><TableHead>Description</TableHead><TableHead>Supplier</TableHead><TableHead>Expected</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {tooling.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No tooling items</TableCell></TableRow> :
                  tooling.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.part_number || '-'}</TableCell>
                      <TableCell>{t.tooling_description}</TableCell>
                      <TableCell>{t.supplier || '-'}</TableCell>
                      <TableCell>{t.expected_delivery_date || '-'}</TableCell>
                      <TableCell><Badge className={TONE[t.ordered_status || ''] || ''} variant="outline">{t.ordered_status}</Badge></TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}
