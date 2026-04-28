import { useState } from 'react';
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
import { toast } from 'sonner';

export default function PlannerSettings() {
  const { customers, projects, machines, recipients, loading, reload } = useNPIPlanning();

  if (loading) return <AppLayout title="Settings" showBackButton backTo="/npi/capacity-planner"><div className="flex items-center justify-center h-96"><Loader2 className="animate-spin"/></div></AppLayout>;

  return (
    <AppLayout title="Settings" subtitle="Master data & email recipients" showBackButton backTo="/npi/capacity-planner">
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="machines">
          <TabsList>
            <TabsTrigger value="machines">Machines</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="emails">Email recipients</TabsTrigger>
          </TabsList>

          <TabsContent value="machines"><MachinesTab machines={machines} reload={reload} /></TabsContent>
          <TabsContent value="customers"><CustomersTab customers={customers} reload={reload} /></TabsContent>
          <TabsContent value="projects"><ProjectsTab projects={projects} customers={customers} reload={reload} /></TabsContent>
          <TabsContent value="emails"><EmailsTab recipients={recipients} reload={reload} /></TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
}

function MachinesTab({ machines, reload }: any) {
  const [form, setForm] = useState({ machine_name: '', machine_type: '', daily_available_hours: 24, shift_pattern: '', status: 'Available' });
  const add = async () => {
    if (!form.machine_name) return toast.error('Name required');
    const { error } = await supabase.from('npi_machines').insert(form);
    if (error) return toast.error(error.message);
    toast.success('Added'); setForm({ machine_name: '', machine_type: '', daily_available_hours: 24, shift_pattern: '', status: 'Available' }); reload();
  };
  const del = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('npi_machines').delete().eq('id', id); reload(); };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Machines</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-5 gap-2 items-end">
          <div><Label className="text-xs">Name *</Label><Input value={form.machine_name} onChange={e => setForm({ ...form, machine_name: e.target.value })} /></div>
          <div><Label className="text-xs">Type</Label><Input value={form.machine_type} onChange={e => setForm({ ...form, machine_type: e.target.value })} /></div>
          <div><Label className="text-xs">Daily hrs</Label><Input type="number" value={form.daily_available_hours} onChange={e => setForm({ ...form, daily_available_hours: +e.target.value })} /></div>
          <div><Label className="text-xs">Shift pattern</Label><Input value={form.shift_pattern} onChange={e => setForm({ ...form, shift_pattern: e.target.value })} /></div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-2" />Add</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Daily hrs</TableHead><TableHead>Shift</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {machines.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.machine_name}</TableCell>
                <TableCell>{m.machine_type || '-'}</TableCell>
                <TableCell>{m.daily_available_hours}</TableCell>
                <TableCell>{m.shift_pattern || '-'}</TableCell>
                <TableCell>{m.status}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
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
