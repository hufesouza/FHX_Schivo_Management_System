import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useNPIPlanning, type Part } from '@/hooks/useNPIPlanning';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Users, Plus, Trash2, GripVertical, Search, X } from 'lucide-react';
import {
  KANBAN_STAGES, machineCategory, MACHINE_CATEGORIES, type Setter,
  partStageAnchor, LOOKAHEAD_OPTIONS,
} from './kanbanConfig';

export default function JobKanban() {
  const navigate = useNavigate();
  const { parts, machines, customers, schedule, loading, reload } = useNPIPlanning();

  const [setters, setSetters] = useState<Setter[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');
  const [setterFilter, setSetterFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [lookahead, setLookahead] = useState('90');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [settersOpen, setSettersOpen] = useState(false);

  const loadSetters = useCallback(async () => {
    const { data } = await supabase.from('npi_setters' as any).select('*').order('setter_name');
    setSetters(((data as any) || []) as Setter[]);
  }, []);
  useEffect(() => { loadSetters(); }, [loadSetters]);

  const setterById = useMemo(() => {
    const m = new Map<string, Setter>();
    setters.forEach(s => m.set(s.id, s));
    return m;
  }, [setters]);

  // Earliest scheduled start per part (used by the lookahead filter)
  const startByPart = useMemo(() => {
    const m = new Map<string, number>();
    schedule.forEach(s => {
      if (!s.part_id || s.allocation_status === 'Cancelled') return;
      const t = new Date(s.start_date).getTime();
      const cur = m.get(s.part_id);
      if (cur === undefined || t < cur) m.set(s.part_id, t);
    });
    return m;
  }, [schedule]);

  const horizonEnd = useMemo(() => {
    if (lookahead === 'all') return null;
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() + Number(lookahead));
    return d.getTime();
  }, [lookahead]);

  const visibleMachines = useMemo(() => {
    return machines.filter(m => {
      if (category !== 'all' && machineCategory(m.machine_name, m.machine_type) !== category) return false;
      if (machineFilter !== 'all' && m.id !== machineFilter) return false;
      return true;
    });
  }, [machines, category, machineFilter]);

  const filteredParts = useMemo(() => parts.filter(p => {
    const anyP = p as any;
    if (anyP.overall_status === 'Cancelled') return false;
    if (search && !`${p.part_number} ${p.description || ''} ${p.customer_name || ''} ${p.po || ''}`
      .toLowerCase().includes(search.toLowerCase())) return false;
    if (customerFilter !== 'all' && p.customer_id !== customerFilter) return false;
    if (setterFilter !== 'all') {
      if (setterFilter === 'unassigned' ? !!anyP.setter_id : anyP.setter_id !== setterFilter) return false;
    }
    if (horizonEnd !== null) {
      const anchor = partStageAnchor(p, startByPart.get(p.id));
      if (anchor !== null && anchor > horizonEnd) return false;
    }
    return true;
  }), [parts, search, customerFilter, setterFilter, horizonEnd, startByPart]);

  // rows: machine id -> stage -> parts
  const grid = useMemo(() => {
    const map = new Map<string, Map<string, Part[]>>();
    const rowIds = [...visibleMachines.map(m => m.id), 'unassigned'];
    rowIds.forEach(id => {
      const inner = new Map<string, Part[]>();
      KANBAN_STAGES.forEach(s => inner.set(s.key, []));
      map.set(id, inner);
    });
    filteredParts.forEach(p => {
      const rowId = p.machine_id && map.has(p.machine_id) ? p.machine_id : 'unassigned';
      if (!map.has(rowId)) return;
      if (p.machine_id && !map.has(p.machine_id)) return;
      if (!p.machine_id && (category !== 'all' || machineFilter !== 'all')) return;
      const stage = KANBAN_STAGES.find(s => s.key === (p as any).kanban_stage)?.key || KANBAN_STAGES[0].key;
      map.get(rowId)!.get(stage)!.push(p);
    });
    return map;
  }, [visibleMachines, filteredParts, category, machineFilter]);

  const rows = useMemo(() => {
    const list = visibleMachines.map(m => ({ id: m.id, name: m.machine_name, type: m.machine_type, category: machineCategory(m.machine_name, m.machine_type) }));
    const unassignedCount = filteredParts.filter(p => !p.machine_id).length;
    if (unassignedCount && category === 'all' && machineFilter === 'all') {
      list.push({ id: 'unassigned', name: 'No machine assigned', type: null, category: 'Misc' });
    }
    return list;
  }, [visibleMachines, filteredParts, category, machineFilter]);

  // Setter workload (hours + job count) within the current filters
  const workload = useMemo(() => {
    const acc = new Map<string, { hours: number; jobs: number }>();
    filteredParts.forEach(p => {
      const sid = (p as any).setter_id || 'unassigned';
      const cur = acc.get(sid) || { hours: 0, jobs: 0 };
      cur.hours += Number(p.total_required_time) || 0;
      cur.jobs += 1;
      acc.set(sid, cur);
    });
    const list = [...acc.entries()].map(([id, v]) => ({
      id,
      name: id === 'unassigned' ? 'Unassigned' : (setterById.get(id)?.setter_name || 'Unknown'),
      color: id === 'unassigned' ? '#94a3b8' : (setterById.get(id)?.color || '#94a3b8'),
      ...v,
    }));
    list.sort((a, b) => b.hours - a.hours);
    const max = Math.max(1, ...list.map(l => l.hours));
    return { list, max };
  }, [filteredParts, setterById]);

  const moveToStage = async (partId: string, stage: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part || (part as any).kanban_stage === stage) return;
    setSavingId(partId);
    const { error } = await supabase.from('npi_parts')
      .update({ kanban_stage: stage, stage_updated_at: new Date().toISOString() } as any)
      .eq('id', partId);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${part.part_number} moved to ${stage}`);
    reload();
  };

  const assignSetter = async (partId: string, setterId: string) => {
    const { error } = await supabase.from('npi_parts')
      .update({ setter_id: setterId === 'none' ? null : setterId } as any)
      .eq('id', partId);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  const clearFilters = () => {
    setSearch(''); setCategory('all'); setMachineFilter('all');
    setSetterFilter('all'); setCustomerFilter('all'); setLookahead('90');
  };

  if (loading) {
    return (
      <AppLayout title="Job Kanban" showBackButton backTo="/npi/capacity-planner">
        <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Job Kanban"
      subtitle="Drag jobs across production stages by machine — colours show setter load"
      showBackButton
      backTo="/npi/capacity-planner"
    >
      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1">
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="PN, description, customer, PO…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="w-[170px]">
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Machine section</label>
                <Select value={category} onValueChange={v => { setCategory(v); setMachineFilter('all'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    {MACHINE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[170px]">
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Machine</label>
                <Select value={machineFilter} onValueChange={setMachineFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All machines</SelectItem>
                    {machines
                      .filter(m => category === 'all' || machineCategory(m.machine_name, m.machine_type) === category)
                      .map(m => <SelectItem key={m.id} value={m.id}>{m.machine_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[170px]">
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Setter</label>
                <Select value={setterFilter} onValueChange={setSetterFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All setters</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {setters.map(s => <SelectItem key={s.id} value={s.id}>{s.setter_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[190px]">
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Customer</label>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[170px]">
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Lookahead</label>
                <Select value={lookahead} onValueChange={setLookahead}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOOKAHEAD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="ghost" size="sm" className="h-10" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>

              <SettersDialog
                open={settersOpen}
                setOpen={setSettersOpen}
                setters={setters}
                reload={loadSetters}
              />
            </div>
          </CardContent>
        </Card>

        {/* Setter workload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Setter load ({filteredParts.length} jobs in view)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {workload.list.length === 0 && (
              <p className="text-sm text-muted-foreground">No jobs match the current filters.</p>
            )}
            {workload.list.map(w => (
              <div key={w.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-3 w-3 rounded-full" style={{ background: w.color }} />
                    {w.name}
                  </span>
                  <span className="text-muted-foreground">{w.jobs} jobs · {w.hours.toFixed(0)}h</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${(w.hours / workload.max) * 100}%`, background: w.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Board */}
        <div className="rounded-lg border bg-card overflow-x-auto">
          <div className="min-w-max">
            {/* Header */}
            <div className="flex sticky top-0 z-20 bg-card border-b">
              <div className="w-48 shrink-0 sticky left-0 z-30 bg-card border-r px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Machine
              </div>
              {KANBAN_STAGES.map(s => (
                <div key={s.key} className="w-56 shrink-0 border-r px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    <span className="text-xs font-semibold">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {rows.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No machines match the filters.</div>
            )}

            {rows.map(row => (
              <div key={row.id} className="flex border-b last:border-b-0">
                <div className="w-48 shrink-0 sticky left-0 z-10 bg-card border-r px-3 py-3">
                  <div className="text-sm font-semibold">{row.name}</div>
                  {row.id !== 'unassigned' && (
                    <div className="text-xs text-muted-foreground">
                      {row.category}{row.type ? ` · ${row.type}` : ''}
                    </div>
                  )}
                </div>
                {KANBAN_STAGES.map(stage => {
                  const key = `${row.id}::${stage.key}`;
                  const items = grid.get(row.id)?.get(stage.key) || [];
                  return (
                    <div
                      key={stage.key}
                      onDragOver={e => { e.preventDefault(); setDropKey(key); }}
                      onDragLeave={() => setDropKey(k => (k === key ? null : k))}
                      onDrop={e => {
                        e.preventDefault();
                        setDropKey(null);
                        if (dragId) moveToStage(dragId, stage.key);
                        setDragId(null);
                      }}
                      className={`w-56 shrink-0 border-r p-2 space-y-2 min-h-[110px] transition-colors ${
                        dropKey === key ? 'bg-primary/10' : 'bg-muted/20'
                      }`}
                    >
                      {items.map(p => {
                        const setter = (p as any).setter_id ? setterById.get((p as any).setter_id) : undefined;
                        const color = setter?.color || '#94a3b8';
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={() => setDragId(p.id)}
                            onDragEnd={() => { setDragId(null); setDropKey(null); }}
                            className={`rounded-md border bg-background p-2 shadow-sm cursor-grab active:cursor-grabbing ${
                              dragId === p.id ? 'opacity-50' : ''
                            }`}
                            style={{ borderLeft: `4px solid ${color}` }}
                          >
                            <div className="flex items-start gap-1">
                              <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                              <button
                                className="text-left text-xs font-semibold hover:underline truncate"
                                onClick={() => navigate(`/npi/capacity-planner/parts/${p.id}`)}
                              >
                                {p.part_number}
                              </button>
                              {savingId === p.id && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                            </div>
                            {p.customer_name && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{p.customer_name}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Qty {p.qty ?? '-'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {(Number(p.total_required_time) || 0).toFixed(0)}h
                              </Badge>
                              {p.committed_date && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {new Date(p.committed_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </Badge>
                              )}
                            </div>
                            <Select
                              value={(p as any).setter_id || 'none'}
                              onValueChange={v => assignSetter(p.id, v)}
                            >
                              <SelectTrigger className="h-7 mt-2 text-[11px]">
                                <SelectValue placeholder="Setter" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No setter</SelectItem>
                                {setters.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    <span className="flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                                      {s.setter_name}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

function SettersDialog({
  open, setOpen, setters, reload,
}: { open: boolean; setOpen: (v: boolean) => void; setters: Setter[]; reload: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) { toast.error('Enter a setter name'); return; }
    setBusy(true);
    const { error } = await supabase.from('npi_setters' as any).insert({ setter_name: name.trim(), color } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setName(''); setColor('#3b82f6');
    toast.success('Setter added');
    reload();
  };

  const updateColor = async (id: string, c: string) => {
    const { error } = await supabase.from('npi_setters' as any).update({ color: c } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('npi_setters' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Setter removed');
    reload();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <Users className="h-4 w-4 mr-1" /> Setters
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setters &amp; colours</DialogTitle>
          <DialogDescription>Each setter gets a colour used on the Kanban cards.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {setters.length === 0 && <p className="text-sm text-muted-foreground">No setters yet.</p>}
          {setters.map(s => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
              <input type="color" value={s.color} className="h-8 w-10 rounded border bg-background"
                onChange={e => updateColor(s.id, e.target.value)} />
              <span className="text-sm flex-1">{s.setter_name}</span>
              <Button variant="ghost" size="sm" onClick={() => remove(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter className="sm:justify-start gap-2">
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="h-10 w-12 rounded border bg-background" />
          <Input placeholder="Setter name" value={name} onChange={e => setName(e.target.value)} />
          <Button onClick={add} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Add</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
