import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';

interface NPIFinalReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
}

export function NPIFinalReview({ data, onChange }: NPIFinalReviewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Final Review – NPI</h2>
        <p className="text-sm text-muted-foreground">Final approval for production</p>
      </div>

      <YesNoField
        label="1. Have all sections been filled in by Programmers/Production and Quality?"
        value={data.all_sections_filled ?? null}
        onChange={(v) => onChange({ all_sections_filled: v })}
        details={data.all_sections_details}
        onDetailsChange={(v) => onChange({ all_sections_details: v })}
        detailsLabel="Details (If No)"
      />

      <YesNoField
        label="2. Is it acceptable to change to White?"
        value={data.acceptable_to_change_white ?? null}
        onChange={(v) => onChange({ acceptable_to_change_white: v })}
        details={data.acceptable_to_change_details}
        onDetailsChange={(v) => onChange({ acceptable_to_change_details: v })}
        detailsLabel="Details (If No)"
      />

      <div className="space-y-2">
        <Label>Additional Comments</Label>
        <Textarea
          value={data.npi_final_comments || ''}
          onChange={(e) => onChange({ npi_final_comments: e.target.value })}
          placeholder="Enter any additional comments..."
          rows={4}
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
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.npi_final_signature_date || ''}
              onChange={(e) => onChange({ npi_final_signature_date: e.target.value })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
