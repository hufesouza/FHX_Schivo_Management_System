import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNPIProjectDetail } from '@/hooks/useNPIProjects';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectGanttChart } from '@/components/npi-projects/ProjectGanttChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, Loader2, CheckCircle, Circle, AlertCircle, Clock, ChevronRight, 
  ChevronDown, ExternalLink, FileText, BarChart3, Receipt, ClipboardCheck
} from 'lucide-react';
import { 
  NPI_PHASES, getPhaseInfo, getDepartmentInfo, getTaskStatusInfo, 
  calculatePhaseProgress, canAdvancePhase, NPIPhaseTask, TASK_STATUSES 
} from '@/types/npiProject';

export default function NPIProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    project, charter, tasks, gates, milestones, loading, 
    updateTask, updateProject, advancePhase 
  } = useNPIProjectDetail(id);
  
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);

  if (loading) {
    return (
      <AppLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout title="Project Not Found">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate('/npi/projects')}>Back to Projects</Button>
        </div>
      </AppLayout>
    );
  }

  const phaseInfo = getPhaseInfo(project.current_phase);
  const activePhases = NPI_PHASES.filter(p => !['completed', 'on_hold', 'cancelled'].includes(p.value));
  const currentPhaseIndex = activePhases.findIndex(p => p.value === project.current_phase);
  const displayPhase = selectedPhase || project.current_phase;
  
  // Calculate advancement eligibility
  const { canAdvance, blockers } = canAdvancePhase(project.current_phase, tasks);
  const nextPhase = currentPhaseIndex < activePhases.length - 1 ? activePhases[currentPhaseIndex + 1] : null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'not_applicable': return <Circle className="h-4 w-4 text-slate-400" />;
      default: return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const handleTaskStatusChange = async (task: NPIPhaseTask, newStatus: string) => {
    await updateTask(task.id, { status: newStatus as any });
  };

  const handleQuickComplete = async (task: NPIPhaseTask) => {
    const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
    await updateTask(task.id, { status: newStatus as any });
  };

  const handleAdvancePhase = async () => {
    if (nextPhase && canAdvance) {
      await advancePhase(nextPhase.value);
    }
  };

  const togglePhaseExpanded = (phase: string) => {
    setExpandedPhases(prev => 
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    );
  };

  // Calculate overall progress
  const totalMandatoryTasks = tasks.filter(t => t.is_mandatory).length;
  const completedMandatoryTasks = tasks.filter(t => t.is_mandatory && (t.status === 'completed' || t.status === 'not_applicable')).length;
  const overallProgress = totalMandatoryTasks > 0 ? Math.round((completedMandatoryTasks / totalMandatoryTasks) * 100) : 0;

  return (
    <AppLayout title={project.project_name} subtitle={project.project_number}>
      <div className="space-y-6">
        {/* Header with quick links */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <Button variant="ghost" onClick={() => navigate('/npi/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
          </Button>
          
          <div className="flex flex-wrap gap-2">
            {/* Quick Links to related modules */}
            {project.quotation_reference && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/npi/quotation">
                  <Receipt className="h-4 w-4 mr-2" />
                  Quotation
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
            {project.work_order_number && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/work-order/${project.work_order_number}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Work Order
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/npi/blue-review">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Blue Review
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
            
            <Badge className={`${phaseInfo.color} text-white text-base px-4 py-2`}>
              {phaseInfo.label}
            </Badge>
          </div>
        </div>

        {/* Project Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="font-medium">{project.customer || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">SAP Part</div>
                <div className="font-medium">{project.sap_part_number || 'Pending'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">PO Number</div>
                <div className="font-medium">{project.po_number || 'Pending'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Overall Progress</div>
                <div className="flex items-center gap-2">
                  <Progress value={overallProgress} className="flex-1" />
                  <span className="font-medium">{overallProgress}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart / Timeline */}
        <ProjectGanttChart 
          tasks={tasks}
          milestones={milestones}
          currentPhase={project.current_phase}
          onPhaseClick={(phase) => setSelectedPhase(phase)}
        />

        {/* Phase Advancement Card */}
        {nextPhase && (
          <Card className={canAdvance ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {canAdvance ? '✅ Ready to Advance' : '⏳ Phase Requirements Pending'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {canAdvance 
                      ? `All mandatory tasks in Phase ${project.current_phase.charAt(0)} are complete.`
                      : `${blockers.length} blocking item(s) remaining in Phase ${project.current_phase.charAt(0)}`
                    }
                  </p>
                  {!canAdvance && blockers.length > 0 && (
                    <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400 max-h-24 overflow-y-auto">
                      {blockers.slice(0, 5).map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                      {blockers.length > 5 && <li>• +{blockers.length - 5} more...</li>}
                    </ul>
                  )}
                </div>
                <Button 
                  size="lg"
                  onClick={handleAdvancePhase}
                  disabled={!canAdvance}
                  className={canAdvance ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  Advance to Phase {nextPhase.shortLabel}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="charter">Charter</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {/* Phase filter */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">View phase:</span>
              <Select value={displayPhase} onValueChange={setSelectedPhase}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activePhases.map(phase => (
                    <SelectItem key={phase.value} value={phase.value}>
                      {phase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPhase(null)}>
                Show Current
              </Button>
            </div>

            {/* Tasks by phase */}
            {activePhases.map(phase => {
              const phaseTasks = tasks.filter(t => t.phase === phase.value);
              if (phaseTasks.length === 0) return null;
              if (selectedPhase && phase.value !== selectedPhase) return null;
              
              const progress = calculatePhaseProgress(tasks, phase.value);
              const isExpanded = expandedPhases.includes(phase.value) || phase.value === displayPhase;
              
              return (
                <Collapsible key={phase.value} open={isExpanded} onOpenChange={() => togglePhaseExpanded(phase.value)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${phase.color}`} />
                            {phase.label}
                            {phase.value === project.current_phase && (
                              <Badge variant="default" className="ml-2">Current</Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">
                              {progress.completed_tasks}/{progress.total_tasks} tasks
                            </div>
                            <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                              {progress.progress_percent}%
                            </Badge>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </div>
                        <CardDescription>{phase.description}</CardDescription>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-2">
                          {phaseTasks.map(task => {
                            const dept = getDepartmentInfo(task.owner_department);
                            const statusInfo = getTaskStatusInfo(task.status);
                            return (
                              <div 
                                key={task.id} 
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  task.status === 'completed' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' :
                                  task.status === 'blocked' ? 'bg-red-50 dark:bg-red-950/20 border-red-200' :
                                  task.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200' :
                                  'hover:bg-muted/50'
                                }`}
                              >
                                {/* Quick complete checkbox */}
                                <Checkbox 
                                  checked={task.status === 'completed'}
                                  onCheckedChange={() => handleQuickComplete(task)}
                                  disabled={task.status === 'blocked'}
                                />
                                
                                {/* Task code */}
                                <span className="font-mono text-xs text-muted-foreground w-10">
                                  {task.task_code}
                                </span>
                                
                                {/* Task name and description */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{task.task_name}</div>
                                  {task.description && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Indicators */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {task.is_blocking && (
                                    <Badge variant="destructive" className="text-[10px]">BLOCKING</Badge>
                                  )}
                                  {task.evidence_required && (
                                    <Badge variant="outline" className="text-[10px]">Evidence</Badge>
                                  )}
                                  {task.reference_document && (
                                    <Badge variant="outline" className="text-[10px]">{task.reference_document}</Badge>
                                  )}
                                </div>
                                
                                {/* Department */}
                                <Badge variant="outline" className={`${dept.color} text-xs`}>
                                  {dept.label}
                                </Badge>
                                
                                {/* Status selector */}
                                <Select 
                                  value={task.status} 
                                  onValueChange={(val) => handleTaskStatusChange(task, val)}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(task.status)}
                                      <span className="text-xs">{statusInfo.label}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TASK_STATUSES.map(status => (
                                      <SelectItem key={status.value} value={status.value}>
                                        <div className="flex items-center gap-2">
                                          {getStatusIcon(status.value)}
                                          {status.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </TabsContent>

          <TabsContent value="charter">
            <Card>
              <CardHeader>
                <CardTitle>Project Charter (WD-FRM-0012)</CardTitle>
                <CardDescription>Revision {charter?.revision || 1}</CardDescription>
              </CardHeader>
              <CardContent>
                {charter ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Purpose</div>
                        <div>{charter.purpose || 'Not defined'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Project Owner</div>
                        <div>{charter.project_owner || 'Not assigned'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Expected Outcome</div>
                        <div>{charter.expected_outcome || 'Not defined'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Approval Status</div>
                        <div>
                          {charter.is_approved ? (
                            <Badge className="bg-green-500">Approved by {charter.approved_by_name}</Badge>
                          ) : (
                            <Badge variant="outline">Pending Approval</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {charter.timelines_milestones && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Timelines & Milestones</div>
                        <div className="whitespace-pre-wrap">{charter.timelines_milestones}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Charter not created yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones">
            <Card>
              <CardHeader>
                <CardTitle>Project Milestones</CardTitle>
                <CardDescription>Key deliverables and target dates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {milestones.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No milestones defined</p>
                  ) : (
                    milestones.map(m => {
                      const mPhaseInfo = getPhaseInfo(m.phase);
                      return (
                        <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          {getStatusIcon(m.status)}
                          <span className="flex-1 font-medium">{m.milestone_name}</span>
                          <Badge variant="outline" className={mPhaseInfo.color + ' text-white'}>
                            {mPhaseInfo.shortLabel}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {m.target_date ? new Date(m.target_date).toLocaleDateString() : 'No date'}
                          </span>
                          <Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>
                            {m.status}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
