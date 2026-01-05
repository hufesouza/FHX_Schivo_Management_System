import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Edit2, Save, X, Loader2, FileText } from 'lucide-react';
import { NPIProjectCharter } from '@/types/npiProject';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CharterEditorProps {
  charter: NPIProjectCharter | null;
  projectId: string;
  projectName: string;
  onUpdate: () => void;
}

export function CharterEditor({ charter, projectId, projectName, onUpdate }: CharterEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  // Form state
  const [projectReference, setProjectReference] = useState('');
  const [projectOwner, setProjectOwner] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [timelinesMilestones, setTimelinesMilestones] = useState('');

  useEffect(() => {
    if (charter) {
      setProjectReference(charter.project_reference || '');
      setProjectOwner(charter.project_owner || '');
      setProjectDescription(charter.project_description || '');
      setPurpose(charter.purpose || '');
      setExpectedOutcome(charter.expected_outcome || '');
      setTimelinesMilestones(charter.timelines_milestones || '');
    }
  }, [charter]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        project_reference: projectReference || null,
        project_owner: projectOwner || null,
        project_description: projectDescription || null,
        purpose: purpose || null,
        expected_outcome: expectedOutcome || null,
        timelines_milestones: timelinesMilestones || null,
        updated_at: new Date().toISOString(),
      };

      if (charter?.id) {
        const { error } = await supabase
          .from('npi_project_charter')
          .update(updates)
          .eq('id', charter.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('npi_project_charter')
          .insert({ ...updates, project_id: projectId });
        
        if (error) throw error;
      }

      toast.success('Charter saved');
      setEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error saving charter:', error);
      toast.error('Failed to save charter');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!charter?.id || !user) return;
    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('npi_project_charter')
        .update({
          is_approved: true,
          approved_date: new Date().toISOString(),
          approved_by_name: profile?.full_name || user.email,
          revision: (charter.revision || 0) + 1,
        })
        .eq('id', charter.id);

      if (error) throw error;
      toast.success('Charter approved');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to approve charter');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = projectReference && projectOwner && projectDescription && purpose && expectedOutcome;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Charter (WD-FRM-0012)
            </CardTitle>
            <CardDescription>
              Revision {charter?.revision || 1} • {charter?.is_approved ? 'Approved' : 'Draft'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {charter?.is_approved && (
              <Badge className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {editing ? (
          <>
            {/* Editable Form */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Reference *</Label>
                <Input 
                  value={projectReference}
                  onChange={(e) => setProjectReference(e.target.value)}
                  placeholder="e.g., NPI-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Project Owner *</Label>
                <Input 
                  value={projectOwner}
                  onChange={(e) => setProjectOwner(e.target.value)}
                  placeholder="Name of project owner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project Description *</Label>
              <Textarea 
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe the project scope, objectives, and deliverables..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Purpose *</Label>
              <Textarea 
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Why is this project being undertaken? What problem does it solve?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Outcome *</Label>
              <Textarea 
                value={expectedOutcome}
                onChange={(e) => setExpectedOutcome(e.target.value)}
                placeholder="What are the expected results and success criteria?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Timelines & Milestones</Label>
              <Textarea 
                value={timelinesMilestones}
                onChange={(e) => setTimelinesMilestones(e.target.value)}
                placeholder="Key dates and milestones for the project..."
                rows={3}
              />
            </div>
          </>
        ) : (
          <>
            {/* Read-only View */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Project Reference</div>
                <div className="font-medium">{projectReference || <span className="text-muted-foreground italic">Not set</span>}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Project Owner</div>
                <div className="font-medium">{projectOwner || <span className="text-muted-foreground italic">Not set</span>}</div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="text-sm text-muted-foreground mb-1">Project Description</div>
              <div className="whitespace-pre-wrap">{projectDescription || <span className="text-muted-foreground italic">Not provided</span>}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Purpose</div>
              <div className="whitespace-pre-wrap">{purpose || <span className="text-muted-foreground italic">Not provided</span>}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Expected Outcome</div>
              <div className="whitespace-pre-wrap">{expectedOutcome || <span className="text-muted-foreground italic">Not provided</span>}</div>
            </div>

            {timelinesMilestones && (
              <div>
                <div className="text-sm text-muted-foreground mb-1">Timelines & Milestones</div>
                <div className="whitespace-pre-wrap">{timelinesMilestones}</div>
              </div>
            )}

            {/* Approval Section */}
            {charter?.is_approved ? (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Charter Approved</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <div>Approved by: {charter.approved_by_name}</div>
                  <div>Date: {charter.approved_date ? new Date(charter.approved_date).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-amber-700 dark:text-amber-400">Charter Pending Approval</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {isComplete 
                        ? 'All required fields are complete. Ready for approval.'
                        : 'Complete all required fields before approval.'}
                    </div>
                  </div>
                  <Button 
                    onClick={handleApprove} 
                    disabled={!isComplete || saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve Charter
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
