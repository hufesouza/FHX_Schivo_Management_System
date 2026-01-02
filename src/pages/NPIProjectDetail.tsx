import { useParams, useNavigate } from 'react-router-dom';
import { useNPIProjectDetail } from '@/hooks/useNPIProjects';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, CheckCircle, Circle, AlertCircle, Clock } from 'lucide-react';
import { NPI_PHASES, getPhaseInfo, getDepartmentInfo, getTaskStatusInfo, calculatePhaseProgress } from '@/types/npiProject';

export default function NPIProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { project, charter, tasks, milestones, loading } = useNPIProjectDetail(id);

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
          <Button onClick={() => navigate('/npi-projects')}>Back to Projects</Button>
        </div>
      </AppLayout>
    );
  }

  const phaseInfo = getPhaseInfo(project.current_phase);
  const activePhases = NPI_PHASES.filter(p => !['completed', 'on_hold', 'cancelled'].includes(p.value));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  return (
    <AppLayout title={project.project_name} subtitle={project.project_number}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <Button variant="ghost" onClick={() => navigate('/npi-projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Badge className={`${phaseInfo.color} text-white text-lg px-4 py-2`}>{phaseInfo.label}</Badge>
        </div>

        {/* Phase Progress Overview */}
        <Card>
          <CardHeader><CardTitle>Phase Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-9 gap-2">
              {activePhases.map((phase, idx) => {
                const progress = calculatePhaseProgress(tasks, phase.value);
                const isCurrent = project.current_phase === phase.value;
                const isPast = NPI_PHASES.findIndex(p => p.value === project.current_phase) > idx;
                return (
                  <div key={phase.value} className={`text-center p-2 rounded ${isCurrent ? 'ring-2 ring-primary' : ''}`}>
                    <div className={`text-xs font-medium mb-1 ${isPast ? 'text-green-600' : isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {phase.shortLabel}
                    </div>
                    <Progress value={progress.progress_percent} className="h-2" />
                    <div className="text-xs mt-1">{progress.completed_tasks}/{progress.total_tasks}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="charter">Charter</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {activePhases.map(phase => {
              const phaseTasks = tasks.filter(t => t.phase === phase.value);
              if (phaseTasks.length === 0) return null;
              const progress = calculatePhaseProgress(tasks, phase.value);
              
              return (
                <Card key={phase.value}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${phase.color}`} />
                        {phase.label}
                      </CardTitle>
                      <Badge variant={progress.status === 'completed' ? 'default' : 'secondary'}>
                        {progress.progress_percent}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {phaseTasks.map(task => {
                        const dept = getDepartmentInfo(task.owner_department);
                        const statusInfo = getTaskStatusInfo(task.status);
                        return (
                          <div key={task.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                            {getStatusIcon(task.status)}
                            <span className="font-mono text-xs text-muted-foreground w-8">{task.task_code}</span>
                            <span className="flex-1">{task.task_name}</span>
                            <Badge variant="outline" className={dept.color}>{dept.value}</Badge>
                            <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="charter">
            <Card>
              <CardHeader><CardTitle>Project Charter (WD-FRM-0012)</CardTitle></CardHeader>
              <CardContent>
                {charter ? (
                  <div className="space-y-4">
                    <div><strong>Purpose:</strong> {charter.purpose || 'Not defined'}</div>
                    <div><strong>Owner:</strong> {charter.project_owner || 'Not assigned'}</div>
                    <div><strong>Expected Outcome:</strong> {charter.expected_outcome || 'Not defined'}</div>
                    <div><strong>Approved:</strong> {charter.is_approved ? `Yes - ${charter.approved_by_name}` : 'Pending approval'}</div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Charter not created yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones">
            <Card>
              <CardHeader><CardTitle>Project Milestones</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {milestones.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2 border rounded">
                      {getStatusIcon(m.status)}
                      <span className="flex-1">{m.milestone_name}</span>
                      <Badge variant="outline">{getPhaseInfo(m.phase).shortLabel}</Badge>
                      <span className="text-sm text-muted-foreground">{m.target_date || 'No date'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
