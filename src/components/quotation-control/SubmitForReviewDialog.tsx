import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

interface SubmitForReviewDialogProps {
  enquiryId: string;
  enquiryNo: string;
  totalValue: number;
  averageMargin: number;
  onSubmitted: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function SubmitForReviewDialog({
  enquiryId,
  enquiryNo,
  totalValue,
  averageMargin,
  onSubmitted,
  trigger,
  disabled
}: SubmitForReviewDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch all users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .order('full_name');

      if (error) throw error;

      // Filter out current user
      const filteredUsers = (data || [])
        .filter(u => u.user_id !== user?.id)
        .map(u => ({
          id: u.user_id,
          email: u.email || '',
          full_name: u.full_name
        }));

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedApprover) {
      toast.error('Please select an approver');
      return;
    }

    if (!user) return;

    setSubmitting(true);
    try {
      const approverData = users.find(u => u.id === selectedApprover);
      
      // Update enquiry status and set approver
      const { error: updateError } = await supabase
        .from('quotation_enquiries')
        .update({
          status: 'submitted_for_review',
          approver_id: selectedApprover,
          approver_name: approverData?.full_name || approverData?.email,
          submitted_for_review_at: new Date().toISOString(),
          submitted_by: user.id,
          total_quoted_value: totalValue,
          average_margin: averageMargin
        })
        .eq('id', enquiryId);

      if (updateError) throw updateError;

      // Create review task for the approver
      const { error: taskError } = await supabase
        .from('quotation_review_tasks')
        .insert({
          enquiry_id: enquiryId,
          assigned_to: selectedApprover,
          assigned_by: user.id,
          task_type: 'review',
          comments: comments || null
        });

      if (taskError) throw taskError;

      toast.success(`Submitted for review to ${approverData?.full_name || approverData?.email}`);
      setOpen(false);
      setSelectedApprover('');
      setComments('');
      onSubmitted();
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast.error('Failed to submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button disabled={disabled}>
            <Send className="h-4 w-4 mr-2" />
            Submit for Review
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Submit for Review
          </DialogTitle>
          <DialogDescription>
            Select an approver to review the quotation for {enquiryNo}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Summary Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="font-mono font-bold text-lg">
                €{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Margin</p>
              <p className="font-mono font-bold text-lg">{averageMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Approver Selection */}
          <div className="grid gap-2">
            <Label>Select Approver *</Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : (
              <Select value={selectedApprover} onValueChange={setSelectedApprover}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an approver" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Comments */}
          <div className="grid gap-2">
            <Label>Comments (optional)</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any notes for the approver..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedApprover}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
