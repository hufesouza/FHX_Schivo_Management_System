import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';

interface QualityReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
}

export function QualityReview({ data, onChange }: QualityReviewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Quality Review</h2>
        <p className="text-sm text-muted-foreground">Quality assurance checks</p>
      </div>

      <YesNoField
        label="1. Is the FAIR complete & Acceptable?"
        value={data.fair_complete ?? null}
        onChange={(v) => onChange({ fair_complete: v })}
        details={data.fair_details}
        onDetailsChange={(v) => onChange({ fair_details: v })}
        detailsLabel="Details (If No)"
      />

      <YesNoField
        label="2. Is the Final Inspection AQL frequency specified on IMS, including inspection method?"
        value={data.inspection_aql_specified ?? null}
        onChange={(v) => onChange({ inspection_aql_specified: v })}
        details={data.inspection_aql_details}
        onDetailsChange={(v) => onChange({ inspection_aql_details: v })}
        detailsLabel="Details (If No)"
      />

      <YesNoField
        label="3. Are the required gauges and standards available and calibrated?"
        value={data.quality_gauges_calibrated ?? null}
        onChange={(v) => onChange({ quality_gauges_calibrated: v })}
        details={data.quality_gauges_details}
        onDetailsChange={(v) => onChange({ quality_gauges_details: v })}
        detailsLabel="Details (If No)"
      />

      <YesNoField
        label="4. Are there any additional requirements that have not been captured?"
        value={data.quality_additional_requirements ?? null}
        onChange={(v) => onChange({ quality_additional_requirements: v })}
        details={data.quality_additional_details}
        onDetailsChange={(v) => onChange({ quality_additional_details: v })}
        detailsLabel="Details (If Yes)"
        showDetailsWhen="yes"
      />

      {/* Signature */}
      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="font-medium text-primary">Signature</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature</Label>
            <Input
              value={data.quality_signature || ''}
              onChange={(e) => onChange({ quality_signature: e.target.value })}
              placeholder="Name"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.quality_signature_date || ''}
              onChange={(e) => onChange({ quality_signature_date: e.target.value })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
