import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { CalendarIcon, Upload, FileText, CheckCircle, Clock, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NPIPhaseTask, TASK_STATUSES, getDepartmentInfo, getTaskStatusInfo } from '@/types/npiProject';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaskDetailSheetProps {
  task: NPIPhaseTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (taskId: string, updates: Partial<NPIPhaseTask>) => Promise<boolean>;
  projectId: string;
}

interface Evidence {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_at: string;
  uploaded_by_name: string | null;
  description: string | null;
}

export function TaskDetailSheet({ task, open, onOpenChange, onUpdate, projectId }: TaskDetailSheetProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  
  // Form state
  const [status, setStatus] = useState(task?.status || 'not_started');
  const [notes, setNotes] = useState(task?.evidence_notes || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.due_date ? new Date(task.due_date) : undefined
  );
  const [ownerName, setOwnerName] = useState(task?.owner_name || '');
  const [evidenceReference, setEvidenceReference] = useState(task?.evidence_reference || '');

  // Load evidence when task changes
  useState(() => {
    if (task?.id) {
      loadEvidence();
    }
  });

  const loadEvidence = async () => {
    if (!task?.id) return;
    setLoadingEvidence(true);
    try {
      const { data, error } = await supabase
        .from('npi_evidence')
        .select('*')
        .eq('task_id', task.id)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      setEvidence(data || []);
    } catch (error) {
      console.error('Error loading evidence:', error);
    } finally {
      setLoadingEvidence(false);
    }
  };

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    
    const updates: Partial<NPIPhaseTask> = {
      status: status as any,
      evidence_notes: notes || null,
      due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
      owner_name: ownerName || null,
      evidence_reference: evidenceReference || null,
    };

    const success = await onUpdate(task.id, updates);
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files?.length) return;
    
    const file = e.target.files[0];
    setUploading(true);

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('npi-evidence')
        .upload(fileName, file);

      if (uploadError) {
        // If bucket doesn't exist, show helpful message
        if (uploadError.message.includes('bucket')) {
          toast.error('Storage bucket not configured. Evidence will be saved as reference only.');
          // Save as reference instead
          await supabase.from('npi_evidence').insert({
            task_id: task.id,
            file_name: file.name,
            file_url: `local:${file.name}`,
            file_type: file.type,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
            uploaded_by_name: 'Current User',
            description: 'File reference (storage pending)',
          });
          await loadEvidence();
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('npi-evidence')
        .getPublicUrl(fileName);

      // Save evidence record
      const { error: insertError } = await supabase.from('npi_evidence').insert({
        task_id: task.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        uploaded_by_name: 'Current User',
      });

      if (insertError) throw insertError;

      toast.success('Evidence uploaded');
      await loadEvidence();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    try {
      const { error } = await supabase
        .from('npi_evidence')
        .delete()
        .eq('id', evidenceId);
      
      if (error) throw error;
      toast.success('Evidence removed');
      await loadEvidence();
    } catch (error) {
      toast.error('Failed to delete evidence');
    }
  };

  const handleMarkComplete = async () => {
    if (!task) return;
    setSaving(true);
    
    const success = await onUpdate(task.id, { 
      status: 'completed',
      evidence_notes: notes || null,
      evidence_reference: evidenceReference || null,
    });
    
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  if (!task) return null;

  const dept = getDepartmentInfo(task.owner_department);
  const statusInfo = getTaskStatusInfo(task.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{task.task_code}</Badge>
            <Badge className={dept.color}>{dept.label}</Badge>
            {task.is_blocking && <Badge variant="destructive">BLOCKING</Badge>}
          </div>
          <SheetTitle className="text-left">{task.task_name}</SheetTitle>
          <SheetDescription className="text-left">
            {task.description || 'No description provided'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Reference Document */}
          {task.reference_document && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Reference:</span>
                <span>{task.reference_document}</span>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      {s.value === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {s.value === 'in_progress' && <Clock className="h-4 w-4 text-blue-500" />}
                      {s.value === 'blocked' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Input 
              value={ownerName} 
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Enter name of person responsible"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Evidence Section */}
          {task.evidence_required && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Evidence Required</Label>
                <Badge variant="outline">{task.evidence_type || 'Document'}</Badge>
              </div>

              {/* Evidence Reference */}
              <div className="space-y-2">
                <Label>Evidence Reference (Document/Link)</Label>
                <Input 
                  value={evidenceReference}
                  onChange={(e) => setEvidenceReference(e.target.value)}
                  placeholder="e.g., DOC-001 Rev A, or URL"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload Evidence File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>

              {/* Uploaded Evidence */}
              {evidence.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Files</Label>
                  <div className="space-y-2">
                    {evidence.map(ev => (
                      <div key={ev.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="text-sm truncate">{ev.file_name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteEvidence(ev.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes / Comments</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or comments about this task..."
              rows={4}
            />
          </div>

          {/* Completion Info */}
          {task.completed_date && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Completed on {format(new Date(task.completed_date), 'PPP')}</span>
              </div>
              {task.completed_by_name && (
                <div className="mt-1 text-muted-foreground">By: {task.completed_by_name}</div>
              )}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="secondary"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
            {status !== 'completed' && (
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleMarkComplete}
                disabled={saving || (task.evidence_required && !evidenceReference && evidence.length === 0)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
