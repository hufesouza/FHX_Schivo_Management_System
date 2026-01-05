import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, Clock, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NPIProjectMilestone, getPhaseInfo } from '@/types/npiProject';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MilestoneEditorProps {
  milestones: NPIProjectMilestone[];
  projectId: string;
  onUpdate: () => void;
}

const MILESTONE_STATUSES = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-slate-500' },
  { value: 'on_track', label: 'On Track', icon: Target, color: 'text-blue-500' },
  { value: 'at_risk', label: 'At Risk', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
  { value: 'missed', label: 'Missed', icon: AlertTriangle, color: 'text-red-500' },
];

export function MilestoneEditor({ milestones, projectId, onUpdate }: MilestoneEditorProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleUpdateMilestone = async (
    milestone: NPIProjectMilestone, 
    updates: Partial<NPIProjectMilestone>
  ) => {
    setSaving(milestone.id);
    try {
      const { error } = await supabase
        .from('npi_project_milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestone.id);

      if (error) throw error;
      toast.success('Milestone updated');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    } finally {
      setSaving(null);
    }
  };

  const handleMarkComplete = async (milestone: NPIProjectMilestone) => {
    await handleUpdateMilestone(milestone, {
      status: 'completed',
      actual_date: new Date().toISOString().split('T')[0],
    });
  };

  const getStatusInfo = (status: string) => {
    return MILESTONE_STATUSES.find(s => s.value === status) || MILESTONE_STATUSES[0];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Milestones</CardTitle>
        <CardDescription>Track key dates and deliverables for each phase</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.map(milestone => {
            const phaseInfo = getPhaseInfo(milestone.phase);
            const statusInfo = getStatusInfo(milestone.status);
            const StatusIcon = statusInfo.icon;
            const isOverdue = milestone.target_date && 
              new Date(milestone.target_date) < new Date() && 
              milestone.status !== 'completed';

            return (
              <div 
                key={milestone.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  milestone.status === 'completed' && "bg-green-50 dark:bg-green-950/20 border-green-200",
                  isOverdue && milestone.status !== 'completed' && "bg-red-50 dark:bg-red-950/20 border-red-200",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={phaseInfo.color}>{phaseInfo.shortLabel}</Badge>
                      <span className="font-medium">{milestone.milestone_name}</span>
                      {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                    </div>
                    
                    {milestone.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{milestone.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Target Date */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[140px] justify-start text-left font-normal",
                            !milestone.target_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {milestone.target_date 
                            ? format(new Date(milestone.target_date), "dd MMM yyyy")
                            : "Set date"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={milestone.target_date ? new Date(milestone.target_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              handleUpdateMilestone(milestone, {
                                target_date: date.toISOString().split('T')[0],
                              });
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Status */}
                    <Select 
                      value={milestone.status}
                      onValueChange={(status) => handleUpdateMilestone(milestone, { status: status as NPIProjectMilestone['status'] })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                          <span className="text-sm">{statusInfo.label}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {MILESTONE_STATUSES.map(s => {
                          const Icon = s.icon;
                          return (
                            <SelectItem key={s.value} value={s.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", s.color)} />
                                {s.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Complete Button */}
                    {milestone.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleMarkComplete(milestone)}
                        disabled={saving === milestone.id}
                      >
                        {saving === milestone.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Actual completion date */}
                {milestone.status === 'completed' && milestone.actual_date && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    Completed: {format(new Date(milestone.actual_date), "dd MMM yyyy")}
                  </div>
                )}
              </div>
            );
          })}

          {milestones.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No milestones defined for this project
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
