import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronRight, ExternalLink, Target, X } from 'lucide-react';
import { format } from 'date-fns';

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

interface ScheduleBoardProps {
  onOpenInGantt: (jobOrPartId: { partId: string | null; jobId: string }) => void;
}

const fmtDate = (d: string | null | undefined) => d ? format(new Date(d), 'd MMM yy') : '—';
const fmtDateTime = (d: string | null | undefined) => d ? format(new Date(d), 'd MMM, HH:mm') : '—';

const riskBadge = (risk: string | null) => {
  const r = risk || 'On Track';
  const v = r === 'Late' ? 'destructive' : r === 'At Risk' ? 'default' : 'secondary';
  return <Badge variant={v as any}>{r}</Badge>;
};

export default function ScheduleBoard({ onOpenInGantt }: ScheduleBoardProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [ops, setOps] = useState<JobOp[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [fCustomer, setFCustomer] = useState('all');
  const [fProject, setFProject] = useState('all');
  const [fDept, setFDept] = useState('all');
  const [fResource, setFResource] = useState('all');
  const [fRisk, setFRisk] = useState('all');
  const [fDue, setFDue] = useState<'all' | 'overdue' | '7' | '30'>('all');

  const load = async () => {
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
  };
  useEffect(() => { load(); }, []);

  const partsById = useMemo(() => new Map(parts.map(p => [p.id, p])), [parts]);
  const resourcesById = useMemo(() => new Map(resources.map(r => [r.id, r])), [resources]);
  const opsByJob = useMemo(() => {
    const m = new Map<string, JobOp[]>();
    ops.forEach(op => {
      const arr = m.get(op.job_id) || [];
      arr.push(op);
      m.set(op.job_id, arr);
    });
    m.forEach(arr => arr.sort((a, b) => (a.sequence_order ?? a.operation_number) - (b.sequence_order ?? b.operation_number)));
    return m;
  }, [ops]);

  // Current operation = first op whose planned_finish is in the future, or first if none
  const currentOpFor = (job: Job): JobOp | null => {
    if (job.status === 'Completed') return null;
    const arr = opsByJob.get(job.id) || [];
    if (!arr.length) return null;
    const now = Date.now();
    const future = arr.find(op => op.planned_finish && new Date(op.planned_finish).getTime() > now);
    return future || arr[0];
  };

  // Filter options
  const customers = useMemo(() => Array.from(new Set(parts.map(p => p.customer).filter(Boolean))).sort() as string[], [parts]);
  const projects = useMemo(() => {
    const list = parts.filter(p => fCustomer === 'all' || p.customer === fCustomer).map(p => p.project).filter(Boolean) as string[];
    return Array.from(new Set(list)).sort();
  }, [parts, fCustomer]);
  const departments = useMemo(() => Array.from(new Set(resources.map(r => r.resource_type).filter(Boolean))).sort() as string[], [resources]);
  const resourceOptions = useMemo(() => resources.filter(r => fDept === 'all' || r.resource_type === fDept), [resources, fDept]);

  // Enriched jobs for the table
  const rows = useMemo(() => {
    return jobs.map(job => {
      const part = job.part_id ? partsById.get(job.part_id) : null;
      const curOp = currentOpFor(job);
      const curResource = curOp?.resource_id ? resourcesById.get(curOp.resource_id) : null;
      return { job, part, curOp, curResource };
    });
  }, [jobs, partsById, resourcesById, opsByJob]);

  const filteredRows = useMemo(() => {
    const now = startOfDay(new Date());
    return rows.filter(({ job, part, curOp, curResource }) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${job.job_number} ${part?.part_number || ''} ${part?.customer || ''} ${part?.project || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fCustomer !== 'all' && part?.customer !== fCustomer) return false;
      if (fProject !== 'all' && part?.project !== fProject) return false;
      if (fDept !== 'all' && curResource?.resource_type !== fDept) return false;
      if (fResource !== 'all' && curOp?.resource_id !== fResource) return false;
      if (fRisk !== 'all' && (job.schedule_risk || 'On Track') !== fRisk) return false;
      if (fDue !== 'all') {
        if (!job.due_date) return false;
        const due = new Date(job.due_date);
        const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
        if (fDue === 'overdue' && days >= 0) return false;
        if (fDue === '7' && (days < 0 || days > 7)) return false;
        if (fDue === '30' && (days < 0 || days > 30)) return false;
      }
      return true;
    });
  }, [rows, search, fCustomer, fProject, fDept, fResource, fRisk, fDue]);

  const clearFilters = () => {
    setSearch(''); setFCustomer('all'); setFProject('all'); setFDept('all'); setFResource('all'); setFRisk('all'); setFDue('all');
  };

  // Resource drilldown tree
  const resourceTree = useMemo(() => {
    const tree = new Map<string, Map<string, { resource: Resource; jobs: Job[] }>>();
    rows.forEach(({ job, curOp, curResource }) => {
      if (!curOp || !curResource) return;
      const dept = curResource.resource_type || 'Unassigned';
      if (!tree.has(dept)) tree.set(dept, new Map());
      const deptMap = tree.get(dept)!;
      const key = curResource.id;
      if (!deptMap.has(key)) deptMap.set(key, { resource: curResource, jobs: [] });
      deptMap.get(key)!.jobs.push(job);
    });
    return tree;
  }, [rows]);

  // Customer drilldown tree
  const customerTree = useMemo(() => {
    const tree = new Map<string, Map<string, Job[]>>();
    rows.forEach(({ job, part }) => {
      const cust = part?.customer || 'No Customer';
      const proj = part?.project || 'No Project';
      if (!tree.has(cust)) tree.set(cust, new Map());
      const projMap = tree.get(cust)!;
      if (!projMap.has(proj)) projMap.set(proj, []);
      projMap.get(proj)!.push(job);
    });
    return tree;
  }, [rows]);

  const renderJobOpsList = (job: Job) => {
    const arr = opsByJob.get(job.id) || [];
    if (!arr.length) return <div className="text-xs text-muted-foreground pl-6 py-1">No operations</div>;
    const curOp = currentOpFor(job);
    return (
      <div className="pl-6 space-y-1 py-1">
        {arr.map(op => {
          const res = op.resource_id ? resourcesById.get(op.resource_id) : null;
          const isCur = curOp?.id === op.id;
          return (
            <div key={op.id} className={`flex items-center gap-2 text-xs ${isCur ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
              <ChevronRight className="h-3 w-3" />
              <span>OP{op.operation_number} {op.operation_name}</span>
              {res && <Badge variant="outline" className="text-[10px]">{res.resource_name}</Badge>}
              {op.planned_start && <span>· {fmtDateTime(op.planned_start)}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Input placeholder="Search job, part…" value={search} onChange={e => setSearch(e.target.value)} className="col-span-2" />
          <Select value={fCustomer} onValueChange={setFCustomer}>
            <SelectTrigger><SelectValue placeholder="Customer" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Customers</SelectItem>{customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fProject} onValueChange={setFProject}>
            <SelectTrigger><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fDept} onValueChange={(v) => { setFDept(v); setFResource('all'); }}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Depts</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fResource} onValueChange={setFResource}>
            <SelectTrigger><SelectValue placeholder="Resource" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Resources</SelectItem>{resourceOptions.map(r => <SelectItem key={r.id} value={r.id}>{r.resource_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fRisk} onValueChange={setFRisk}>
            <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="On Track">On Track</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Late">Late</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fDue} onValueChange={(v) => setFDue(v as any)}>
            <SelectTrigger><SelectValue placeholder="Due" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Due Date</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Clear</Button>
        </CardContent>
      </Card>

      {/* Drill-down navigation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Navigate Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resource">
            <TabsList>
              <TabsTrigger value="resource">By Resource</TabsTrigger>
              <TabsTrigger value="customer">By Customer</TabsTrigger>
            </TabsList>

            <TabsContent value="resource" className="mt-3">
              <Accordion type="multiple" className="w-full">
                {Array.from(resourceTree.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dept, deptMap]) => {
                  const totalJobs = Array.from(deptMap.values()).reduce((sum, r) => sum + r.jobs.length, 0);
                  return (
                    <AccordionItem key={dept} value={`dept-${dept}`}>
                      <AccordionTrigger className="text-sm">
                        <span className="flex items-center gap-2">{dept}<Badge variant="secondary">{totalJobs} jobs</Badge></span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Accordion type="multiple" className="pl-4">
                          {Array.from(deptMap.values()).sort((a, b) => a.resource.resource_name.localeCompare(b.resource.resource_name)).map(({ resource, jobs }) => (
                            <AccordionItem key={resource.id} value={`res-${resource.id}`}>
                              <AccordionTrigger className="text-sm">
                                <span className="flex items-center gap-2">{resource.resource_name}<Badge variant="outline">{jobs.length}</Badge></span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <Accordion type="multiple" className="pl-4">
                                  {jobs.map(job => {
                                    const part = job.part_id ? partsById.get(job.part_id) : null;
                                    return (
                                      <AccordionItem key={job.id} value={`job-${job.id}`}>
                                        <AccordionTrigger className="text-sm">
                                          <span className="flex items-center gap-2">
                                            {job.job_number}
                                            {part && <span className="text-muted-foreground">· {part.part_number}</span>}
                                            {riskBadge(job.schedule_risk)}
                                          </span>
                                        </AccordionTrigger>
                                        <AccordionContent>{renderJobOpsList(job)}</AccordionContent>
                                      </AccordionItem>
                                    );
                                  })}
                                </Accordion>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
                {resourceTree.size === 0 && <div className="text-sm text-muted-foreground p-4">No scheduled jobs yet.</div>}
              </Accordion>
            </TabsContent>

            <TabsContent value="customer" className="mt-3">
              <Accordion type="multiple" className="w-full">
                {Array.from(customerTree.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([cust, projMap]) => {
                  const totalJobs = Array.from(projMap.values()).reduce((sum, j) => sum + j.length, 0);
                  return (
                    <AccordionItem key={cust} value={`cust-${cust}`}>
                      <AccordionTrigger className="text-sm">
                        <span className="flex items-center gap-2">{cust}<Badge variant="secondary">{totalJobs} jobs</Badge></span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Accordion type="multiple" className="pl-4">
                          {Array.from(projMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([proj, projJobs]) => (
                            <AccordionItem key={proj} value={`proj-${cust}-${proj}`}>
                              <AccordionTrigger className="text-sm">
                                <span className="flex items-center gap-2">{proj}<Badge variant="outline">{projJobs.length}</Badge></span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <Accordion type="multiple" className="pl-4">
                                  {projJobs.map(job => {
                                    const part = job.part_id ? partsById.get(job.part_id) : null;
                                    return (
                                      <AccordionItem key={job.id} value={`cjob-${job.id}`}>
                                        <AccordionTrigger className="text-sm">
                                          <span className="flex items-center gap-2">
                                            {job.job_number}
                                            {part && <span className="text-muted-foreground">· {part.part_number}</span>}
                                            {riskBadge(job.schedule_risk)}
                                          </span>
                                        </AccordionTrigger>
                                        <AccordionContent>{renderJobOpsList(job)}</AccordionContent>
                                      </AccordionItem>
                                    );
                                  })}
                                </Accordion>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
                {customerTree.size === 0 && <div className="text-sm text-muted-foreground p-4">No jobs.</div>}
              </Accordion>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jobs · {filteredRows.length} of {rows.length}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Part No</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Planned Date</TableHead>
                <TableHead>Latest Start</TableHead>
                <TableHead>Planned Start</TableHead>
                <TableHead>Planned Finish</TableHead>
                <TableHead>Current Resource</TableHead>
                <TableHead>Current Operation</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">No jobs match your filters</TableCell></TableRow>
              ) : filteredRows.map(({ job, part, curOp, curResource }) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.job_number}</TableCell>
                  <TableCell>{part?.customer || '—'}</TableCell>
                  <TableCell>{part?.project || '—'}</TableCell>
                  <TableCell>{part?.part_number || '—'}</TableCell>
                  <TableCell>{fmtDate(job.due_date)}</TableCell>
                  <TableCell>{fmtDate(job.best_commence_date)}</TableCell>
                  <TableCell>{fmtDate(job.latest_start_date)}</TableCell>
                  <TableCell>{fmtDateTime(job.planned_start)}</TableCell>
                  <TableCell>{fmtDateTime(job.planned_finish)}</TableCell>
                  <TableCell>{curResource?.resource_name || (job.status === 'Completed' ? '—' : '—')}</TableCell>
                  <TableCell>{job.status === 'Completed' ? <Badge variant="secondary">Completed</Badge> : curOp ? `OP${curOp.operation_number} ${curOp.operation_name}` : '—'}</TableCell>
                  <TableCell>{riskBadge(job.schedule_risk)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Open in Gantt" onClick={() => onOpenInGantt({ partId: job.part_id, jobId: job.id })}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {curOp && (
                        <Button size="sm" variant="ghost" title="Jump to current operation" onClick={() => onOpenInGantt({ partId: job.part_id, jobId: job.id })}>
                          <Target className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
