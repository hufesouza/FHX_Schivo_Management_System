import { useEffect, useState, type ChangeEvent } from 'react';
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
import { Loader2, Save, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { QuickMachineDialog } from '@/components/npi-planner/QuickMachineDialog';

const OVERALL_STATUSES = ['Not Started','Awaiting Material','Awaiting Tooling','Awaiting Subcon','Out for Subcon','Ready to Schedule','Scheduled','In Development','In Production','Machined','Completed','On Hold','At Risk','Late'];
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
  const [machineOptionIds, setMachineOptionIds] = useState<string[]>([]);
  const [machineSearch, setMachineSearch] = useState('');
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allocMachineId, setAllocMachineId] = useState<string>('');
  const [allocStartDate, setAllocStartDate] = useState<string>('');
  const [allocSaving, setAllocSaving] = useState(false);
  const [numberDrafts, setNumberDrafts] = useState<Record<string, string>>({});
  const [allParts, setAllParts] = useState<Part[]>([]);

  const applyManualAllocation = async () => {
    if (!part) return;
    if (!allocMachineId) { toast.error('Pick a machine'); return; }
    if (!allocStartDate) { toast.error('Pick a start date'); return; }
    const machine = machines.find(m => m.id === allocMachineId);
    if (!machine) { toast.error('Machine not found'); return; }
    setAllocSaving(true);
    try {
      await supabase.from('npi_machine_schedule')
        .update({ allocation_status: 'Cancelled' })
        .eq('part_id', part.id)
        .in('allocation_status', ['Scheduled', 'In Production']);

      const totalHrs = (Number(part.development_time) || 0) + (Number(part.cycle_time) || 0) * (Number(part.qty) || 0);
      const start = new Date(`${allocStartDate}T08:00:00`);
      const end = new Date(start.getTime() + Math.max(1, totalHrs) * 3600 * 1000);

      const { error: schedErr } = await supabase.from('npi_machine_schedule').insert({
        part_id: part.id,
        part_number: part.part_number,
        customer_name: part.customer_name,
        project_name: part.project_name,
        machine_id: machine.id,
        machine_name: machine.machine_name,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        total_required_time: totalHrs,
        allocation_status: 'Scheduled',
      });
      if (schedErr) throw schedErr;

      const { error: partErr } = await supabase.from('npi_parts')
        .update({
          machine_id: machine.id,
          machine_name: machine.machine_name,
          best_commence_date: allocStartDate,
          overall_status: 'Scheduled',
        })
        .eq('id', part.id);
      if (partErr) throw partErr;

      // Ensure machine is in capable list
      if (!machineOptionIds.includes(machine.id)) {
        await supabase.from('npi_part_machine_options').insert({ part_id: part.id, machine_id: machine.id });
        setMachineOptionIds(ids => [...ids, machine.id]);
      }

      setPart(p => p ? { ...p, machine_id: machine.id, machine_name: machine.machine_name, best_commence_date: allocStartDate, overall_status: 'Scheduled' } : p);
      toast.success(`Allocated to ${machine.machine_name}`);
    } catch (e: any) {
      toast.error(e.message || 'Manual allocation failed');
    } finally {
      setAllocSaving(false);
    }
  };

  const loadMachineOptions = async (partId: string) => {
    const { data } = await supabase.from('npi_part_machine_options').select('machine_id').eq('part_id', partId);
    setMachineOptionIds((data || []).map((r: any) => r.machine_id));
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: p }, { data: m }, { data: h }, { data: ap }] = await Promise.all([
        supabase.from('npi_parts').select('*').eq('id', id).single(),
        supabase.from('npi_machines').select('*').order('machine_name'),
        supabase.from('npi_change_log').select('*').eq('part_id', id).order('created_at', { ascending: false }),
        supabase.from('npi_parts').select('*').order('part_number'),
      ]);
      setAllParts((ap as any) || []);
      setPart(p as any); setOriginal(p as any);
      setMachines(m || []);
      setHistory((h as any) || []);
      if (p) {
        setAllocMachineId((p as any).machine_id || '');
        setAllocStartDate((p as any).best_commence_date || new Date().toISOString().slice(0, 10));
      }
      await loadMachineOptions(id);
    })();
  }, [id]);

  const toggleMachineOption = async (machineId: string, checked: boolean) => {
    if (!part) return;
    if (checked) {
      const { error } = await supabase.from('npi_part_machine_options').insert({ part_id: part.id, machine_id: machineId });
      if (error) return toast.error(error.message);
      setMachineOptionIds(ids => ids.includes(machineId) ? ids : [...ids, machineId]);
    } else {
      const { error } = await supabase.from('npi_part_machine_options').delete().eq('part_id', part.id).eq('machine_id', machineId);
      if (error) return toast.error(error.message);
      setMachineOptionIds(ids => ids.filter(x => x !== machineId));
    }
  };

  const set = (k: keyof Part, v: any) => setPart(p => p ? { ...p, [k]: v } : p);
  const totalRequired = part
    ? (Number(part.development_time) || 0) + (Number(part.cycle_time) || 0) * (Number(part.qty) || 0)
    : 0;
  const numericInput = (key: string, value: number, onValue: (value: number) => void) => ({
    type: 'text' as const,
    inputMode: 'decimal' as const,
    value: Object.prototype.hasOwnProperty.call(numberDrafts, key) ? numberDrafts[key] : String(value || 0),
    onFocus: () => setNumberDrafts(d => ({ ...d, [key]: '' })),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value.replace(',', '.');
      setNumberDrafts(d => ({ ...d, [key]: next }));
      onValue(Number(next) || 0);
    },
  });

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
            <Field label="QTY"><Input {...numericInput('qty', Number(part.qty) || 0, v => set('qty', v))} /></Field>
            <Field label="Description" className="md:col-span-3"><Textarea rows={2} value={part.description || ''} onChange={e => set('description', e.target.value)} /></Field>
            <Field label="Engineer"><Input value={part.engineer || ''} onChange={e => set('engineer', e.target.value)} /></Field>
            <Field label="Cycle time (min)"><Input {...numericInput('cycle_time_min', (Number(part.cycle_time) || 0) * 60, v => set('cycle_time', v / 60))} /></Field>
            <Field label="Development time (min)"><Input {...numericInput('development_time_min', (Number(part.development_time) || 0) * 60, v => set('development_time', v / 60))} /></Field>
            <Field label="Backend time (h)"><Input {...numericInput('backend_time', Number((part as any).backend_time) || 0, v => set('backend_time' as any, v))} /></Field>
            <Field label="Total required (h)"><Input value={totalRequired.toFixed(2)} disabled /></Field>
            <Field label="Best commence"><Input type="date" value={part.best_commence_date || ''} onChange={e => set('best_commence_date', e.target.value)} /></Field>
            <Field label="Committed date *"><Input type="date" value={part.committed_date || ''} onChange={e => set('committed_date', e.target.value)} /></Field>
            <Field label="Ship date"><Input type="date" value={part.ship_date || ''} onChange={e => set('ship_date', e.target.value)} /></Field>
            <Field label="Sales price (€)"><Input {...numericInput('sales_price', Number(part.sales_price) || 0, v => set('sales_price', v))} /></Field>
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
          <CardHeader><CardTitle className="text-base">Hierarchy (Top / Sub Level)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Part Level">
                <Select
                  value={(part as any).part_level || 'Top Level'}
                  onValueChange={v => {
                    set('part_level' as any, v);
                    if (v === 'Top Level') set('parent_part_id' as any, null);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Top Level">Top Level (customer part)</SelectItem>
                    <SelectItem value="Sub Level">Sub Level (component)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {(part as any).part_level === 'Sub Level' && (
                <Field label="Parent Part *">
                  <Select
                    value={(part as any).parent_part_id || ''}
                    onValueChange={v => set('parent_part_id' as any, v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Pick parent" /></SelectTrigger>
                    <SelectContent>
                      {allParts
                        .filter(p => p.id !== part.id && (p.part_level || 'Top Level') === 'Top Level')
                        .map(p => <SelectItem key={p.id} value={p.id}>{p.part_number}{p.description ? ` — ${p.description}` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
            {((part as any).part_level || 'Top Level') === 'Top Level' && (() => {
              const children = allParts.filter(p => p.parent_part_id === part.id);
              const todayMs = Date.now();
              const delayed = children.filter(c => c.overall_status !== 'Completed' && c.committed_date && new Date(c.committed_date).getTime() < todayMs);
              return (
                <div className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium">Child Parts ({children.length})</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value="" onValueChange={async (childId) => {
                        if (!childId) return;
                        const { error } = await supabase.from('npi_parts').update({ parent_part_id: part.id, part_level: 'Sub Level' }).eq('id', childId);
                        if (error) { toast.error(error.message); return; }
                        toast.success('Linked as child');
                        const { data } = await supabase.from('npi_parts').select('*');
                        setAllParts((data as any) || []);
                      }}>
                        <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Link existing part…" /></SelectTrigger>
                        <SelectContent>
                          {allParts.filter(p => p.id !== part.id && !p.parent_part_id).length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">No unassigned parts available</div>
                          ) : allParts.filter(p => p.id !== part.id && !p.parent_part_id).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.part_number}{p.description ? ` — ${p.description}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/npi/capacity-planner/parts/new?parent=${part.id}&level=Sub%20Level`)}>
                        <Plus className="h-3 w-3 mr-1" /> New Sub Level part
                      </Button>
                    </div>
                  </div>
                  {delayed.length > 0 && (
                    <div className="text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded px-2 py-1.5">
                      ⚠ Parent job delayed due to dependency on Sub Level part ({delayed.map(d => d.part_number).join(', ')})
                    </div>
                  )}
                  {children.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No Sub Level parts linked. Pick "Link existing part" to reuse a saved part, or create a new one.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {children.map(c => (
                        <li key={c.id} className="flex items-center justify-between border-b pb-1">
                          <button className="text-left hover:underline" onClick={() => navigate(`/npi/capacity-planner/parts/${c.id}`)}>
                            <span className="font-medium">{c.part_number}</span>
                            {c.description && <span className="text-muted-foreground ml-2">{c.description}</span>}
                          </button>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{c.overall_status}</Badge>
                            {c.committed_date && <span className="text-xs text-muted-foreground">due {c.committed_date}</span>}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={async () => {
                              const { error } = await supabase.from('npi_parts').update({ parent_part_id: null }).eq('id', c.id);
                              if (error) { toast.error(error.message); return; }
                              toast.success('Unlinked');
                              const { data } = await supabase.from('npi_parts').select('*');
                              setAllParts((data as any) || []);
                            }}>Unlink</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
            {(part as any).parent_part_id && (() => {
              const parent = allParts.find(p => p.id === (part as any).parent_part_id);
              if (!parent) return null;
              return (
                <div className="border rounded-md p-3 text-sm">
                  <span className="text-muted-foreground">Parent:</span>{' '}
                  <button className="font-medium hover:underline" onClick={() => navigate(`/npi/capacity-planner/parts/${parent.id}`)}>
                    {parent.part_number}{parent.description ? ` — ${parent.description}` : ''}
                  </button>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Material / Tooling / Subcon</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Material"><Input value={part.material || ''} onChange={e => set('material', e.target.value)} /></Field>
            <Field label="Material lead time"><Input {...numericInput('material_lead_time', Number(part.material_lead_time) || 0, v => set('material_lead_time', v))} /></Field>
            <Field label="Material status">
              <Select value={part.material_status || ''} onValueChange={v => set('material_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MATERIAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Tooling"><Input value={part.tooling || ''} onChange={e => set('tooling', e.target.value)} /></Field>
            <Field label="Tooling lead time"><Input {...numericInput('tooling_lead_time', Number(part.tooling_lead_time) || 0, v => set('tooling_lead_time', v))} /></Field>
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
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span>Capable machines</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setMachineDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add machine
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Tick every machine that can run this job. Recommendations on the Job Tracker only consider these.</p>
            <Input placeholder="Search machines..." value={machineSearch} onChange={e => setMachineSearch(e.target.value)} />
            <div className="text-xs text-muted-foreground">{machineOptionIds.length} of {machines.length} selected</div>
            {machines.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">No NPI machines yet.</div>
            ) : (
              <div className="grid md:grid-cols-3 gap-2 max-h-72 overflow-auto border rounded-md p-2">
                {machines
                  .filter(m => !machineSearch || m.machine_name.toLowerCase().includes(machineSearch.toLowerCase()) || (m.machine_type || '').toLowerCase().includes(machineSearch.toLowerCase()))
                  .map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={machineOptionIds.includes(m.id)}
                        onCheckedChange={(v) => toggleMachineOption(m.id, !!v)}
                      />
                      <span className="flex-1 truncate">{m.machine_name}</span>
                      {m.machine_type && <span className="text-xs text-muted-foreground">{m.machine_type}</span>}
                    </label>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Manually assign this part to a machine and set the start date. Overrides any current allocation.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Machine">
                <Select value={allocMachineId} onValueChange={setAllocMachineId}>
                  <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const list = machineOptionIds.length
                        ? machines.filter(m => machineOptionIds.includes(m.id))
                        : machines;
                      if (list.length === 0) {
                        return <div className="px-2 py-1.5 text-xs text-muted-foreground">No capable machines linked. Add some above.</div>;
                      }
                      return list.map(m => <SelectItem key={m.id} value={m.id}>{m.machine_name}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Start date on machine">
                <Input type="date" value={allocStartDate} onChange={e => setAllocStartDate(e.target.value)} />
              </Field>
            </div>
            {part && (
              <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/30">
                Total run time: <strong>{totalRequired.toFixed(1)} hrs</strong>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={applyManualAllocation} disabled={allocSaving || !allocMachineId || !allocStartDate}>
                {allocSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Apply allocation
              </Button>
            </div>
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
      <QuickMachineDialog
        open={machineDialogOpen}
        onOpenChange={setMachineDialogOpen}
        onCreated={async (m) => {
          if (!part) return;
          const { data } = await supabase.from('npi_machines').select('*').order('machine_name');
          setMachines(data || []);
          await supabase.from('npi_part_machine_options').insert({ part_id: part.id, machine_id: m.id });
          setMachineOptionIds(ids => ids.includes(m.id) ? ids : [...ids, m.id]);
        }}
      />
    </AppLayout>
  );
}

function Field({ label, children, className = '' }: any) {
  return (<div className={className}><Label className="text-xs">{label}</Label><div className="mt-1">{children}</div></div>);
}
