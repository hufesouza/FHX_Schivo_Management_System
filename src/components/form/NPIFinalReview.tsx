import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';
import { cn } from '@/lib/utils';

interface NPIFinalReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
}

export function NPIFinalReview({ data, onChange, disabled = false }: NPIFinalReviewProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Final Review – NPI</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Final approval for production'}
        </p>
      </div>

      <YesNoField
        label="1. Have all sections been filled in by Programmers/Production and Quality?"
        value={data.all_sections_filled ?? null}
        onChange={(v) => onChange({ all_sections_filled: v })}
        details={data.all_sections_details}
        onDetailsChange={(v) => onChange({ all_sections_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="2. Do costings need to be re-evaluated based on unplanned cycle times / additional costs?"
        value={data.costings_need_reevaluation ?? null}
        onChange={(v) => onChange({ costings_need_reevaluation: v })}
        details={data.costings_reevaluation_details}
        onDetailsChange={(v) => onChange({ costings_reevaluation_details: v })}
        detailsLabel="Details (If Yes)"
        showDetailsWhen="yes"
        disabled={disabled}
      />

      <YesNoField
        label="3. Have all departments agreed to change to White?"
        value={data.departments_agreed_to_change ?? null}
        onChange={(v) => onChange({ departments_agreed_to_change: v })}
        details={data.departments_agreed_details}
        onDetailsChange={(v) => onChange({ departments_agreed_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <div className="space-y-2">
        <Label>Additional Comments</Label>
        <Textarea
          value={data.npi_final_comments || ''}
          onChange={(e) => onChange({ npi_final_comments: e.target.value })}
          placeholder="Enter any additional comments..."
          rows={4}
          disabled={disabled}
        />
      </div>

      {/* Signature */}
      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="font-medium text-primary">Signature</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={data.npi_final_signature || ''}
              onChange={(e) => onChange({ npi_final_signature: e.target.value })}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.npi_final_signature_date || ''}
              onChange={(e) => onChange({ npi_final_signature_date: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
