import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';
import { cn } from '@/lib/utils';

interface HandoverReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
}

export function HandoverReview({ data, onChange, disabled = false }: HandoverReviewProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Handover – Programming/Operations/Quality</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Sign off from all departments'}
        </p>
      </div>

      {/* Engineering Sign-off */}
      <section className="space-y-4 p-4 border border-border rounded-lg bg-card">
        <h3 className="font-medium text-primary">Engineering Sign-off</h3>
        <YesNoField
          label="Is it acceptable to change to White? (Engineering)"
          value={data.handover_engineering_accept ?? null}
          onChange={(v) => onChange({ handover_engineering_accept: v })}
          details={data.handover_engineering_details}
          onDetailsChange={(v) => onChange({ handover_engineering_details: v })}
          detailsLabel="Details (If No)"
          disabled={disabled}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={data.handover_engineering_signature || ''}
              onChange={(e) => onChange({ handover_engineering_signature: e.target.value })}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.handover_engineering_date || ''}
              onChange={(e) => onChange({ handover_engineering_date: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </section>

      {/* Operations Sign-off */}
      <section className="space-y-4 p-4 border border-border rounded-lg bg-card">
        <h3 className="font-medium text-primary">Operations Sign-off</h3>
        <YesNoField
          label="Is it acceptable to change to White? (Operations)"
          value={data.handover_operations_accept ?? null}
          onChange={(v) => onChange({ handover_operations_accept: v })}
          details={data.handover_operations_details}
          onDetailsChange={(v) => onChange({ handover_operations_details: v })}
          detailsLabel="Details (If No)"
          disabled={disabled}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={data.handover_operations_signature || ''}
              onChange={(e) => onChange({ handover_operations_signature: e.target.value })}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.handover_operations_date || ''}
              onChange={(e) => onChange({ handover_operations_date: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </section>

      {/* Quality Sign-off */}
      <section className="space-y-4 p-4 border border-border rounded-lg bg-card">
        <h3 className="font-medium text-primary">Quality Sign-off</h3>
        <YesNoField
          label="Is it acceptable to change to White? (Quality)"
          value={data.handover_quality_accept ?? null}
          onChange={(v) => onChange({ handover_quality_accept: v })}
          details={data.handover_quality_details}
          onDetailsChange={(v) => onChange({ handover_quality_details: v })}
          detailsLabel="Details (If No)"
          disabled={disabled}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={data.handover_quality_signature || ''}
              onChange={(e) => onChange({ handover_quality_signature: e.target.value })}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.handover_quality_date || ''}
              onChange={(e) => onChange({ handover_quality_date: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </section>

      {/* Additional Comments */}
      <div className="space-y-2">
        <Label>Additional Comments</Label>
        <Textarea
          value={data.handover_comments || ''}
          onChange={(e) => onChange({ handover_comments: e.target.value })}
          placeholder="Enter any additional comments..."
          rows={4}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
