import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { logChange, type Part, type ChangeLog } from '@/hooks/useNPIPlanning';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const OVERALL_STATUSES = ['Not Started','Awaiting Material','Awaiting Tooling','Awaiting Subcon','Ready to Schedule','Scheduled','In Development','In Production','Completed','On Hold','At Risk','Late'];
const MATERIAL_STATUSES = ['Not Required','Required','Ordered','Received','Delayed','Issue'];
const TOOLING_STATUSES = ['Not Required','Required','Ordered','Received','Delayed','Issue'];
const SUBCON_STATUSES = ['Not Required','Required','Sent Out','In Progress','Returned','Delayed','Issue'];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [part, setPart] = useState<Part | null>(null);
  const [original, setOriginal] = useState<Part | null>(null);
  const [history, setHistory] = useState<ChangeLog[]>([]);
  const [reason, setReason] = useState('');
  const [machines, setMachines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: p }, { data: m }, { data: h }] = await Promise.all([
        supabase.from('npi_parts').select('*').eq('id', id).single(),
        supabase.from('npi_machines').select('*'),
        supabase.from('npi_change_log').select('*').eq('part_id', id).order('created_at', { ascending: false }),
      ]);
      setPart(p as any); setOriginal(p as any);
      setMachines(m || []);
      setHistory((h as any) || []);
    })();
  }, [id]);

  const set = (k: keyof Part, v: any) => setPart(p => p ? { ...p, [k]: v } : p);

  const handleSave = async () => {
    if (!part || !original) return;
    setSaving(true);
    try {
      const payload: any = {
        ...part,
        machine_name: machines.find(m => m.id === part.machine_id)?.machine_name || null,
      };
      delete payload.total_required_time;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      const { error } = await supabase.from('npi_parts').update(payload).eq('id', part.id);
      if (error) throw error;

      // Log notable changes
      if (original.committed_date !== part.committed_date) {
        await logChange(part, 'committed_date', original.committed_date, part.committed_date, reason);
      }
      if (original.machine_id !== part.machine_id) {
        const newName = machines.find(m => m.id === part.machine_id)?.machine_name || null;
        await logChange(part, 'machine_name', original.machine_name, newName, reason);
      }
      if (original.overall_status !== part.overall_status) {
        await logChange(part, 'overall_status', original.overall_status, part.overall_status, reason);
      }
      toast.success('Saved');
      setReason('');
      setOriginal(part);
      navigate('/npi/capacity-planner/jobs');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!part || !confirm('Delete this part?')) return;
    const { error } = await supabase.from('npi_parts').delete().eq('id', part.id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    navigate('/npi/capacity-planner/jobs');
  };

  if (!part) return <AppLayout title="Loading…" showBackButton backTo="/npi/capacity-planner/jobs"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title={part.part_number} subtitle={part.customer_name || ''} showBackButton backTo="/npi/capacity-planner/jobs">
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Planning</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Part Number"><Input value={part.part_number} onChange={e => set('part_number', e.target.value)} /></Field>
            <Field label="PO"><Input value={part.po || ''} onChange={e => set('po', e.target.value)} /></Field>
            <Field label="QTY"><Input type="number" value={part.qty || 0} onChange={e => set('qty', +e.target.value)} /></Field>
            <Field label="Description" className="md:col-span-3"><Textarea rows={2} value={part.description || ''} onChange={e => set('description', e.target.value)} /></Field>
            <Field label="Engineer"><Input value={part.engineer || ''} onChange={e => set('engineer', e.target.value)} /></Field>
            <Field label="Cycle time (h)"><Input type="number" value={part.cycle_time || 0} onChange={e => set('cycle_time', +e.target.value)} /></Field>
            <Field label="Development time (h)"><Input type="number" value={part.development_time || 0} onChange={e => set('development_time', +e.target.value)} /></Field>
            <Field label="Total required (h)"><Input value={part.total_required_time || 0} disabled /></Field>
            <Field label="Best commence"><Input type="date" value={part.best_commence_date || ''} onChange={e => set('best_commence_date', e.target.value)} /></Field>
            <Field label="Committed date *"><Input type="date" value={part.committed_date || ''} onChange={e => set('committed_date', e.target.value)} /></Field>
            <Field label="Ship date"><Input type="date" value={part.ship_date || ''} onChange={e => set('ship_date', e.target.value)} /></Field>
            <Field label="Sales price (€)"><Input type="number" value={part.sales_price || 0} onChange={e => set('sales_price', +e.target.value)} /></Field>
            <Field label="Machine *">
              <Select value={part.machine_id || ''} onValueChange={v => set('machine_id', v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.machine_name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Overall status">
              <Select value={part.overall_status} onValueChange={v => set('overall_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OVERALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Material / Tooling / Subcon</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Material"><Input value={part.material || ''} onChange={e => set('material', e.target.value)} /></Field>
            <Field label="Material lead time"><Input type="number" value={part.material_lead_time || 0} onChange={e => set('material_lead_time', +e.target.value)} /></Field>
            <Field label="Material status">
              <Select value={part.material_status || ''} onValueChange={v => set('material_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MATERIAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Tooling"><Input value={part.tooling || ''} onChange={e => set('tooling', e.target.value)} /></Field>
            <Field label="Tooling lead time"><Input type="number" value={part.tooling_lead_time || 0} onChange={e => set('tooling_lead_time', +e.target.value)} /></Field>
            <Field label="Tooling status">
              <Select value={part.tooling_status || ''} onValueChange={v => set('tooling_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOOLING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Supplier"><Input value={part.supplier_name || ''} onChange={e => set('supplier_name', e.target.value)} /></Field>
            <Field label="Type of service"><Input value={part.type_of_service || ''} onChange={e => set('type_of_service', e.target.value)} /></Field>
            <Field label="Subcon status">
              <Select value={part.subcon_status || ''} onValueChange={v => set('subcon_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBCON_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Reason for changes (sent in notification)</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why committed date / machine / status changed…" />
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handleDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
              <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Change history</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? <p className="text-sm text-muted-foreground">No changes recorded.</p> :
              <ul className="space-y-2 text-sm">
                {history.map(h => (
                  <li key={h.id} className="border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{h.field_changed}</Badge>
                      <span className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString()}</span>
                      {h.email_sent && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700">Email sent</Badge>}
                    </div>
                    <div className="mt-1"><span className="text-destructive">{h.previous_value || '—'}</span> → <span className="text-emerald-600 font-medium">{h.new_value || '—'}</span></div>
                    {h.reason && <div className="text-muted-foreground italic mt-1">"{h.reason}"</div>}
                    <div className="text-xs text-muted-foreground">By: {h.changed_by_name || 'Unknown'}</div>
                  </li>
                ))}
              </ul>}
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
}

function Field({ label, children, className = '' }: any) {
  return (<div className={className}><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>);
}
