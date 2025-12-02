import { useState } from 'react';
import { useUsersByRole } from '@/hooks/useTasks';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface AssignNextReviewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  currentStage: string;
  onSuccess: () => void;
}

const STAGE_TO_NEXT_DEPARTMENT: Record<string, string> = {
  'header': 'engineering',
  'engineering': 'operations',
  'operations': 'quality',
  'quality': 'npi',
  'npi': 'supply_chain',
};

const DEPARTMENT_DISPLAY_NAMES: Record<string, string> = {
  'engineering': 'Engineering',
  'operations': 'Operations',
  'quality': 'Quality',
  'npi': 'NPI',
  'supply_chain': 'Supply Chain',
};

export function AssignNextReviewer({
  open,
  onOpenChange,
  workOrderId,
  currentStage,
  onSuccess,
}: AssignNextReviewerProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getUsersByDepartment, loading } = useUsersByRole();

  const nextDepartment = STAGE_TO_NEXT_DEPARTMENT[currentStage];
  const departmentUsers = nextDepartment ? getUsersByDepartment(nextDepartment) : [];

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error('Please select a reviewer');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('advance-workflow', {
        body: {
          work_order_id: workOrderId,
          current_stage: currentStage,
          next_assignee_id: selectedUser,
        },
      });

      if (error) throw error;

      toast.success('Review assigned and notification sent');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error advancing workflow:', error);
      toast.error('Failed to assign reviewer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!nextDepartment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Section & Assign Next Reviewer</DialogTitle>
          <DialogDescription>
            Select a {DEPARTMENT_DISPLAY_NAMES[nextDepartment]} team member to review next.
            They will receive an email notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reviewer">Next Reviewer ({DEPARTMENT_DISPLAY_NAMES[nextDepartment]})</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : departmentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No users found in {DEPARTMENT_DISPLAY_NAMES[nextDepartment]} department.
                Please contact an admin to add users.
              </p>
            ) : (
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reviewer..." />
                </SelectTrigger>
                <SelectContent>
                  {departmentUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedUser || departmentUsers.length === 0}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Assign & Notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
