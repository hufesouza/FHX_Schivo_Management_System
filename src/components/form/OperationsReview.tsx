import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkOrder, WorkCentre } from '@/types/workOrder';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperationsReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
}

const defaultWorkCentre: WorkCentre = {
  workCentre: '',
  progAdequate: null,
  workInstInPlace: null,
  gaugesInPlace: null,
  imsOkSubmitted: null,
  timesCorrect: null,
  initialDate: '',
};

export function OperationsReview({ data, onChange, disabled = false }: OperationsReviewProps) {
  const workCentres = data.operations_work_centres || [];

  const addWorkCentre = () => {
    if (disabled) return;
    onChange({
      operations_work_centres: [...workCentres, { ...defaultWorkCentre }],
    });
  };

  const updateWorkCentre = (index: number, updates: Partial<WorkCentre>) => {
    if (disabled) return;
    const updated = workCentres.map((wc, i) =>
      i === index ? { ...wc, ...updates } : wc
    );
    onChange({ operations_work_centres: updated });
  };

  const removeWorkCentre = (index: number) => {
    if (disabled) return;
    onChange({
      operations_work_centres: workCentres.filter((_, i) => i !== index),
    });
  };

  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Operations Review</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Post Release to Floor'}
        </p>
      </div>

      {/* Work Centres */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Work Centres</Label>
          {!disabled && (
            <Button type="button" variant="outline" size="sm" onClick={addWorkCentre}>
              <Plus className="h-4 w-4 mr-1" /> Add Work Centre
            </Button>
          )}
        </div>

        {workCentres.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">
            No work centres added yet. {!disabled && 'Click "Add Work Centre" to begin.'}
          </p>
        ) : (
          <div className="space-y-4">
            {workCentres.map((wc, index) => (
              <div
                key={index}
                className="p-4 border border-border rounded-lg bg-card space-y-4 animate-fade-in"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 mr-4">
                    <Label>Work Centre</Label>
                    <Input
                      value={wc.workCentre}
                      onChange={(e) =>
                        updateWorkCentre(index, { workCentre: e.target.value })
                      }
                      placeholder="Work centre name"
                      disabled={disabled}
                    />
                  </div>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeWorkCentre(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`prog-${index}`}
                      checked={wc.progAdequate ?? false}
                      onCheckedChange={(checked) =>
                        updateWorkCentre(index, { progAdequate: checked as boolean })
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`prog-${index}`} className="text-sm">
                      Prog. Adequate & Saved
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`work-inst-${index}`}
                      checked={wc.workInstInPlace ?? false}
                      onCheckedChange={(checked) =>
                        updateWorkCentre(index, { workInstInPlace: checked as boolean })
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`work-inst-${index}`} className="text-sm">
                      Work Inst. In Place
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`gauges-${index}`}
                      checked={wc.gaugesInPlace ?? false}
                      onCheckedChange={(checked) =>
                        updateWorkCentre(index, { gaugesInPlace: checked as boolean })
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`gauges-${index}`} className="text-sm">
                      Gauges in Place
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`ims-${index}`}
                      checked={wc.imsOkSubmitted ?? false}
                      onCheckedChange={(checked) =>
                        updateWorkCentre(index, { imsOkSubmitted: checked as boolean })
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`ims-${index}`} className="text-sm">
                      IMS OK & Submitted
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`times-${index}`}
                      checked={wc.timesCorrect ?? false}
                      onCheckedChange={(checked) =>
                        updateWorkCentre(index, { timesCorrect: checked as boolean })
                      }
                      disabled={disabled}
                    />
                    <Label htmlFor={`times-${index}`} className="text-sm">
                      Times Correct
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Initial & Date</Label>
                  <Input
                    value={wc.initialDate}
                    onChange={(e) =>
                      updateWorkCentre(index, { initialDate: e.target.value })
                    }
                    placeholder="Initials and date"
                    disabled={disabled}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Comments */}
      <div className="space-y-2">
        <Label>Additional Comments</Label>
        <Textarea
          value={data.operations_comments || ''}
          onChange={(e) => onChange({ operations_comments: e.target.value })}
          placeholder="Enter any additional comments..."
          rows={4}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          NOTE: IF ACTUAL CYCLE TIME IS SIGNIFICANTLY HIGHER THAN PLANNED, CONTACT THE
          ENGINEERING/NPI TEAM TO ALLOW A REVIEW OF THE JOB PRIOR TO STARTING.
        </p>
      </div>
    </div>
  );
}
