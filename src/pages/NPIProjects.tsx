import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNPIProjects } from '@/hooks/useNPIProjects';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plus, Search, FolderOpen, FileText, Users, Target, Calendar, ChevronRight } from 'lucide-react';
import { PROJECT_PHASES, PROJECT_STATUSES } from '@/types/npiProject';
import { format } from 'date-fns';

const NPIProjects = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { projects, loading, createProject } = useNPIProjects();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: '',
    customer: '',
    description: '',
    project_type: 'simple' as 'simple' | 'complex',
    start_date: '',
    target_completion_date: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleCreateProject = async () => {
    if (!newProject.project_name.trim()) return;

    const result = await createProject({
      ...newProject,
      current_phase: 'planning',
      status: 'active',
      project_manager_id: user?.id || null,
      actual_completion_date: null,
      start_date: newProject.start_date || null,
      target_completion_date: newProject.target_completion_date || null,
      customer: newProject.customer || null,
      description: newProject.description || null,
    });

    if (result) {
      setIsCreateDialogOpen(false);
      setNewProject({
        project_name: '',
        customer: '',
        description: '',
        project_type: 'simple',
        start_date: '',
        target_completion_date: '',
      });
      navigate(`/npi/projects/${result.id}`);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customer?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesPhase = filterPhase === 'all' || p.current_phase === filterPhase;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesPhase && matchesStatus;
  });

  // Group projects by phase for pipeline view
  const projectsByPhase = PROJECT_PHASES.reduce((acc, phase) => {
    acc[phase.value] = filteredProjects.filter(p => p.current_phase === phase.value);
    return acc;
  }, {} as Record<string, typeof filteredProjects>);

  const getPhaseInfo = (phase: string) => PROJECT_PHASES.find(p => p.value === phase);
  const getStatusInfo = (status: string) => PROJECT_STATUSES.find(s => s.value === status);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout title="NPI Projects" subtitle="Project Management System" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {PROJECT_PHASES.map(phase => (
            <Card key={phase.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterPhase(phase.value)}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">{phase.label}</CardDescription>
                <CardTitle className="text-2xl">{projectsByPhase[phase.value]?.length || 0}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`h-1 w-full rounded ${phase.color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {PROJECT_PHASES.map(phase => (
                <SelectItem key={phase.value} value={phase.value}>{phase.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PROJECT_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create NPI Project</DialogTitle>
                <DialogDescription>Start a new product introduction project</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project_name">Project Name *</Label>
                  <Input
                    id="project_name"
                    value={newProject.project_name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, project_name: e.target.value }))}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <Input
                    id="customer"
                    value={newProject.customer}
                    onChange={(e) => setNewProject(prev => ({ ...prev, customer: e.target.value }))}
                    placeholder="Customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_type">Project Type</Label>
                  <Select
                    value={newProject.project_type}
                    onValueChange={(value: 'simple' | 'complex') => setNewProject(prev => ({ ...prev, project_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (Standard NPI)</SelectItem>
                      <SelectItem value="complex">Complex (Major NPI)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {newProject.project_type === 'simple' 
                      ? 'Simple NPI: Minor changes, single part, shorter timeline. Fewer milestones and checkpoints required.'
                      : 'Complex NPI: Multiple parts, significant tooling, extended timeline. Full design transfer checklist and milestone tracking.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_date">Target Completion</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={newProject.target_completion_date}
                      onChange={(e) => setNewProject(prev => ({ ...prev, target_completion_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Project description..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateProject} disabled={!newProject.project_name.trim()}>
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects View */}
        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {PROJECT_PHASES.map(phase => (
                <div key={phase.value} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                    <span className="font-medium text-sm">{phase.label}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {projectsByPhase[phase.value]?.length || 0}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {projectsByPhase[phase.value]?.map(project => (
                      <Card
                        key={project.id}
                        className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                        onClick={() => navigate(`/npi/projects/${project.id}`)}
                      >
                        <CardHeader className="p-3">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium line-clamp-2">
                              {project.project_name}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-xs">
                            {project.project_number}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          {project.customer && (
                            <p className="text-xs text-muted-foreground mb-2">{project.customer}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {project.linked_blue_reviews_count ? (
                              <Badge variant="outline" className="text-xs px-1">
                                {project.linked_blue_reviews_count} BR
                              </Badge>
                            ) : null}
                            {project.linked_pipeline_jobs_count ? (
                              <Badge variant="outline" className="text-xs px-1">
                                {project.linked_pipeline_jobs_count} Jobs
                              </Badge>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {!projectsByPhase[phase.value]?.length && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No projects
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="space-y-3">
              {filteredProjects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No projects found</p>
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filteredProjects.map(project => {
                  const phaseInfo = getPhaseInfo(project.current_phase);
                  const statusInfo = getStatusInfo(project.status);
                  return (
                    <Card
                      key={project.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => navigate(`/npi/projects/${project.id}`)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-12 rounded ${phaseInfo?.color || 'bg-gray-300'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{project.project_name}</h3>
                              <Badge variant="outline" className="text-xs">{project.project_number}</Badge>
                              <Badge variant={project.project_type === 'complex' ? 'default' : 'secondary'} className="text-xs">
                                {project.project_type === 'complex' ? 'Complex' : 'Simple'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {project.customer && <span>{project.customer}</span>}
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {phaseInfo?.label}
                              </span>
                              {project.target_completion_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(project.target_completion_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              {project.linked_blue_reviews_count ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  {project.linked_blue_reviews_count} BR
                                </div>
                              ) : null}
                              {project.linked_pipeline_jobs_count ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  {project.linked_pipeline_jobs_count} Jobs
                                </div>
                              ) : null}
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
};

export default NPIProjects;
