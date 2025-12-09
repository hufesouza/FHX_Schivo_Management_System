import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MoveJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processOrder: string;
  currentMachine: string;
  currentDuration: number;
  currentStartDate: Date;
  currentPriority: number;
  availableMachines: string[];
  onConfirm: (
    toMachine: string,
    newDuration: number,
    newStartDate: Date,
    newPriority: number,
    reason: string
  ) => void;
}

export function MoveJobDialog({
  open,
  onOpenChange,
  processOrder,
  currentMachine,
  currentDuration,
  currentStartDate,
  currentPriority,
  availableMachines,
  onConfirm,
}: MoveJobDialogProps) {
  const [toMachine, setToMachine] = useState(currentMachine);
  const [newDuration, setNewDuration] = useState(currentDuration.toString());
  const [newStartDate, setNewStartDate] = useState(
    currentStartDate.toISOString().slice(0, 16)
  );
  const [newPriority, setNewPriority] = useState(currentPriority.toString());
  const [reason, setReason] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setToMachine(currentMachine);
      setNewDuration(currentDuration.toString());
      setNewStartDate(currentStartDate.toISOString().slice(0, 16));
      setNewPriority(currentPriority.toString());
      setReason('');
    }
  }, [open, currentMachine, currentDuration, currentStartDate, currentPriority]);

  const handleConfirm = () => {
    onConfirm(
      toMachine,
      parseFloat(newDuration) || 0,
      new Date(newStartDate),
      parseInt(newPriority) || 0,
      reason
    );
    onOpenChange(false);
  };

  const hasChanges =
    toMachine !== currentMachine ||
    parseFloat(newDuration) !== currentDuration ||
    new Date(newStartDate).getTime() !== currentStartDate.getTime() ||
    parseInt(newPriority) !== currentPriority;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Job</DialogTitle>
          <DialogDescription>
            Move process order <strong>{processOrder}</strong> to a different machine
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* From/To Machine */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <div className="font-medium">{currentMachine}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Select value={toMachine} onValueChange={setToMachine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMachines.map((machine) => (
                    <SelectItem key={machine} value={machine}>
                      {machine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              step="0.5"
              min="0"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date & Time</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this job being moved?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {hasChanges && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This change will be preserved when new spreadsheets are uploaded.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!hasChanges}>
            Move Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
