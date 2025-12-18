import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';
import { cn } from '@/lib/utils';

interface ProgrammingReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
}

export function ProgrammingReview({ data, onChange, disabled = false }: ProgrammingReviewProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Programming Review</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Post Release to Floor'}
        </p>
      </div>

      <YesNoField
        label="1. Did machining times run as planned?"
        value={data.machining_times_as_planned ?? null}
        onChange={(v) => onChange({ machining_times_as_planned: v })}
        details={data.machining_times_details}
        onDetailsChange={(v) => onChange({ machining_times_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="2. If the times did not run as planned can they be improved next run?"
        value={data.times_can_be_improved ?? null}
        onChange={(v) => onChange({ times_can_be_improved: v })}
        details={data.times_improvement_details}
        onDetailsChange={(v) => onChange({ times_improvement_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="3. Are there any open actions identified in sections 2 or 3 above?"
        value={data.open_actions_identified ?? null}
        onChange={(v) => onChange({ open_actions_identified: v })}
        details={data.open_actions_details}
        onDetailsChange={(v) => onChange({ open_actions_details: v })}
        detailsLabel="Details (If Yes)"
        showDetailsWhen="yes"
        disabled={disabled}
      />

      <YesNoField
        label="4. Have all open actions been completed?"
        value={data.all_actions_completed ?? null}
        onChange={(v) => onChange({ all_actions_completed: v })}
        details={data.actions_completed_details}
        onDetailsChange={(v) => onChange({ actions_completed_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      {/* Signature */}
      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="font-medium text-primary">Signature</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={data.programming_signature || ''}
              onChange={(e) => onChange({ programming_signature: e.target.value })}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.programming_signature_date || ''}
              onChange={(e) => onChange({ programming_signature_date: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
