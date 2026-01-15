import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Loader2, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { EnquiryStatus } from '@/hooks/useQuotationEnquiries';

interface ReviewApprovalDialogProps {
  enquiryId: string;
  enquiryNo: string;
  taskId?: string;
  onReviewed: () => void;
  trigger?: React.ReactNode;
}

export function ReviewApprovalDialog({
  enquiryId,
  enquiryNo,
  taskId,
  onReviewed,
  trigger
}: ReviewApprovalDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (approved: boolean) => {
    if (!user) return;

    setSubmitting(true);
    try {
      const newStatus: EnquiryStatus = approved ? 'approved' : 'declined';
      
      // Update enquiry status and review info
      const { error: updateError } = await supabase
        .from('quotation_enquiries')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          review_comments: comments || null
        })
        .eq('id', enquiryId);

      if (updateError) throw updateError;

      // Mark the review task as completed if we have one
      if (taskId) {
        const { error: taskError } = await supabase
          .from('quotation_review_tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            comments: comments || null
          })
          .eq('id', taskId);

        if (taskError) {
          console.error('Error updating task:', taskError);
        }
      }

      toast.success(approved ? 'Quotation approved!' : 'Quotation declined');
      setOpen(false);
      setComments('');
      onReviewed();
    } catch (error) {
      console.error('Error processing review:', error);
      toast.error('Failed to process review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Review
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Review Quotation
          </DialogTitle>
          <DialogDescription>
            Review and approve or decline the quotation for {enquiryNo}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Review Comments */}
          <div className="grid gap-2">
            <Label>Review Comments</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your review comments, feedback, or reasons for approval/decline..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button 
            variant="destructive" 
            onClick={() => handleDecision(false)} 
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ThumbsDown className="h-4 w-4 mr-2" />
            )}
            Decline
          </Button>
          <Button 
            onClick={() => handleDecision(true)} 
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ThumbsUp className="h-4 w-4 mr-2" />
            )}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
