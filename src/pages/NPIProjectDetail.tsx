import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNPIProjectDetail } from '@/hooks/useNPIProjects';
import { useResourceConfigurations } from '@/hooks/useResourceConfigurations';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, FileText, Users, Target, Calendar, CheckCircle2, 
  Circle, Clock, AlertCircle, Save, Plus, Trash2, ChevronRight, Link2, UserPlus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PROJECT_PHASES, DESIGN_TRANSFER_CATEGORIES, type NPIDesignTransferItem, type NPIProjectMilestone } from '@/types/npiProject';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LinkItemsDialog } from '@/components/npi-pipeline/LinkItemsDialog';
import { ExportNPIProjectPDF } from '@/components/npi-projects/ExportNPIProjectPDF';
import { DesignTransferItemRow } from '@/components/npi-projects/DesignTransferItemRow';

const NPIProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { 
    project, charter, designTransferItems, team, milestones, loading,
    updateCharter, updateDesignTransferItem, updateMilestone, fetchProject,
    linkNPIJob, unlinkNPIJob, linkBlueReview, unlinkBlueReview,
    addTeamMember, removeTeamMember
  } = useNPIProjectDetail(id);
  const { configurations: resources } = useResourceConfigurations();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');

  const [charterForm, setCharterForm] = useState({
    scope: '',
    objectives: '',
    deliverables: '',
    success_criteria: '',
    constraints: '',
    assumptions: '',
    risks: '',
    budget_notes: '',
  });
  const [charterSaving, setCharterSaving] = useState(false);
  const [profiles, setProfiles] = useState<{ user_id: string; email: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
    // NPI Projects only available to specific user
    if (!authLoading && user && user.email !== 'hferreira@schivomedical.com') {
      navigate('/npi');
    }
  }, [isAuthenticated, authLoading, user, navigate]);

  useEffect(() => {
    if (charter) {
      setCharterForm({
        scope: charter.scope || '',
        objectives: charter.objectives || '',
        deliverables: charter.deliverables || '',
        success_criteria: charter.success_criteria || '',
        constraints: charter.constraints || '',
        assumptions: charter.assumptions || '',
        risks: charter.risks || '',
        budget_notes: charter.budget_notes || '',
      });
    }
  }, [charter]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from('profiles').select('user_id, email, full_name');
      if (data) setProfiles(data);
    };
    fetchProfiles();
  }, []);

  const handleSaveCharter = async () => {
    setCharterSaving(true);
    await updateCharter(charterForm);
    setCharterSaving(false);
  };

  const handleAddMember = async () => {
    if (!newMemberUserId || !newMemberRole) return;
    const success = await addTeamMember(newMemberUserId, newMemberRole);
    if (success) {
      setAddMemberOpen(false);
      setNewMemberUserId('');
      setNewMemberRole('');
    }
  };

  const handleItemStatusChange = async (item: NPIDesignTransferItem, newStatus: string) => {
    await updateDesignTransferItem(item.id, { 
      status: newStatus as NPIDesignTransferItem['status'],
      completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
    });
  };

  const handleItemNotesChange = async (item: NPIDesignTransferItem, notes: string) => {
    await updateDesignTransferItem(item.id, { notes });
  };

  const handleItemOwnerChange = async (item: NPIDesignTransferItem, ownerName: string) => {
    await updateDesignTransferItem(item.id, { owner_name: ownerName });
  };

  const handleItemDueDateChange = async (item: NPIDesignTransferItem, dueDate: string) => {
    await updateDesignTransferItem(item.id, { due_date: dueDate || null });
  };

  const handleMilestoneStatusChange = async (milestone: NPIProjectMilestone, newStatus: string) => {
    await updateMilestone(milestone.id, { 
      status: newStatus as NPIProjectMilestone['status'],
      actual_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
    });
  };

  const getPhaseInfo = (phase: string) => PROJECT_PHASES.find(p => p.value === phase);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'delayed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'not_applicable': return <Circle className="h-4 w-4 text-gray-400" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Calculate progress
  const completedItems = designTransferItems.filter(i => i.status === 'completed' || i.status === 'not_applicable').length;
  const totalItems = designTransferItems.length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Group items by phase
  const itemsByPhase = designTransferItems.reduce((acc, item) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, NPIDesignTransferItem[]>);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <AppLayout title="Project Not Found" showBackButton backTo="/npi/projects">
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">The requested project could not be found.</p>
          <Button className="mt-4" onClick={() => navigate('/npi/projects')}>
            Back to Projects
          </Button>
        </main>
      </AppLayout>
    );
  }

  const phaseInfo = getPhaseInfo(project.current_phase);

  return (
    <AppLayout 
      title={project.project_name} 
      subtitle={`${project.project_number} • ${project.customer || 'No Customer'}`}
      showBackButton 
      backTo="/npi/projects"
    >
      <main className="container mx-auto px-4 py-6">
        {/* Header Info */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant={project.project_type === 'complex' ? 'default' : 'secondary'}>
            {project.project_type === 'complex' ? 'Complex Project' : 'Simple Project'}
          </Badge>
          <Badge className={phaseInfo?.color}>
            {phaseInfo?.label}
          </Badge>
          <Badge variant={project.status === 'active' ? 'outline' : 'secondary'}>
            {project.status}
          </Badge>
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress:</span>
              <Progress value={progressPercent} className="w-32 h-2" />
              <span className="text-sm font-medium">{progressPercent}%</span>
            </div>
            <ExportNPIProjectPDF project={{
              ...project,
              charter,
              team,
              milestones,
              design_transfer_items: designTransferItems
            }} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charter">Charter</TabsTrigger>
            <TabsTrigger value="checklist">Design Transfer</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Project Number</p>
                      <p className="font-medium">{project.project_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Customer</p>
                      <p className="font-medium">{project.customer || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Completion</p>
                      <p className="font-medium">
                        {project.target_completion_date ? format(new Date(project.target_completion_date), 'MMM d, yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Project Manager</p>
                      <p className="font-medium">
                        {team.find(m => m.role.toLowerCase().includes('project manager') || m.role.toLowerCase() === 'pm')?.full_name 
                          || team.find(m => m.role.toLowerCase().includes('project manager') || m.role.toLowerCase() === 'pm')?.email 
                          || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{project.project_type}</p>
                    </div>
                  </div>
                  {project.description && (
                    <div className="pt-2 border-t">
                      <p className="text-muted-foreground text-sm mb-1">Description</p>
                      <p className="text-sm">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Phase Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['planning', 'execution', 'process_qualification'].map((phase, index) => {
                      const items = itemsByPhase[phase] || [];
                      const completed = items.filter(i => i.status === 'completed' || i.status === 'not_applicable').length;
                      const percent = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
                      const phaseData = PROJECT_PHASES.find(p => p.value === phase);
                      const isCurrent = project.current_phase === phase;
                      
                      return (
                        <div key={phase} className={`p-3 rounded-lg border ${isCurrent ? 'border-primary bg-primary/5' : ''}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${phaseData?.color}`} />
                              <span className="font-medium text-sm">{phaseData?.label}</span>
                              {isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                            </div>
                            <span className="text-sm text-muted-foreground">{completed}/{items.length}</span>
                          </div>
                          <Progress value={percent} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Linked Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Linked Items</CardTitle>
                  <CardDescription>Blue Reviews and NPI Pipeline jobs connected to this project</CardDescription>
                </div>
                <Button onClick={() => setLinkDialogOpen(true)} size="sm">
                  <Link2 className="h-4 w-4 mr-2" />
                  Link Items
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <p className="font-medium">Blue Reviews</p>
                    </div>
                    <p className="text-2xl font-bold">{project.linked_blue_reviews_count || 0}</p>
                    <p className="text-sm text-muted-foreground">linked reviews</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="h-5 w-5 text-green-500" />
                      <p className="font-medium">NPI Pipeline</p>
                    </div>
                    <p className="text-2xl font-bold">{project.linked_pipeline_jobs_count || 0}</p>
                    <p className="text-sm text-muted-foreground">linked jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charter Tab */}
          <TabsContent value="charter">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Charter (WD-FRM-0012)</CardTitle>
                  <CardDescription>Define project scope, objectives, and success criteria</CardDescription>
                </div>
                <Button onClick={handleSaveCharter} disabled={charterSaving}>
                  {charterSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Charter
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scope">Scope</Label>
                    <Textarea
                      id="scope"
                      value={charterForm.scope}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, scope: e.target.value }))}
                      placeholder="Define the project scope..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objectives">Objectives</Label>
                    <Textarea
                      id="objectives"
                      value={charterForm.objectives}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, objectives: e.target.value }))}
                      placeholder="List project objectives..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliverables">Deliverables</Label>
                    <Textarea
                      id="deliverables"
                      value={charterForm.deliverables}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, deliverables: e.target.value }))}
                      placeholder="Expected deliverables..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="success_criteria">Success Criteria</Label>
                    <Textarea
                      id="success_criteria"
                      value={charterForm.success_criteria}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, success_criteria: e.target.value }))}
                      placeholder="How will success be measured..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="constraints">Constraints</Label>
                    <Textarea
                      id="constraints"
                      value={charterForm.constraints}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, constraints: e.target.value }))}
                      placeholder="Known constraints..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assumptions">Assumptions</Label>
                    <Textarea
                      id="assumptions"
                      value={charterForm.assumptions}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, assumptions: e.target.value }))}
                      placeholder="Project assumptions..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="risks">Risks</Label>
                    <Textarea
                      id="risks"
                      value={charterForm.risks}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, risks: e.target.value }))}
                      placeholder="Identified risks..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget_notes">Budget Notes</Label>
                    <Textarea
                      id="budget_notes"
                      value={charterForm.budget_notes}
                      onChange={(e) => setCharterForm(prev => ({ ...prev, budget_notes: e.target.value }))}
                      placeholder="Budget considerations..."
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Design Transfer Checklist Tab */}
          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Design Transfer Checklist (WD-FRM-0013)</CardTitle>
                <CardDescription>Track all design transfer deliverables through each phase</CardDescription>
              </CardHeader>
              <CardContent>
                {['planning', 'execution', 'process_qualification'].map(phase => {
                  const phaseData = PROJECT_PHASES.find(p => p.value === phase);
                  const items = itemsByPhase[phase] || [];
                  
                  return (
                    <div key={phase} className="mb-8 last:mb-0">
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full ${phaseData?.color}`} />
                        <h3 className="font-semibold">{phaseData?.label} Phase</h3>
                        <Badge variant="outline" className="ml-2">
                          {items.filter(i => i.status === 'completed' || i.status === 'not_applicable').length}/{items.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {items.map(item => (
                          <DesignTransferItemRow
                            key={item.id}
                            item={item}
                            resources={resources}
                            onStatusChange={handleItemStatusChange}
                            onNotesChange={handleItemNotesChange}
                            onOwnerChange={handleItemOwnerChange}
                            onDueDateChange={handleItemDueDateChange}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <Card>
              <CardHeader>
                <CardTitle>Project Milestones & Gate Reviews</CardTitle>
                <CardDescription>Track key project milestones and gate approvals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones.map((milestone, index) => {
                    const phaseData = PROJECT_PHASES.find(p => p.value === milestone.phase);
                    return (
                      <div key={milestone.id} className="flex items-center gap-4 p-4 rounded-lg border">
                        <div className="flex flex-col items-center">
                          {getStatusIcon(milestone.status)}
                          {index < milestones.length - 1 && (
                            <div className="w-px h-8 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{milestone.milestone_name}</h4>
                            <Badge variant="outline" className="text-xs">{phaseData?.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {milestone.target_date && (
                              <span>Target: {format(new Date(milestone.target_date), 'MMM d, yyyy')}</span>
                            )}
                            {milestone.actual_date && (
                              <span className="text-green-600">
                                Completed: {format(new Date(milestone.actual_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Select
                          value={milestone.status}
                          onValueChange={(value) => handleMilestoneStatusChange(milestone, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="delayed">Delayed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Team</CardTitle>
                  <CardDescription>Team members assigned to this project</CardDescription>
                </div>
                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={newMemberUserId} onValueChange={setNewMemberUserId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles
                              .filter(p => !team.some(t => t.user_id === p.user_id))
                              .map(profile => (
                                <SelectItem key={profile.user_id} value={profile.user_id}>
                                  {profile.full_name || profile.email}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input 
                          placeholder="e.g. Project Manager, Engineer, QA Lead"
                          value={newMemberRole}
                          onChange={(e) => setNewMemberRole(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddMember} className="w-full" disabled={!newMemberUserId || !newMemberRole}>
                        Add Member
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No team members assigned yet</p>
                  ) : (
                    team.map(member => (
                      <div key={member.id} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{member.full_name || member.email}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                        {member.responsibilities && (
                          <p className="text-sm text-muted-foreground max-w-xs truncate">
                            {member.responsibilities}
                          </p>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeTeamMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <LinkItemsDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          projectId={id!}
          onLinkNPIJob={linkNPIJob}
          onUnlinkNPIJob={unlinkNPIJob}
          onLinkBlueReview={linkBlueReview}
          onUnlinkBlueReview={unlinkBlueReview}
        />
      </main>
    </AppLayout>
  );
};

export default NPIProjectDetail;
