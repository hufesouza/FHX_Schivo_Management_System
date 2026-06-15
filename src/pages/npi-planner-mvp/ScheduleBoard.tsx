import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight, ExternalLink, X, Search, Factory, Users, Briefcase,
  AlertTriangle, CheckCircle2, Clock, ArrowLeft, Cpu, Package,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Resource = { id: string; resource_name: string; resource_type: string | null; resource_category: string | null };
type Part = { id: string; part_number: string; revision: string | null; customer: string | null; project: string | null };
type Job = {
  id: string; job_number: string; part_id: string | null; quantity: number; due_date: string | null;
  status: string; planned_start: string | null; planned_finish: string | null; schedule_status: string;
  best_commence_date: string | null; latest_start_date: string | null; schedule_risk: string | null;
};
type JobOp = {
  id: string; job_id: string; operation_number: number; operation_name: string;
  resource_id: string | null; planned_start: string | null; planned_finish: string | null;
  sequence_order: number | null;
};

interface Props { onOpenInGantt: (j: { partId: string | null; jobId: string }) => void; }

const fmtDate = (d?: string | null) => d ? format(new Date(d), 'd MMM') : '—';
const fmtDateTime = (d?: string | null) => d ? format(new Date(d), 'd MMM HH:mm') : '—';

