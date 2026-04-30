import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNPIPlanning } from '@/hooks/useNPIPlanning';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { COUNTRY_OPTIONS } from '@/utils/workingCalendar';
import { toast } from 'sonner';

export default function PlannerSettings() {
  const { customers, projects, machines, recipients, loading, reload } = useNPIPlanning();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'machines';

  if (loading) return <AppLayout title="Settings" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Settings" subtitle="Master data, calendar & email recipients" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue={initialTab}>
          <TabsList>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="emails">Email recipients</TabsTrigger>
          </TabsList>

          <TabsContent value="machines"><MachinesTab machines={machines} reload={reload} /></TabsContent>
          <TabsContent value="customers"><CustomersTab customers={customers} reload={reload} /></TabsContent>
          <TabsContent value="projects"><ProjectsTab projects={projects} customers={customers} reload={reload} /></TabsContent>
          <TabsContent value="calendar"><CalendarTab reload={reload} /></TabsContent>
          <TabsContent value="emails"><EmailsTab recipients={recipients} reload={reload} /></TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
}

const MACHINE_TYPES = ['Mill', 'Turn', 'Mill/Turn', 'Swiss Turn'];

function MachinesTab({ machines, reload }: any) {
  const [form, setForm] = useState({ machine_name: '', machine_type: 'Mill', daily_available_hours: 24, shift_pattern: '', status: 'Available' });
  const [windows, setWindows] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [winForm, setWinForm] = useState<{ start_date: string; end_date: string; notes: string }>({ start_date: '', end_date: '', notes: '' });

  const loadWindows = async () => {
    const { data } = await supabase.from('npi_machine_availability').select('*').order('start_date');
    setWindows(data || []);
  };
  useEffect(() => { loadWindows(); }, []);

  const add = async () => {
    if (!form.machine_name) return toast.error('Name required');
    const { error } = await supabase.from('npi_machines').insert(form);
    if (error) return toast.error(error.message);
    toast.success('Added'); setForm({ machine_name: '', machine_type: 'Mill', daily_available_hours: 24, shift_pattern: '', status: 'Available' }); reload();
  };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('npi_machines').delete().eq('id', id); reload(); };

  const addWindow = async (machine_id: string) => {
    if (!winForm.start_date || !winForm.end_date) return toast.error('Start and end date required');
    if (winForm.end_date < winForm.start_date) return toast.error('End date must be after start');
    const { error } = await supabase.from('npi_machine_availability').insert({ machine_id, ...winForm });
    if (error) return toast.error(error.message);
    setWinForm({ start_date: '', end_date: '', notes: '' });
    loadWindows();
    toast.success('Availability window added');
  };
  const delWindow = async (id: string) => { if (!confirm('Remove window?')) return; await supabase.from('npi_machine_availability').delete().eq('id', id); loadWindows(); };

  const [bulkWin, setBulkWin] = useState({ start_date: '2026-04-30', end_date: '2026-12-31', notes: '' });
  const bulkAssign = async () => {
    if (!bulkWin.start_date || !bulkWin.end_date) return toast.error('Start and end date required');
    if (bulkWin.end_date < bulkWin.start_date) return toast.error('End date must be after start');
    if (!machines.length) return toast.error('No machines');
    if (!confirm(`Assign ${bulkWin.start_date} → ${bulkWin.end_date} to all ${machines.length} machines?`)) return;
    const rows = machines.map((m: any) => ({ machine_id: m.id, start_date: bulkWin.start_date, end_date: bulkWin.end_date, notes: bulkWin.notes }));
    const { error } = await supabase.from('npi_machine_availability').insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Window assigned to ${rows.length} machines`);
    loadWindows();
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Machines</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="text-sm font-medium">Bulk assign availability window to ALL machines</div>
          <div className="grid md:grid-cols-4 gap-2 items-end">
            <div><Label className="text-xs">From</Label><Input type="date" value={bulkWin.start_date} onChange={e => setBulkWin({ ...bulkWin, start_date: e.target.value })} /></div>
            <div><Label className="text-xs">To</Label><Input type="date" value={bulkWin.end_date} onChange={e => setBulkWin({ ...bulkWin, end_date: e.target.value })} /></div>
            <div><Label className="text-xs">Notes</Label><Input value={bulkWin.notes} onChange={e => setBulkWin({ ...bulkWin, notes: e.target.value })} placeholder="Optional" /></div>
            <Button size="sm" onClick={bulkAssign}><Plus className="h-4 w-4 mr-1" />Assign to all</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-5 gap-2 items-end">
          <div><Label className="text-xs">Name *</Label><Input value={form.machine_name} onChange={e => setForm({ ...form, machine_name: e.target.value })} /></div>
          <div><Label className="text-xs">Type</Label>
            <Select value={form.machine_type} onValueChange={v => setForm({ ...form, machine_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MACHINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Daily hrs</Label><Input type="number" value={form.daily_available_hours} onChange={e => setForm({ ...form, daily_available_hours: +e.target.value })} /></div>
          <div><Label className="text-xs">Shift pattern</Label><Input value={form.shift_pattern} onChange={e => setForm({ ...form, shift_pattern: e.target.value })} /></div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-2" />Add</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Daily hrs</TableHead><TableHead>NPI availability</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {machines.map((m: any) => {
              const mw = windows.filter(w => w.machine_id === m.id);
              const isOpen = expanded === m.id;
              return (
                <>
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.machine_name}</TableCell>
                    <TableCell>{m.machine_type || '-'}</TableCell>
                    <TableCell>{m.daily_available_hours}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setExpanded(isOpen ? null : m.id)}>
                        {mw.length} window{mw.length === 1 ? '' : 's'} {isOpen ? '▴' : '▾'}
                      </Button>
                    </TableCell>
                    <TableCell>{m.status}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={m.id + '-windows'}>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="space-y-3 p-2">
                          <div className="text-xs text-muted-foreground">Periods when Supply Chain has assigned this machine to NPI. Allocation will only schedule jobs inside these windows.</div>
                          {mw.length > 0 && (
                            <div className="space-y-1">
                              {mw.map(w => (
                                <div key={w.id} className="flex items-center gap-2 text-sm bg-background border rounded px-3 py-1.5">
                                  <Badge variant="outline">{w.start_date} → {w.end_date}</Badge>
                                  {w.notes && <span className="text-muted-foreground text-xs">{w.notes}</span>}
                                  <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => delWindow(w.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="grid md:grid-cols-4 gap-2 items-end">
                            <div><Label className="text-xs">From</Label><Input type="date" value={winForm.start_date} onChange={e => setWinForm({ ...winForm, start_date: e.target.value })} /></div>
                            <div><Label className="text-xs">To</Label><Input type="date" value={winForm.end_date} onChange={e => setWinForm({ ...winForm, end_date: e.target.value })} /></div>
                            <div><Label className="text-xs">Notes</Label><Input value={winForm.notes} onChange={e => setWinForm({ ...winForm, notes: e.target.value })} placeholder="Optional" /></div>
                            <Button size="sm" onClick={() => addWindow(m.id)}><Plus className="h-4 w-4 mr-1" />Add window</Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CustomersTab({ customers, reload }: any) {
  const [form, setForm] = useState({ customer_name: '', account_owner: '', email: '', notes: '' });
  const add = async () => {
    if (!form.customer_name) return toast.error('Name required');
    const { error } = await supabase.from('npi_customers').insert(form);
    if (error) return toast.error(error.message);
    setForm({ customer_name: '', account_owner: '', email: '', notes: '' }); reload();
  };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('npi_customers').delete().eq('id', id); reload(); };
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Customers</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-5 gap-2 items-end">
          <div><Label className="text-xs">Name *</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
          <div><Label className="text-xs">Account owner</Label><Input value={form.account_owner} onChange={e => setForm({ ...form, account_owner: e.target.value })} /></div>
          <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-2" />Add</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Owner</TableHead><TableHead>Email</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {customers.map((c: any) => (
              <TableRow key={c.id}><TableCell className="font-medium">{c.customer_name}</TableCell><TableCell>{c.account_owner || '-'}</TableCell><TableCell>{c.email || '-'}</TableCell><TableCell><Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ProjectsTab({ projects, customers, reload }: any) {
  const [form, setForm] = useState<any>({ project_name: '', customer_id: '', engineer: '', status: 'Active' });
  const add = async () => {
    if (!form.project_name) return toast.error('Name required');
    const customer = customers.find((c: any) => c.id === form.customer_id);
    const { error } = await supabase.from('npi_projects_planning').insert({ ...form, customer_id: form.customer_id || null, customer_name: customer?.customer_name || null });
    if (error) return toast.error(error.message);
    setForm({ project_name: '', customer_id: '', engineer: '', status: 'Active' }); reload();
  };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('npi_projects_planning').delete().eq('id', id); reload(); };
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Projects</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-5 gap-2 items-end">
          <div><Label className="text-xs">Name *</Label><Input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} /></div>
          <div><Label className="text-xs">Customer</Label>
            <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Engineer</Label><Input value={form.engineer} onChange={e => setForm({ ...form, engineer: e.target.value })} /></div>
          <div><Label className="text-xs">Status</Label><Input value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} /></div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-2" />Add</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Customer</TableHead><TableHead>Engineer</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {projects.map((p: any) => (
              <TableRow key={p.id}><TableCell className="font-medium">{p.project_name}</TableCell><TableCell>{p.customer_name || '-'}</TableCell><TableCell>{p.engineer || '-'}</TableCell><TableCell>{p.status}</TableCell><TableCell><Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmailsTab({ recipients, reload }: any) {
  const [form, setForm] = useState<any>({ email: '', name: '', role: 'manager' });
  const add = async () => {
    if (!form.email) return toast.error('Email required');
    const { error } = await supabase.from('npi_email_recipients').insert({ ...form, is_active: true });
    if (error) return toast.error(error.message);
    setForm({ email: '', name: '', role: 'manager' }); reload();
  };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('npi_email_recipients').delete().eq('id', id); reload(); };
  const toggle = async (id: string, active: boolean) => { await supabase.from('npi_email_recipients').update({ is_active: !active }).eq('id', id); reload(); };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Email recipients for change notifications</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Planning Account Owner = TO. Managers / Engineers = CC.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-5 gap-2 items-end">
          <div><Label className="text-xs">Email *</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label className="text-xs">Role</Label>
            <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planning_owner">Planning Account Owner (TO)</SelectItem>
                <SelectItem value="manager">Manager (CC)</SelectItem>
                <SelectItem value="engineer">Engineer (CC)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} className="md:col-start-5"><Plus className="h-4 w-4 mr-2" />Add</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {recipients.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.email}</TableCell>
                <TableCell>{r.name || '-'}</TableCell>
                <TableCell><Badge variant="outline">{r.role}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => toggle(r.id, r.is_active)}>{r.is_active ? 'Yes' : 'No'}</Button></TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarTab({ reload }: any) {
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('npi_planner_settings')
      .select('*').eq('is_active', true)
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    setRow(data || { country_code: 'IE', country_label: 'Ireland', weekend_days: [0, 6], is_active: true });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!row) return;
    const country = COUNTRY_OPTIONS.find(c => c.code === row.country_code);
    const payload = {
      country_code: row.country_code,
      country_label: country?.label || row.country_label,
      weekend_days: row.weekend_days,
      is_active: true,
    };
    const { error } = row.id
      ? await supabase.from('npi_planner_settings').update(payload).eq('id', row.id)
      : await supabase.from('npi_planner_settings').insert(payload);
    if (error) return toast.error(error.message);
    toast.success('Calendar settings saved');
    await reload();
    load();
  };

  const toggleWeekend = (idx: number) => {
    const set = new Set<number>(row.weekend_days || []);
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    setRow({ ...row, weekend_days: Array.from(set).sort((a, b) => a - b) });
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="animate-spin inline" /></div>;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Working calendar</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Used by all allocation, calendar & utilisation calculations. Bank/public holidays for the
          selected country are loaded automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4 max-w-xl">
          <div>
            <Label className="text-xs">Country</Label>
            <Select value={row.country_code} onValueChange={v => setRow({ ...row, country_code: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Weekend days (excluded from working time by default)</Label>
          <div className="flex flex-wrap gap-3 mt-2">
            {WEEKDAY_LABELS.map((lbl, idx) => (
              <label key={idx} className="flex items-center gap-2 border rounded-md px-3 py-1.5 cursor-pointer hover:bg-muted/40">
                <Checkbox
                  checked={(row.weekend_days || []).includes(idx)}
                  onCheckedChange={() => toggleWeekend(idx)}
                />
                <span className="text-sm">{lbl}</span>
              </label>
            ))}
          </div>
        </div>
        <Button onClick={save}>Save calendar settings</Button>
      </CardContent>
    </Card>
  );
}
