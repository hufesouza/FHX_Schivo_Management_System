import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ChevronRight, ExternalLink, X, Search, Users, Briefcase,
  AlertTriangle, CheckCircle2, Clock, ArrowLeft, Cpu, Package, FileText, Layers,
  Workflow, Wrench, Flag, ArrowRight,
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
  sequence_order: number | null; total_time_hours: number | null; setup_time_hours: number | null;
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

type OpStatus = 'Not Started' | 'In Progress' | 'Completed' | 'At Risk' | 'Late';
const opStatusTheme = (s: OpStatus) => {
  switch (s) {
    case 'Completed': return { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/40', chip: 'bg-emerald-500 text-white' };
    case 'In Progress': return { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/40', chip: 'bg-blue-500 text-white' };
    case 'At Risk': return { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/40', chip: 'bg-amber-500 text-white' };
    case 'Late': return { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/40', chip: 'bg-destructive text-white' };
    default: return { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', chip: 'bg-muted text-muted-foreground' };
  }
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

  // Process Flow modal
  const [flowJobId, setFlowJobId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [r, p, j, o] = await Promise.all([
        supabase.from('resources').select('id,resource_name,resource_type,resource_category').eq('status', 'Active'),
        supabase.from('parts').select('id,part_number,revision,customer,project'),
        supabase.from('jobs').select('id,job_number,part_id,quantity,due_date,status,planned_start,planned_finish,schedule_status,best_commence_date,latest_start_date,schedule_risk'),
        supabase.from('job_operations').select('id,job_id,operation_number,operation_name,resource_id,planned_start,planned_finish,sequence_order,total_time_hours,setup_time_hours'),
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
      // Include job under EVERY machine it touches (not just the current op's machine)
      const machineNames = new Set<string>();
      if (a.length === 0) {
        machineNames.add('Unassigned');
      } else {
        a.forEach(op => {
          const res = op.resource_id ? resById.get(op.resource_id) : null;
          machineNames.add(res?.resource_name || 'Unassigned');
        });
      }
      machineNames.forEach(name => {
        if (!m.has(name)) m.set(name, []);
        m.get(name)!.push(job);
      });
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

  // === Op status derivation ===
  const deriveOpStatus = (job: Job, op: JobOp): OpStatus => {
    const now = Date.now();
    const fin = op.planned_finish ? new Date(op.planned_finish).getTime() : null;
    const start = op.planned_start ? new Date(op.planned_start).getTime() : null;
    if (job.status === 'Completed') return 'Completed';
    if (fin && fin <= now) return 'Completed';
    const isCurrent = start != null && start <= now && (!fin || fin > now);
    const risk = job.schedule_risk || 'On Track';
    if (isCurrent) {
      if (risk === 'Late') return 'Late';
      if (risk === 'At Risk') return 'At Risk';
      return 'In Progress';
    }
    return 'Not Started';
  };

  // === Render levels ===
  const renderLevel = () => {
    if (level === 'customer') {
      const entries = Array.from(byCustomer.entries()).sort(([a], [b]) => a.localeCompare(b));
      if (!entries.length) return <EmptyState label="No jobs" />;

      // Delivery lead time per customer — span from earliest planned_start to latest planned_finish
      // across all ops of the customer's jobs (accounts for parallel operations).
      const MS_DAY = 24 * 60 * 60 * 1000;
      const businessDaysBetween = (startMs: number, endMs: number) => {
        if (!isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) return 0;
        const start = new Date(startMs); start.setHours(0, 0, 0, 0);
        const end = new Date(endMs); end.setHours(0, 0, 0, 0);
        let days = 0;
        for (let d = start.getTime(); d <= end.getTime(); d += MS_DAY) {
          const wd = new Date(d).getDay();
          if (wd !== 0 && wd !== 6) days++;
        }
        return days;
      };
      const spanByCustomer = new Map<string, { min: number; max: number }>();
      filteredJobs.forEach(job => {
        const part = job.part_id ? partsById.get(job.part_id) : null;
        const cust = part?.customer || 'No Customer';
        const jobOps = opsByJob.get(job.id) || [];
        jobOps.forEach(op => {
          const s = op.planned_start ? new Date(op.planned_start).getTime() : NaN;
          const f = op.planned_finish ? new Date(op.planned_finish).getTime() : NaN;
          if (!isFinite(s) && !isFinite(f)) return;
          const cur = spanByCustomer.get(cust) || { min: Infinity, max: -Infinity };
          if (isFinite(s)) cur.min = Math.min(cur.min, s);
          if (isFinite(f)) cur.max = Math.max(cur.max, f);
          spanByCustomer.set(cust, cur);
        });
      });
      const leadList = Array.from(spanByCustomer.entries())
        .map(([cust, { min, max }]) => ({ cust, days: businessDaysBetween(min, max), min, max }))
        .filter(x => x.days > 0)
        .sort((a, b) => b.days - a.days);
      const maxDays = leadList.reduce((m, x) => Math.max(m, x.days), 0);
      const fmtDateShort = (ms: number) => isFinite(ms) ? new Date(ms).toLocaleDateString() : '—';

      return (
        <div className="space-y-4">
          {/* Delivery lead time report */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">Delivery Lead Time by Customer</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Working days from first op start to last op finish (parallel ops accounted for)
              </div>
            </div>
            {leadList.length === 0 ? (
              <div className="text-xs text-muted-foreground">No scheduled operations.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {leadList.map(({ cust, days, min, max }) => {
                  const pct = maxDays > 0 ? (days / maxDays) * 100 : 0;
                  return (
                    <div key={cust} className="rounded-lg border bg-background p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium truncate">{cust}</div>
                        <div className="text-xs font-semibold tabular-nums">{days}d</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        {fmtDateShort(min)} → {fmtDateShort(max)}
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {entries.map(([cust, js]) => (
              <Tile key={cust} onClick={() => setDrillCustomer(cust)}
                icon={Users} tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                title={cust}
                subtitle={`${new Set(js.map(j => partsById.get(j.part_id || '')?.project || 'No Project')).size} projects · ${js.length} jobs`}
                counts={countBy(js)} />
            ))}
          </div>
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

      // Hours required per resource across ALL ops of the project's jobs
      const projectJobIds = new Set(
        Array.from(machinesForProject.values()).flat().map(j => j.id)
      );
      const hoursByResource = new Map<string, number>();
      ops.forEach(op => {
        if (!projectJobIds.has(op.job_id)) return;
        const res = op.resource_id ? resById.get(op.resource_id) : null;
        const name = res?.resource_name || 'Unassigned';
        const job = jobs.find(j => j.id === op.job_id);
        const hrs = op.total_time_hours && op.total_time_hours > 0
          ? Number(op.total_time_hours)
          : Number(op.setup_time_hours || 0) + (op.total_time_hours == null
              ? 0
              : 0);
        // Fallback if total_time_hours not set: setup only (cycle/qty unknown here)
        const safe = isFinite(hrs) ? hrs : 0;
        hoursByResource.set(name, (hoursByResource.get(name) || 0) + safe);
        void job;
      });
      const hoursList = Array.from(hoursByResource.entries())
        .sort((a, b) => b[1] - a[1]);
      const totalHrs = hoursList.reduce((s, [, h]) => s + h, 0);
      const fmtH = (h: number) => `${h.toFixed(1)}h${h >= 8 ? ` · ${(h / 8).toFixed(1)}d` : ''}`;

      return (
        <div className="space-y-4">
          {/* Resource hours summary */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold">Resource Hours Required</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Total <span className="font-semibold text-foreground">{fmtH(totalHrs)}</span> across {hoursList.length} resource{hoursList.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {hoursList.map(([name, h]) => {
                const pct = totalHrs > 0 ? (h / totalHrs) * 100 : 0;
                return (
                  <div key={name} className="rounded-lg border bg-background p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium truncate">{name}</div>
                      <div className="text-xs font-semibold tabular-nums">{fmtH(h)}</div>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-cyan-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {entries.map(([machine, js]) => {
              const hrs = hoursByResource.get(machine) || 0;
              return (
                <Tile key={machine} onClick={() => setDrillMachine(machine)}
                  icon={Cpu} tint="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                  title={machine}
                  subtitle={`${js.length} job${js.length === 1 ? '' : 's'} · ${fmtH(hrs)}`}
                  counts={countBy(js)} />
              );
            })}
          </div>
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
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setFlowJobId(job.id)}>
                  <Workflow className="h-3.5 w-3.5 mr-1" />View as Process Flow
                </Button>
                <Button size="sm" onClick={() => onOpenInGantt({ partId: job.part_id, jobId: job.id })}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />Open in Gantt
                </Button>
              </div>
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

  // === Process Flow modal data ===
  const flowJob = flowJobId ? jobs.find(j => j.id === flowJobId) : null;
  const flowPart = flowJob?.part_id ? partsById.get(flowJob.part_id) : null;
  const flowOps = flowJob ? (opsByJob.get(flowJob.id) || []) : [];

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

      {/* Process Flow Modal */}
      <Dialog open={!!flowJobId} onOpenChange={(o) => !o && setFlowJobId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              Process Flow — {flowPart?.part_number || '—'}
              {flowPart?.revision && <Badge variant="outline">Rev {flowPart.revision}</Badge>}
            </DialogTitle>
            <DialogDescription asChild>
              {flowJob ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="font-mono font-medium">{flowJob.job_number}</span>
                  <span>Qty {flowJob.quantity}</span>
                  <span>Due {fmtDate(flowJob.due_date)}</span>
                  <span>Planned {fmtDate(flowJob.planned_start)} → {fmtDate(flowJob.planned_finish)}</span>
                </span>
              ) : <span />}
            </DialogDescription>
          </DialogHeader>

          {flowJob && (
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => { onOpenInGantt({ partId: flowJob.part_id, jobId: flowJob.id }); setFlowJobId(null); }}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />Open in Gantt
              </Button>
            </div>
          )}

          {/* Flow */}
          <div className="mt-3 overflow-x-auto pb-2">
            <div className="flex items-stretch gap-2 min-w-min">
              <FlowBookend
                icon={Wrench}
                title="Development Time"
                subtitle={flowJob?.best_commence_date ? `Until ${fmtDate(flowJob.best_commence_date)}` : 'Pre-production'}
                tint="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30"
              />
              <FlowArrow />

              {flowOps.length === 0 && (
                <div className="flex items-center text-sm text-muted-foreground italic px-4">No operations defined</div>
              )}

              {flowOps.map((op) => {
                const status = deriveOpStatus(flowJob!, op);
                const t = opStatusTheme(status);
                const res = op.resource_id ? resById.get(op.resource_id) : null;
                const dur = (op.total_time_hours ?? 0) + (op.setup_time_hours ?? 0);
                return (
                  <div key={op.id} className="flex items-stretch">
                    <div className={`w-[220px] shrink-0 rounded-xl border-2 ${t.border} ${t.bg} p-3 flex flex-col`}>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold ${t.chip}`}>
                          OP{String(op.operation_number).padStart(2, '0')}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${t.text}`}>{status}</span>
                      </div>
                      <div className="mt-2 text-sm font-semibold leading-tight line-clamp-2">{op.operation_name}</div>
                      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1"><Cpu className="h-3 w-3" /><span className="truncate">{res?.resource_name || 'Unassigned'}</span></div>
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" /><span>{dur ? `${dur.toFixed(1)} h` : '—'}</span></div>
                      </div>
                      <div className="mt-2 border-t pt-2 space-y-0.5 text-[10px] text-muted-foreground">
                        <div><span className="uppercase tracking-wide">Start:</span> <span className="font-medium text-foreground">{fmtDateTime(op.planned_start)}</span></div>
                        <div><span className="uppercase tracking-wide">Finish:</span> <span className="font-medium text-foreground">{fmtDateTime(op.planned_finish)}</span></div>
                      </div>
                    </div>
                    <FlowArrow />
                  </div>
                );
              })}

              <FlowBookend
                icon={Flag}
                title="Completed"
                subtitle={flowJob?.planned_finish ? fmtDate(flowJob.planned_finish) : '—'}
                tint={`${flowJob?.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' : 'bg-muted text-muted-foreground border-border'}`}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="font-medium">Status:</span>
            <LegendDot color="bg-muted-foreground/40" label="Not Started" />
            <LegendDot color="bg-blue-500" label="In Progress" />
            <LegendDot color="bg-emerald-500" label="Completed" />
            <LegendDot color="bg-amber-500" label="At Risk" />
            <LegendDot color="bg-destructive" label="Late" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center px-1 text-muted-foreground">
      <ArrowRight className="h-5 w-5" />
    </div>
  );
}

function FlowBookend({ icon: Icon, title, subtitle, tint }: { icon: any; title: string; subtitle: string; tint: string }) {
  return (
    <div className={`w-[180px] shrink-0 rounded-xl border-2 border-dashed p-3 flex flex-col items-center justify-center text-center ${tint}`}>
      <Icon className="h-6 w-6 mb-1" />
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-[11px] opacity-80 mt-0.5">{subtitle}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
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