const riskTheme = (risk?: string | null) => {
  const r = risk || 'On Track';
  if (r === 'Late') return { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/40', dot: 'bg-destructive', icon: AlertTriangle, label: 'Late' };
  if (r === 'At Risk') return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/40', dot: 'bg-amber-500', icon: Clock, label: 'At Risk' };
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-500', icon: CheckCircle2, label: 'On Track' };
};

export default function ScheduleBoard({ onOpenInGantt }: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ops, setOps] = useState<JobOp[]>([]);

  const [search, setSearch] = useState('');
  const [fCustomer, setFCustomer] = useState('all');
  const [fDept, setFDept] = useState('all');
  const [fRisk, setFRisk] = useState('all');
  const [fDue, setFDue] = useState<'all' | 'overdue' | '7' | '30'>('all');

  // Drill state
  const [mode, setMode] = useState<'resource' | 'customer'>('resource');
  const [drillDept, setDrillDept] = useState<string | null>(null);
  const [drillResource, setDrillResource] = useState<string | null>(null);
  const [drillCustomer, setDrillCustomer] = useState<string | null>(null);
  const [drillProject, setDrillProject] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [r, p, j, o] = await Promise.all([
        supabase.from('resources').select('id,resource_name,resource_type,resource_category').eq('status', 'Active'),
        supabase.from('parts').select('id,part_number,revision,customer,project'),
        supabase.from('jobs').select('id,job_number,part_id,quantity,due_date,status,planned_start,planned_finish,schedule_status,best_commence_date,latest_start_date,schedule_risk'),
        supabase.from('job_operations').select('id,job_id,operation_number,operation_name,resource_id,planned_start,planned_finish,sequence_order'),
      ]);
      setResources((r.data as Resource[]) || []);
      setParts((p.data as Part[]) || []);
      setJobs((j.data as Job[]) || []);
      setOps((o.data as JobOp[]) || []);
    })();
  }, []);

  const partsById = useMemo(() => new Map(parts.map(p => [p.id, p])), [parts]);
  const resById = useMemo(() => new Map(resources.map(r => [r.id, r])), [resources]);
  const opsByJob = useMemo(() => {
    const m = new Map<string, JobOp[]>();
    ops.forEach(op => {
      const a = m.get(op.job_id) || [];
      a.push(op); m.set(op.job_id, a);
    });
    m.forEach(a => a.sort((x, y) => (x.sequence_order ?? x.operation_number) - (y.sequence_order ?? y.operation_number)));
    return m;
  }, [ops]);

  const currentOp = (job: Job): JobOp | null => {
    if (job.status === 'Completed') return null;
    const a = opsByJob.get(job.id) || [];
    if (!a.length) return null;
    const now = Date.now();
    return a.find(op => op.planned_finish && new Date(op.planned_finish).getTime() > now) || a[a.length - 1];
  };

  // Apply filters to job set
  const filteredJobs = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    return jobs.filter(job => {
      const part = job.part_id ? partsById.get(job.part_id) : null;
      const cur = currentOp(job);
      const res = cur?.resource_id ? resById.get(cur.resource_id) : null;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${job.job_number} ${part?.part_number || ''} ${part?.customer || ''} ${part?.project || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fCustomer !== 'all' && part?.customer !== fCustomer) return false;
      if (fDept !== 'all' && res?.resource_type !== fDept) return false;
      if (fRisk !== 'all' && (job.schedule_risk || 'On Track') !== fRisk) return false;
      if (fDue !== 'all') {
        if (!job.due_date) return false;
        const d = differenceInDays(new Date(job.due_date), now);
        if (fDue === 'overdue' && d >= 0) return false;
        if (fDue === '7' && (d < 0 || d > 7)) return false;
        if (fDue === '30' && (d < 0 || d > 30)) return false;
      }
      return true;
    });
  }, [jobs, partsById, resById, opsByJob, search, fCustomer, fDept, fRisk, fDue]);

  const customers = useMemo(() => Array.from(new Set(parts.map(p => p.customer).filter(Boolean))).sort() as string[], [parts]);
  const departments = useMemo(() => Array.from(new Set(resources.map(r => r.resource_type).filter(Boolean))).sort() as string[], [resources]);

  // === Tile data builders ===
  type Counts = { total: number; late: number; risk: number; ok: number };
  const countBy = (arr: Job[]): Counts => {
    const c: Counts = { total: arr.length, late: 0, risk: 0, ok: 0 };
    arr.forEach(j => {
      const r = j.schedule_risk || 'On Track';
      if (r === 'Late') c.late++; else if (r === 'At Risk') c.risk++; else c.ok++;
    });
    return c;
  };

  // Group filtered jobs by department -> resource (current op)
  const deptResourceData = useMemo(() => {
    const tree = new Map<string, Map<string, Job[]>>();
    filteredJobs.forEach(job => {
      const cur = currentOp(job);
      const res = cur?.resource_id ? resById.get(cur.resource_id) : null;
      const dept = res?.resource_type || 'Unassigned';
      const rid = res?.id || '__none__';
      if (!tree.has(dept)) tree.set(dept, new Map());
      const dm = tree.get(dept)!;
      if (!dm.has(rid)) dm.set(rid, []);
      dm.get(rid)!.push(job);
    });
    return tree;
  }, [filteredJobs, resById, opsByJob]);

  const custProjectData = useMemo(() => {
    const tree = new Map<string, Map<string, Job[]>>();
    filteredJobs.forEach(job => {
      const part = job.part_id ? partsById.get(job.part_id) : null;
      const c = part?.customer || 'No Customer';
      const p = part?.project || 'No Project';
      if (!tree.has(c)) tree.set(c, new Map());
      const pm = tree.get(c)!;
      if (!pm.has(p)) pm.set(p, []);
      pm.get(p)!.push(job);
    });
    return tree;
  }, [filteredJobs, partsById]);

  const clearFilters = () => { setSearch(''); setFCustomer('all'); setFDept('all'); setFRisk('all'); setFDue('all'); };

  // === Visual sub-components ===
  const RiskBar = ({ counts }: { counts: Counts }) => {
    const t = Math.max(1, counts.total);
    return (
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {counts.ok > 0 && <div className="bg-emerald-500" style={{ width: `${(counts.ok / t) * 100}%` }} />}
        {counts.risk > 0 && <div className="bg-amber-500" style={{ width: `${(counts.risk / t) * 100}%` }} />}
        {counts.late > 0 && <div className="bg-destructive" style={{ width: `${(counts.late / t) * 100}%` }} />}
      </div>
    );
  };

  const StatBlobs = ({ counts }: { counts: Counts }) => (
    <div className="flex items-center gap-2 text-xs font-medium">
      {counts.late > 0 && <span className="inline-flex items-center gap-1 text-destructive"><span className="h-1.5 w-1.5 rounded-full bg-destructive" />{counts.late}</span>}
      {counts.risk > 0 && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{counts.risk}</span>}
      {counts.ok > 0 && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{counts.ok}</span>}
    </div>
  );

  const TileShell = ({ onClick, children, accent }: { onClick?: () => void; children: React.ReactNode; accent?: string }) => (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 ${accent || ''}`}
    >
      {children}
    </button>
  );

  const JobCard = ({ job }: { job: Job }) => {
    const part = job.part_id ? partsById.get(job.part_id) : null;
    const cur = currentOp(job);
    const res = cur?.resource_id ? resById.get(cur.resource_id) : null;
    const theme = riskTheme(job.schedule_risk);
    const Icon = theme.icon;
    const ops = opsByJob.get(job.id) || [];
    const doneIdx = cur ? ops.findIndex(o => o.id === cur.id) : ops.length;
    const progress = ops.length ? Math.round((doneIdx / ops.length) * 100) : 0;
    const open = openJobId === job.id;
    return (
      <div className={`rounded-xl border ${theme.border} bg-card overflow-hidden transition-shadow hover:shadow-md`}>
        <button onClick={() => setOpenJobId(open ? null : job.id)} className="w-full p-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                <span className="font-mono text-sm font-semibold truncate">{job.job_number}</span>
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${theme.bg} ${theme.text}`}>
                  <Icon className="h-3 w-3" />{theme.label}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground truncate">
                {part?.part_number || 'No part'} · Qty {job.quantity}
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
          </div>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Cpu className="h-3 w-3" />{res?.resource_name || '—'}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(job.due_date)}</span>
          </div>

          <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>{cur ? `OP${cur.operation_number} ${cur.operation_name}` : (job.status === 'Completed' ? 'Completed' : 'Not started')}</span>
            <span>{doneIdx}/{ops.length} ops</span>
          </div>
        </button>

        {open && (
          <div className="border-t bg-muted/30 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Info label="Customer" value={part?.customer || '—'} />
              <Info label="Project" value={part?.project || '—'} />
              <Info label="Planned Start" value={fmtDateTime(job.planned_start)} />
              <Info label="Planned Finish" value={fmtDateTime(job.planned_finish)} />
              <Info label="Planned Date" value={fmtDate(job.best_commence_date)} />
              <Info label="Latest Start" value={fmtDate(job.latest_start_date)} />
            </div>

            <div className="space-y-1">
              {ops.map((op, i) => {
                const r = op.resource_id ? resById.get(op.resource_id) : null;
                const isCur = cur?.id === op.id;
                const done = i < doneIdx;
                return (
                  <div key={op.id} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${isCur ? 'border-primary bg-primary/5' : done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${isCur ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {done ? '✓' : op.operation_number}
                    </span>
                    <span className="flex-1 truncate">{op.operation_name}</span>
                    {r && <Badge variant="outline" className="text-[10px]">{r.resource_name}</Badge>}
                    <span className="text-[10px] text-muted-foreground">{fmtDateTime(op.planned_start)}</span>
                  </div>
                );
              })}
              {!ops.length && <div className="text-xs text-muted-foreground">No operations</div>}
            </div>

            <Button size="sm" variant="default" className="w-full" onClick={(e) => { e.stopPropagation(); onOpenInGantt({ partId: job.part_id, jobId: job.id }); }}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />Open in Gantt
            </Button>
          </div>
        )}
      </div>
    );
  };

  // === Breadcrumb ===
  const crumb = () => {
    const parts: { label: string; onClick: () => void }[] = [];
    parts.push({ label: mode === 'resource' ? 'All Departments' : 'All Customers', onClick: () => { setDrillDept(null); setDrillResource(null); setDrillCustomer(null); setDrillProject(null); setOpenJobId(null); } });
    if (mode === 'resource') {
      if (drillDept) parts.push({ label: drillDept, onClick: () => { setDrillResource(null); setOpenJobId(null); } });
      if (drillResource) {
        const r = resById.get(drillResource);
        parts.push({ label: r?.resource_name || '—', onClick: () => { setOpenJobId(null); } });
      }
    } else {
      if (drillCustomer) parts.push({ label: drillCustomer, onClick: () => { setDrillProject(null); setOpenJobId(null); } });
      if (drillProject) parts.push({ label: drillProject, onClick: () => { setOpenJobId(null); } });
    }
    return (
      <div className="flex items-center gap-1.5 text-sm">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <button onClick={p.onClick} className={`hover:text-primary transition-colors ${i === parts.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {p.label}
            </button>
          </span>
        ))}
      </div>
    );
  };

  // === Render level ===
  const renderLevel = () => {
    // Resource flow
    if (mode === 'resource') {
      if (!drillDept) {
        const entries = Array.from(deptResourceData.entries()).sort(([a], [b]) => a.localeCompare(b));
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {entries.map(([dept, resMap]) => {
              const allJobs = Array.from(resMap.values()).flat();
              const c = countBy(allJobs);
              const accent = c.late > 0 ? 'border-destructive/30' : c.risk > 0 ? 'border-amber-500/30' : '';
              return (
                <TileShell key={dept} onClick={() => setDrillDept(dept)} accent={accent}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Factory className="h-5 w-5" />
                      </div>
                      <StatBlobs counts={c} />
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-semibold truncate">{dept}</div>
                      <div className="text-xs text-muted-foreground">{resMap.size} resources · {c.total} jobs</div>
                    </div>
                    <div className="mt-3"><RiskBar counts={c} /></div>
                  </div>
                </TileShell>
              );
            })}
            {entries.length === 0 && <EmptyState label="No scheduled jobs" />}
          </div>
        );
      }
      if (!drillResource) {
        const resMap = deptResourceData.get(drillDept) || new Map();
        const entries = Array.from(resMap.entries()).map(([rid, js]) => ({ rid, res: resById.get(rid), jobs: js as Job[] }))
          .sort((a, b) => (a.res?.resource_name || '').localeCompare(b.res?.resource_name || ''));
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {entries.map(({ rid, res, jobs }) => {
              const c = countBy(jobs);
              const accent = c.late > 0 ? 'border-destructive/30' : c.risk > 0 ? 'border-amber-500/30' : '';
              return (
                <TileShell key={rid} onClick={() => setDrillResource(rid)} accent={accent}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <StatBlobs counts={c} />
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-semibold truncate">{res?.resource_name || 'Unassigned'}</div>
                      <div className="text-xs text-muted-foreground">{c.total} jobs queued</div>
                    </div>
                    <div className="mt-3"><RiskBar counts={c} /></div>
                  </div>
                </TileShell>
              );
            })}
          </div>
        );
      }
      const jobsHere = (deptResourceData.get(drillDept || '')?.get(drillResource) || []) as Job[];
      const sorted = jobsHere.slice().sort((a, b) => {
        const da = a.planned_start ? new Date(a.planned_start).getTime() : Infinity;
        const db = b.planned_start ? new Date(b.planned_start).getTime() : Infinity;
        return da - db;
      });
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map(j => <JobCard key={j.id} job={j} />)}
          {sorted.length === 0 && <EmptyState label="No jobs" />}
        </div>
      );
    }

    // Customer flow
    if (!drillCustomer) {
      const entries = Array.from(custProjectData.entries()).sort(([a], [b]) => a.localeCompare(b));
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {entries.map(([cust, projMap]) => {
            const allJobs = Array.from(projMap.values()).flat();
            const c = countBy(allJobs);
            const accent = c.late > 0 ? 'border-destructive/30' : c.risk > 0 ? 'border-amber-500/30' : '';
            return (
              <TileShell key={cust} onClick={() => setDrillCustomer(cust)} accent={accent}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Users className="h-5 w-5" />
                    </div>
                    <StatBlobs counts={c} />
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-semibold truncate">{cust}</div>
                    <div className="text-xs text-muted-foreground">{projMap.size} projects · {c.total} jobs</div>
                  </div>
                  <div className="mt-3"><RiskBar counts={c} /></div>
                </div>
              </TileShell>
            );
          })}
          {entries.length === 0 && <EmptyState label="No jobs" />}
        </div>
      );
    }
    if (!drillProject) {
      const projMap = custProjectData.get(drillCustomer) || new Map();
      const entries = Array.from(projMap.entries()).sort(([a], [b]) => a.localeCompare(b));
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {entries.map(([proj, js]) => {
            const c = countBy(js as Job[]);
            const accent = c.late > 0 ? 'border-destructive/30' : c.risk > 0 ? 'border-amber-500/30' : '';
            return (
              <TileShell key={proj} onClick={() => setDrillProject(proj)} accent={accent}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <StatBlobs counts={c} />
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-semibold truncate">{proj}</div>
                    <div className="text-xs text-muted-foreground">{c.total} jobs</div>
                  </div>
                  <div className="mt-3"><RiskBar counts={c} /></div>
                </div>
              </TileShell>
            );
          })}
        </div>
      );
    }
    const jobsHere = (custProjectData.get(drillCustomer)?.get(drillProject) || []) as Job[];
    const sorted = jobsHere.slice().sort((a, b) => {
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return da - db;
    });
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map(j => <JobCard key={j.id} job={j} />)}
        {sorted.length === 0 && <EmptyState label="No jobs" />}
      </div>
    );
  };

  // === Global KPIs from filtered set ===
  const kpi = countBy(filteredJobs);
  const canBack = (mode === 'resource' && (drillDept || drillResource)) || (mode === 'customer' && (drillCustomer || drillProject));
  const goBack = () => {
    if (mode === 'resource') {
      if (drillResource) { setDrillResource(null); setOpenJobId(null); }
      else if (drillDept) { setDrillDept(null); setOpenJobId(null); }
    } else {
      if (drillProject) { setDrillProject(null); setOpenJobId(null); }
      else if (drillCustomer) { setDrillCustomer(null); setOpenJobId(null); }
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Package} label="Jobs" value={kpi.total} tint="bg-primary/10 text-primary" />
        <Kpi icon={CheckCircle2} label="On Track" value={kpi.ok} tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <Kpi icon={Clock} label="At Risk" value={kpi.risk} tint="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <Kpi icon={AlertTriangle} label="Late" value={kpi.late} tint="bg-destructive/10 text-destructive" />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search job, part, customer…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={fCustomer} onValueChange={setFCustomer}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Customer" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Customers</SelectItem>{customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fDept} onValueChange={setFDept}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Depts</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fRisk} onValueChange={setFRisk}>
            <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="On Track">On Track</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Late">Late</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fDue} onValueChange={(v) => setFDue(v as any)}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Due" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Due</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Clear</Button>
        </CardContent>
      </Card>

      {/* Drill navigation */}
      <Tabs value={mode} onValueChange={(v) => { setMode(v as any); setDrillDept(null); setDrillResource(null); setDrillCustomer(null); setDrillProject(null); setOpenJobId(null); }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="resource"><Factory className="h-4 w-4 mr-1.5" />By Resource</TabsTrigger>
            <TabsTrigger value="customer"><Users className="h-4 w-4 mr-1.5" />By Customer</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {canBack && (
              <Button variant="outline" size="sm" onClick={goBack}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
            )}
            {crumb()}
          </div>
        </div>

        <TabsContent value="resource" className="mt-4">{renderLevel()}</TabsContent>
        <TabsContent value="customer" className="mt-4">{renderLevel()}</TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tint }: { icon: any; label: string; value: number; tint: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-bold leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <Package className="h-8 w-8 opacity-50" />
      <div className="text-sm">{label}</div>
    </div>
  );
}
