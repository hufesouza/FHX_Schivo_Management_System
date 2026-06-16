import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronRight, ExternalLink, X, Search, Users, Briefcase,
  AlertTriangle, CheckCircle2, Clock, ArrowLeft, Cpu, Package, FileText, Layers,
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

type Level = 'customer' | 'project' | 'machine' | 'job' | 'pn' | 'ops';

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

  // Drill state — Customer → Project → Machine → Job → PN → Operations
  const [drillCustomer, setDrillCustomer] = useState<string | null>(null);
  const [drillProject, setDrillProject] = useState<string | null>(null);
  const [drillMachine, setDrillMachine] = useState<string | null>(null);
  const [drillJob, setDrillJob] = useState<string | null>(null);
  const [drillPart, setDrillPart] = useState<string | null>(null);

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

  type Counts = { total: number; late: number; risk: number; ok: number };
  const countBy = (arr: Job[]): Counts => {
    const c: Counts = { total: arr.length, late: 0, risk: 0, ok: 0 };
    arr.forEach(j => {
      const r = j.schedule_risk || 'On Track';
      if (r === 'Late') c.late++; else if (r === 'At Risk') c.risk++; else c.ok++;
    });
    return c;
  };

  // Determine current level
  const level: Level =
    !drillCustomer ? 'customer'
    : !drillProject ? 'project'
    : !drillMachine ? 'machine'
    : !drillJob ? 'job'
    : !drillPart ? 'pn'
    : 'ops';

  // Grouped data
  const byCustomer = useMemo(() => {
    const m = new Map<string, Job[]>();
    filteredJobs.forEach(job => {
      const part = job.part_id ? partsById.get(job.part_id) : null;
      const c = part?.customer || 'No Customer';
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(job);
    });
    return m;
  }, [filteredJobs, partsById]);

  const projectsForCustomer = useMemo(() => {
    if (!drillCustomer) return new Map<string, Job[]>();
    const m = new Map<string, Job[]>();
    (byCustomer.get(drillCustomer) || []).forEach(job => {
      const part = job.part_id ? partsById.get(job.part_id) : null;
      const p = part?.project || 'No Project';
      if (!m.has(p)) m.set(p, []);
      m.get(p)!.push(job);
    });
    return m;
  }, [byCustomer, drillCustomer, partsById]);

  const machinesForProject = useMemo(() => {
    if (!drillProject) return new Map<string, Job[]>();
    const m = new Map<string, Job[]>();
    (projectsForCustomer.get(drillProject) || []).forEach(job => {
      const a = opsByJob.get(job.id) || [];
      let cur: JobOp | null = null;
      if (job.status !== 'Completed' && a.length) {
        const now = Date.now();
        cur = a.find(op => op.planned_finish && new Date(op.planned_finish).getTime() > now) || a[a.length - 1];
      }
      const res = cur?.resource_id ? resById.get(cur.resource_id) : null;
      const machineName = res?.resource_name || 'Unassigned';
      if (!m.has(machineName)) m.set(machineName, []);
      m.get(machineName)!.push(job);
    });
    return m;
  }, [projectsForCustomer, drillProject, opsByJob, resById]);

  const jobsForMachine = useMemo(() => {
    if (!drillMachine) return [] as Job[];
    return machinesForProject.get(drillMachine) || [];
  }, [machinesForProject, drillMachine]);

  const partsForJob = useMemo(() => {
    if (!drillJob) return [] as Part[];
    const job = jobs.find(j => j.id === drillJob);
    if (!job?.part_id) return [];
    const p = partsById.get(job.part_id);
    return p ? [p] : [];
  }, [jobs, drillJob, partsById]);

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

  const Tile = ({ onClick, icon: Icon, tint, title, subtitle, counts }: {
    onClick: () => void; icon: any; tint: string; title: string; subtitle: string; counts: Counts;
  }) => {
    const accent = counts.late > 0 ? 'border-destructive/30' : counts.risk > 0 ? 'border-amber-500/30' : '';
    return (
      <button
        onClick={onClick}
        className={`group relative overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 ${accent}`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}>
              <Icon className="h-5 w-5" />
            </div>
            <StatBlobs counts={counts} />
          </div>
          <div className="mt-3">
            <div className="text-sm font-semibold truncate">{title}</div>
            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
          </div>
          <div className="mt-3"><RiskBar counts={counts} /></div>
          <ChevronRight className="absolute right-3 bottom-3 h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>
    );
  };

  // === Breadcrumb ===
  const crumb = () => {
    const items: { label: string; onClick: () => void; icon: any }[] = [
      { label: 'Customers', icon: Users, onClick: () => { setDrillCustomer(null); setDrillProject(null); setDrillMachine(null); setDrillJob(null); setDrillPart(null); } },
    ];
    if (drillCustomer) items.push({ label: drillCustomer, icon: Users, onClick: () => { setDrillProject(null); setDrillMachine(null); setDrillJob(null); setDrillPart(null); } });
    if (drillProject) items.push({ label: drillProject, icon: Briefcase, onClick: () => { setDrillMachine(null); setDrillJob(null); setDrillPart(null); } });
    if (drillMachine) items.push({ label: drillMachine, icon: Cpu, onClick: () => { setDrillJob(null); setDrillPart(null); } });
    if (drillJob) {
      const j = jobs.find(jj => jj.id === drillJob);
      items.push({ label: j?.job_number || '—', icon: FileText, onClick: () => { setDrillPart(null); } });
    }
    if (drillPart) {
      const p = partsById.get(drillPart);
      items.push({ label: p?.part_number || '—', icon: Layers, onClick: () => {} });
    }
    return (
      <div className="flex items-center gap-1.5 text-sm flex-wrap">
        {items.map((p, i) => {
          const Icon = p.icon;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <button onClick={p.onClick} className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${i === items.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                <Icon className="h-3.5 w-3.5" />{p.label}
              </button>
            </span>
          );
        })}
      </div>
    );
  };

  const goBack = () => {
    if (drillPart) setDrillPart(null);
    else if (drillJob) setDrillJob(null);
    else if (drillMachine) setDrillMachine(null);
    else if (drillProject) setDrillProject(null);
    else if (drillCustomer) setDrillCustomer(null);
  };

  // === Render levels ===
  const renderLevel = () => {
    if (level === 'customer') {
      const entries = Array.from(byCustomer.entries()).sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) return <EmptyState label="No jobs" />;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {entries.map(([cust, js]) => (
            <Tile key={cust} onClick={() => setDrillCustomer(cust)}
              icon={Users} tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              title={cust}
              subtitle={`${new Set(js.map(j => partsById.get(j.part_id || '')?.project || 'No Project')).size} projects · ${js.length} jobs`}
              counts={countBy(js)} />
          ))}
        </div>
      );
    }
    if (level === 'project') {
      const entries = Array.from(projectsForCustomer.entries()).sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) return <EmptyState label="No projects" />;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {entries.map(([proj, js]) => (
            <Tile key={proj} onClick={() => setDrillProject(proj)}
              icon={Briefcase} tint="bg-orange-500/10 text-orange-600 dark:text-orange-400"
              title={proj}
              subtitle={`${js.length} jobs`}
              counts={countBy(js)} />
          ))}
        </div>
      );
    }
    if (level === 'machine') {
      const entries = Array.from(machinesForProject.entries()).sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) return <EmptyState label="No machines" />;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {entries.map(([machine, js]) => (
            <Tile key={machine} onClick={() => setDrillMachine(machine)}
              icon={Cpu} tint="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
              title={machine}
              subtitle={`${js.length} jobs`}
              counts={countBy(js)} />
          ))}
        </div>
      );
    }
    if (level === 'job') {
      const sorted = jobsForMachine.slice().sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return da - db;
      });
      if (!sorted.length) return <EmptyState label="No jobs" />;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.map(job => {
            const part = job.part_id ? partsById.get(job.part_id) : null;
            const theme = riskTheme(job.schedule_risk);
            return (
              <Tile key={job.id} onClick={() => setDrillJob(job.id)}
                icon={FileText} tint={`${theme.bg} ${theme.text}`}
                title={part?.part_number || 'No part'}
                subtitle={`${job.job_number} · Due ${fmtDate(job.due_date)}`}
                counts={countBy([job])} />
            );
          })}
        </div>
      );
    }
    if (level === 'pn') {
      if (!partsForJob.length) return <EmptyState label="No part linked to this job" />;
      const job = jobs.find(j => j.id === drillJob)!;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {partsForJob.map(p => (
            <Tile key={p.id} onClick={() => setDrillPart(p.id)}
              icon={Layers} tint="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              title={p.part_number}
              subtitle={`${p.revision ? `Rev ${p.revision} · ` : ''}Qty ${job.quantity}`}
              counts={countBy([job])} />
          ))}
        </div>
      );
    }
    // ops
    const job = jobs.find(j => j.id === drillJob)!;
    const part = drillPart ? partsById.get(drillPart) : null;
    const cur = currentOp(job);
    const list = opsByJob.get(job.id) || [];
    const doneIdx = cur ? list.findIndex(o => o.id === cur.id) : list.length;
    const theme = riskTheme(job.schedule_risk);
    const Icon = theme.icon;
    return (
      <div className="space-y-4">
        {/* Header card for job + PN */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold">{job.job_number}</span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${theme.bg} ${theme.text}`}>
                    <Icon className="h-3 w-3" />{theme.label}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {part?.part_number}{part?.revision ? ` · Rev ${part.revision}` : ''} · Qty {job.quantity}
                </div>
              </div>
              <Button size="sm" onClick={() => onOpenInGantt({ partId: job.part_id, jobId: job.id })}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />Open in Gantt
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Info label="Due" value={fmtDate(job.due_date)} />
              <Info label="Planned Start" value={fmtDateTime(job.planned_start)} />
              <Info label="Planned Finish" value={fmtDateTime(job.planned_finish)} />
              <Info label="Latest Start" value={fmtDate(job.latest_start_date)} />
            </div>
            <div className="mt-3">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${list.length ? (doneIdx / list.length) * 100 : 0}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{doneIdx} of {list.length} operations done</div>
            </div>
          </CardContent>
        </Card>

        {/* Operations list */}
        <div className="space-y-2">
          {list.map((op, i) => {
            const r = op.resource_id ? resById.get(op.resource_id) : null;
            const isCur = cur?.id === op.id;
            const done = i < doneIdx;
            return (
              <div key={op.id} className={`flex items-center gap-3 rounded-lg border p-3 ${isCur ? 'border-primary bg-primary/5' : done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card'}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCur ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {done ? '✓' : op.operation_number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{op.operation_name}</div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-2 mt-0.5">
                    {r && <span className="inline-flex items-center gap-1"><Cpu className="h-3 w-3" />{r.resource_name}</span>}
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDateTime(op.planned_start)} → {fmtDateTime(op.planned_finish)}</span>
                  </div>
                </div>
                {isCur && <Badge>Current</Badge>}
              </div>
            );
          })}
          {!list.length && <EmptyState label="No operations" />}
        </div>
      </div>
    );
  };

  const kpi = countBy(filteredJobs);
  const canBack = !!(drillCustomer || drillProject || drillMachine || drillJob || drillPart);

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

      {/* Drill nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {canBack && (
            <Button variant="outline" size="sm" onClick={goBack}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          )}
          {crumb()}
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          Customer → Project → Machine → Job → PN → Operations
        </div>
      </div>

      <div>{renderLevel()}</div>
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
