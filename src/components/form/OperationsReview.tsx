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
  timesCorrectPlan: '',
  timesCorrectActual: '',
  initialDate: '',
};

interface WorkCentreTableProps {
  title: string;
  workCentres: WorkCentre[];
  onAdd: () => void;
  onUpdate: (index: number, updates: Partial<WorkCentre>) => void;
  onRemove: (index: number) => void;
  disabled: boolean;
}

function WorkCentreTable({ title, workCentres, onAdd, onUpdate, onRemove, disabled }: WorkCentreTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{title}</Label>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
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
                    onChange={(e) => onUpdate(index, { workCentre: e.target.value })}
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
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`prog-${title}-${index}`}
                    checked={wc.progAdequate ?? false}
                    onCheckedChange={(checked) => onUpdate(index, { progAdequate: checked as boolean })}
                    disabled={disabled}
                  />
                  <Label htmlFor={`prog-${title}-${index}`} className="text-sm">
                    Prog. Adequate & Saved
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`work-inst-${title}-${index}`}
                    checked={wc.workInstInPlace ?? false}
                    onCheckedChange={(checked) => onUpdate(index, { workInstInPlace: checked as boolean })}
                    disabled={disabled}
                  />
                  <Label htmlFor={`work-inst-${title}-${index}`} className="text-sm">
                    Work Inst. In Place
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`gauges-${title}-${index}`}
                    checked={wc.gaugesInPlace ?? false}
                    onCheckedChange={(checked) => onUpdate(index, { gaugesInPlace: checked as boolean })}
                    disabled={disabled}
                  />
                  <Label htmlFor={`gauges-${title}-${index}`} className="text-sm">
                    Gauges in Place
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`ims-${title}-${index}`}
                    checked={wc.imsOkSubmitted ?? false}
                    onCheckedChange={(checked) => onUpdate(index, { imsOkSubmitted: checked as boolean })}
                    disabled={disabled}
                  />
                  <Label htmlFor={`ims-${title}-${index}`} className="text-sm">
                    IMS OK & Submitted
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Times Correct - Plan</Label>
                  <Input
                    value={wc.timesCorrectPlan || ''}
                    onChange={(e) => onUpdate(index, { timesCorrectPlan: e.target.value })}
                    placeholder="Planned time"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Times Correct - Actual</Label>
                  <Input
                    value={wc.timesCorrectActual || ''}
                    onChange={(e) => onUpdate(index, { timesCorrectActual: e.target.value })}
                    placeholder="Actual time"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial & Date</Label>
                  <Input
                    value={wc.initialDate}
                    onChange={(e) => onUpdate(index, { initialDate: e.target.value })}
                    placeholder="Initials and date"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OperationsReview({ data, onChange, disabled = false }: OperationsReviewProps) {
  const machiningWorkCentres = data.operations_work_centres || [];
  const postProcessWorkCentres = data.post_process_work_centres || [];

  // Machining Operations handlers
  const addMachiningWorkCentre = () => {
    if (disabled) return;
    onChange({
      operations_work_centres: [...machiningWorkCentres, { ...defaultWorkCentre }],
    });
  };

  const updateMachiningWorkCentre = (index: number, updates: Partial<WorkCentre>) => {
    if (disabled) return;
    const updated = machiningWorkCentres.map((wc, i) =>
      i === index ? { ...wc, ...updates } : wc
    );
    onChange({ operations_work_centres: updated });
  };

  const removeMachiningWorkCentre = (index: number) => {
    if (disabled) return;
    onChange({
      operations_work_centres: machiningWorkCentres.filter((_, i) => i !== index),
    });
  };

  // Post Process Operations handlers
  const addPostProcessWorkCentre = () => {
    if (disabled) return;
    onChange({
      post_process_work_centres: [...postProcessWorkCentres, { ...defaultWorkCentre }],
    });
  };

  const updatePostProcessWorkCentre = (index: number, updates: Partial<WorkCentre>) => {
    if (disabled) return;
    const updated = postProcessWorkCentres.map((wc, i) =>
      i === index ? { ...wc, ...updates } : wc
    );
    onChange({ post_process_work_centres: updated });
  };

  const removePostProcessWorkCentre = (index: number) => {
    if (disabled) return;
    onChange({
      post_process_work_centres: postProcessWorkCentres.filter((_, i) => i !== index),
    });
  };

  return (
    <div className={cn("space-y-8 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Operations Review</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Post Release to Floor'}
        </p>
      </div>

      {/* Machining Operations Review */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary text-lg">Machining Operations Review</h3>
        <WorkCentreTable
          title="Machining Work Centres"
          workCentres={machiningWorkCentres}
          onAdd={addMachiningWorkCentre}
          onUpdate={updateMachiningWorkCentre}
          onRemove={removeMachiningWorkCentre}
          disabled={disabled}
        />
      </section>

      {/* Post Process Operations Review */}
      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="font-medium text-primary text-lg">Post Process Operations Review</h3>
        <WorkCentreTable
          title="Post Process Work Centres"
          workCentres={postProcessWorkCentres}
          onAdd={addPostProcessWorkCentre}
          onUpdate={updatePostProcessWorkCentre}
          onRemove={removePostProcessWorkCentre}
          disabled={disabled}
        />
      </section>

      {/* Additional Comments */}
      <div className="space-y-2 border-t border-border pt-6">
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
