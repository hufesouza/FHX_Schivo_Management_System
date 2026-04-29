import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNPIPlanning, recommendAllocations, upsertPart, type AllocationOption } from '@/hooks/useNPIPlanning';
import { toast } from 'sonner';
import { Loader2, Sparkles, CheckCircle2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QuickCustomerDialog } from '@/components/npi-planner/QuickCustomerDialog';
import { QuickProjectDialog } from '@/components/npi-planner/QuickProjectDialog';
import { ToolingListEditor, type ToolLine } from '@/components/npi-planner/ToolingListEditor';
import { SupplierPicker } from '@/components/npi-planner/SupplierPicker';


const MATERIAL_STATUSES = ['Not Required','Required','Ordered','Received','Delayed','Issue'];
const TOOLING_STATUSES = ['Not Required','Required','Ordered','Received','Delayed','Issue'];
const SUBCON_STATUSES = ['Not Required','Required','Sent Out','In Progress','Returned','Delayed','Issue'];
const OVERALL_STATUSES = ['Not Started','Awaiting Material','Awaiting Tooling','Awaiting Subcon','Ready to Schedule','Scheduled','In Development','In Production','Completed','On Hold','At Risk','Late'];

export default function PartSetup() {
  const navigate = useNavigate();
  const { customers, projects, machines, schedule, availability, calendarSettings, loading, reload } = useNPIPlanning();
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<AllocationOption[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [machineOptionIds, setMachineOptionIds] = useState<string[]>([]);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [toolLines, setToolLines] = useState<ToolLine[]>([]);
  const [machineSearch, setMachineSearch] = useState('');

  const [form, setForm] = useState<any>({
    customer_id: '', project_id: '', engineer: '',
    part_number: '', part_revision: '', description: '', po: '', qty: 1,
    material: '', material_lead_time: 0, material_status: 'Not Required',
    material_supplier_id: '', material_supplier_name: '',
    tooling: '', tooling_lead_time: 0, tooling_status: 'Not Required',
    committed_date: '',
    cycle_time: 0, development_time: 0,
    subcon_supplier_id: '', supplier_name: '', type_of_service: '', subcon_lead_time: 0, subcon_status: 'Not Required',
    sales_price: 0, notes: '', overall_status: 'Not Started',
    dev_allow_weekends: false, prod_allow_weekends: true,
  });

  const totalRequired = (Number(form.development_time) || 0) + (Number(form.cycle_time) || 0) * (Number(form.qty) || 0);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const filteredProjects = useMemo(
    () => projects.filter(p => !form.customer_id || p.customer_id === form.customer_id),
    [projects, form.customer_id],
  );

  const maxToolLeadFromList = useMemo(
    () => toolLines.reduce((m, t) => Math.max(m, Number(t.lead_time_days) || 0), 0),
    [toolLines],
  );

  const runAllocation = () => {
    if (machineOptionIds.length === 0) {
      toast.error('Select at least one candidate machine');
      return;
    }
    const qty = Number(form.qty) || 0;
    const machiningHrs = (Number(form.development_time) || 0) + (Number(form.cycle_time) || 0) * qty;
    if (machiningHrs <= 0) {
      toast.error('Cycle time × qty + development time must be > 0');
      return;
    }
    const candidates = machines.filter(m => machineOptionIds.includes(m.id));
    const opts = recommendAllocations(candidates, schedule, availability, {
      qty,
      cycleTimeHrs: Number(form.cycle_time) || 0,
      developmentTimeHrs: Number(form.development_time) || 0,
      materialLeadTime: Number(form.material_lead_time) || 0,
      materialStatus: form.material_status,
      toolingLeadTime: maxToolLeadFromList || Number(form.tooling_lead_time) || 0,
      toolingStatus: form.tooling_status,
      subconRequired: (form.subcon_status && form.subcon_status !== 'Not Required'),
      subconLeadTime: Number(form.subcon_lead_time) || 0,
      backendLeadTime: 0,
      bestCommenceDate: null,
      committedDate: form.committed_date ? new Date(form.committed_date) : null,
      calendar: calendarSettings,
      devAllowWeekends: !!form.dev_allow_weekends,
      prodAllowWeekends: !!form.prod_allow_weekends,
    });
    setOptions(opts);
    if (opts.length === 0) {
      toast.warning('No machine has an NPI availability window that fits this job. Add a window in Settings → Machines.');
    }
    if (opts[0]) setSelectedMachineId(opts[0].machine.id);
  };

  const handleSave = async () => {
    if (!form.part_number.trim()) return toast.error('Part number is required');
    setSaving(true);
    try {
      const customer = customers.find(c => c.id === form.customer_id);
      const project = projects.find(p => p.id === form.project_id);
      const machine = machines.find(m => m.id === selectedMachineId);
      const chosen = options.find(o => o.machine.id === selectedMachineId);

      const maxToolLead = toolLines.reduce((m, t) => Math.max(m, Number(t.lead_time_days) || 0), 0);

      const partData: any = {
        ...form,
        customer_id: form.customer_id || null,
        project_id: form.project_id || null,
        material_supplier_id: form.material_supplier_id || null,
        subcon_supplier_id: form.subcon_supplier_id || null,
        committed_date: form.committed_date || null,
        best_commence_date: chosen ? chosen.earliestStart.toISOString().slice(0, 10) : null,
        ship_date: null,
        customer_name: customer?.customer_name || null,
        project_name: project?.project_name || null,
        machine_id: machine?.id || null,
        machine_name: machine?.machine_name || null,
        tooling_lead_time: maxToolLead || form.tooling_lead_time || 0,
      };
      delete partData.id;
      delete partData.total_required_time;

      const part = await upsertPart(partData, machineOptionIds);

      // If allocation chosen, create schedule entry (machining window only)
      if (part && chosen) {
        await supabase.from('npi_machine_schedule').insert({
          part_id: part.id,
          part_number: part.part_number,
          customer_name: part.customer_name,
          project_name: part.project_name,
          machine_id: chosen.machine.id,
          machine_name: chosen.machine.machine_name,
          start_date: chosen.machiningStart.toISOString(),
          end_date: chosen.machiningEnd.toISOString(),
          total_required_time: totalRequired,
          allocation_status: 'Confirmed',
          notes: chosen.reason,
        });
      }

      // Persist tooling lines + upsert catalog entries
      if (part && toolLines.length > 0) {
        const rows = toolLines
          .filter(t => t.tooling_description?.trim())
          .map(t => ({
            part_id: part.id,
            part_number: part.part_number,
            po: form.po || null,
            tooling_description: t.tooling_description,
            supplier: t.supplier || null,
            supplier_id: t.supplier_id || null,
            qty: Number(t.qty) || 1,
            unit_cost: Number(t.unit_cost) || 0,
            total_cost: (Number(t.qty) || 0) * (Number(t.unit_cost) || 0),
            lead_time_days: Number(t.lead_time_days) || 0,
            expected_delivery_date: t.expected_delivery_date || null,
            ordered_status: t.ordered_status || 'Not Ordered',
            required_status: 'Required',
            catalog_tool_id: t.catalog_tool_id || null,
          }));
        if (rows.length) await supabase.from('npi_tooling_tracker').insert(rows as any);

        // Add brand-new tools to catalog (no catalog_tool_id, has description)
        const newCatalog = toolLines
          .filter(t => !t.catalog_tool_id && t.tooling_description?.trim() && t.save_to_catalog !== false)
          .map(t => ({
            tool_code: t.tool_code || null,
            tooling_description: t.tooling_description,
            supplier: t.supplier || null,
            supplier_id: t.supplier_id || null,
            default_unit_cost: Number(t.unit_cost) || 0,
            default_lead_time_days: Number(t.lead_time_days) || 0,
          }));
        if (newCatalog.length) await supabase.from('npi_tooling_catalog').insert(newCatalog as any);
      }

      toast.success('Part created and allocated');
      reload();
      navigate('/npi/capacity-planner/jobs');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AppLayout title="New Part" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="New Part / Job" subtitle="Setup & machine allocation" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Part details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Customer">
              <div className="flex gap-1">
                <Select value={form.customer_id} onValueChange={v => { set('customer_id', v); set('project_id', ''); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_code ? `${c.customer_code} — ` : ''}{c.customer_name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setCustomerDialogOpen(true)} title="New customer"><Plus className="h-4 w-4" /></Button>
              </div>
            </Field>
            <Field label="Project">
              <div className="flex gap-1">
                <Select value={form.project_id} onValueChange={v => {
                  set('project_id', v);
                  const proj = projects.find(p => p.id === v);
                  if (proj?.engineer) set('engineer', proj.engineer);
                }} disabled={!form.customer_id}>
                  <SelectTrigger><SelectValue placeholder={form.customer_id ? 'Select' : 'Pick customer first'} /></SelectTrigger>
                  <SelectContent>{filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setProjectDialogOpen(true)} disabled={!form.customer_id} title="New project"><Plus className="h-4 w-4" /></Button>
              </div>
            </Field>
            <Field label="Engineer">
              <Input value={form.engineer} disabled placeholder="—" />
            </Field>
            <Field label="Part Number *"><Input value={form.part_number} onChange={e => set('part_number', e.target.value)} /></Field>
            <Field label="Part Revision"><Input value={form.part_revision} onChange={e => set('part_revision', e.target.value)} placeholder="e.g. A" /></Field>
            <Field label="Part Description"><Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description" /></Field>
            <Field label="PO"><Input value={form.po} onChange={e => set('po', e.target.value)} /></Field>
            <Field label="QTY"><Input type="number" value={form.qty} onChange={e => set('qty', +e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Material</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            <Field label="Material"><Input value={form.material} onChange={e => set('material', e.target.value)} /></Field>
            <Field label="Supplier">
              <SupplierPicker
                value={form.material_supplier_id || null}
                displayName={form.material_supplier_name}
                onPick={(s) => {
                  set('material_supplier_id', s.id);
                  set('material_supplier_name', s.supplier_name);
                  if (!form.material_lead_time && s.default_lead_time_days) set('material_lead_time', s.default_lead_time_days);
                }}
              />
            </Field>
            <Field label="Lead time (days)"><Input type="number" value={form.material_lead_time} onChange={e => set('material_lead_time', +e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.material_status} onValueChange={v => set('material_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MATERIAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tooling</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Summary status">
                <Select value={form.tooling_status} onValueChange={v => set('tooling_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TOOLING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Total lead time (days, max of tools)">
                <Input value={toolLines.reduce((m, t) => Math.max(m, Number(t.lead_time_days) || 0), 0)} disabled />
              </Field>
              <Field label="Total tooling cost (€)">
                <Input value={toolLines.reduce((s, t) => s + (Number(t.qty) || 0) * (Number(t.unit_cost) || 0), 0).toFixed(2)} disabled />
              </Field>
            </div>
            <ToolingListEditor lines={toolLines} onChange={setToolLines} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subcon</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-4">
            <Field label="Supplier">
              <SupplierPicker
                value={form.subcon_supplier_id || null}
                displayName={form.supplier_name}
                onPick={(s) => {
                  set('subcon_supplier_id', s.id);
                  set('supplier_name', s.supplier_name);
                  if (!form.subcon_lead_time && s.default_lead_time_days) set('subcon_lead_time', s.default_lead_time_days);
                }}
              />
            </Field>
            <Field label="Type of service"><Input value={form.type_of_service} onChange={e => set('type_of_service', e.target.value)} /></Field>
            <Field label="Subcon lead time (days)"><Input type="number" value={form.subcon_lead_time} onChange={e => set('subcon_lead_time', +e.target.value)} /></Field>
            <Field label="Subcon status">
              <Select value={form.subcon_status} onValueChange={v => set('subcon_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUBCON_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Time & dates</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <Field label="Cycle time (hrs)"><Input type="number" step="0.1" value={form.cycle_time} onChange={e => set('cycle_time', +e.target.value)} /></Field>
            <Field label="Development time (hrs)"><Input type="number" step="0.1" value={form.development_time} onChange={e => set('development_time', +e.target.value)} /></Field>
            <Field label="Total machining hrs (dev + cycle × qty)"><Input value={totalRequired} disabled /></Field>
            <Field label="Committed date"><Input type="date" value={form.committed_date} onChange={e => set('committed_date', e.target.value)} /></Field>
            <Field label="Sales price (€)"><Input type="number" step="0.01" value={form.sales_price} onChange={e => set('sales_price', +e.target.value)} /></Field>
            <Field label="Overall status">
              <Select value={form.overall_status} onValueChange={v => set('overall_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OVERALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Notes" className="md:col-span-3"><Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
            <div className="md:col-span-3 grid md:grid-cols-2 gap-3 pt-2 border-t">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={!!form.dev_allow_weekends} onCheckedChange={v => set('dev_allow_weekends', !!v)} />
                <div>
                  <div className="text-sm font-medium">Development allowed on weekends/bank holidays</div>
                  <div className="text-xs text-muted-foreground">If unchecked, development time only schedules on working days ({calendarSettings.countryLabel}).</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox checked={!!form.prod_allow_weekends} onCheckedChange={v => set('prod_allow_weekends', !!v)} />
                <div>
                  <div className="text-sm font-medium">Production allowed on weekends/bank holidays</div>
                  <div className="text-xs text-muted-foreground">When ticked, machining can run continuously through weekends &amp; holidays — preferred for long jobs.</div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Machine allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Label className="text-xs text-muted-foreground">Which machines can run this job? Tick all capable machines.</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setMachineOptionIds(machines.map(m => m.id))} disabled={!machines.length}>Select all</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMachineOptionIds([])} disabled={!machineOptionIds.length}>Clear</Button>
                </div>
              </div>
              <Input placeholder="Search machines..." value={machineSearch} onChange={e => setMachineSearch(e.target.value)} className="mb-2" />
              {machines.length === 0 ? (
                <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
                  No NPI machines yet. Set them up in the <a href="/npi/capacity-planner/settings?tab=machines" className="underline text-primary">Machines</a> page from the Capacity Planner front page.
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-2">{machineOptionIds.length} of {machines.length} selected</div>
                  <div className="grid md:grid-cols-3 gap-2 max-h-72 overflow-auto">
                    {machines
                      .filter(m => !machineSearch || m.machine_name.toLowerCase().includes(machineSearch.toLowerCase()) || (m.machine_type || '').toLowerCase().includes(machineSearch.toLowerCase()))
                      .map(m => (
                        <label key={m.id} className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40">
                          <Checkbox
                            checked={machineOptionIds.includes(m.id)}
                            onCheckedChange={(v) => setMachineOptionIds(ids => v ? [...ids, m.id] : ids.filter(i => i !== m.id))}
                          />
                          <span className="text-sm flex-1">{m.machine_name}</span>
                          {m.machine_type && <span className="text-xs text-muted-foreground">{m.machine_type}</span>}
                        </label>
                      ))}
                  </div>
                </>
              )}
            </div>
            <Button onClick={runAllocation} variant="default" disabled={machineOptionIds.length === 0}><Sparkles className="mr-2 h-4 w-4" />Recommend allocation</Button>
            {options.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <p className="text-sm font-medium">Recommended options (best first)</p>
                {options.map((o, i) => {
                  const statusColor = o.status === 'On Track'
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                    : o.status === 'At Risk'
                      ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                      : 'bg-destructive/10 text-destructive border-destructive/30';
                  const fmt = (d: Date) => d.toLocaleDateString();
                  return (
                    <label key={o.machine.id} className={`flex flex-col gap-2 border rounded-md px-3 py-3 cursor-pointer ${selectedMachineId === o.machine.id ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input type="radio" checked={selectedMachineId === o.machine.id} onChange={() => setSelectedMachineId(o.machine.id)} />
                          <div className="font-medium text-sm">
                            {i === 0 && <Badge variant="default" className="mr-2">Best</Badge>}
                            {o.machine.machine_name}
                          </div>
                        </div>
                        <Badge variant="outline" className={statusColor}>
                          {o.status === 'On Track' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {o.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pl-6">
                        <div><span className="text-muted-foreground">Earliest start:</span> <div className="font-medium">{fmt(o.earliestStart)}</div></div>
                        <div><span className="text-muted-foreground">Machining:</span> <div className="font-medium">{fmt(o.machiningStart)} → {fmt(o.machiningEnd)}</div></div>
                        <div><span className="text-muted-foreground">Backend done:</span> <div className="font-medium">{fmt(o.backendEnd)}</div></div>
                        <div><span className="text-muted-foreground">Ship date:</span> <div className="font-medium">{fmt(o.shipDate)}</div></div>
                      </div>
                      <div className="text-xs text-muted-foreground pl-6 italic">{o.reason}</div>
                      {!o.meetsCommittedDate && (
                        <div className="text-xs text-destructive pl-6">
                          ⚠ Job cannot meet committed date based on current constraints. Consider renegotiating committed date or expediting constraints.
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/npi/capacity-planner')}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save part'}</Button>
        </div>
      </main>

      <QuickCustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onCreated={async (c) => { await reload(); set('customer_id', c.id); set('project_id', ''); }}
      />
      <QuickProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        customerId={form.customer_id || null}
        customerName={customers.find(c => c.id === form.customer_id)?.customer_name || null}
        onCreated={async (p) => { await reload(); set('project_id', p.id); }}
      />
    </AppLayout>
  );
}

function Field({ label, children, className = '' }: any) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
