import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';
import { cn } from '@/lib/utils';

interface SupplyChainReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
}

export function SupplyChainReview({ data, onChange, disabled = false }: SupplyChainReviewProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Completion – Supply Chain Administration</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Final administrative tasks'}
        </p>
      </div>

      <YesNoField
        label="1. Have All required SAP changes completed?"
        value={data.sap_changes_completed ?? null}
        onChange={(v) => onChange({ sap_changes_completed: v })}
        details={data.sap_changes_details}
        onDetailsChange={(v) => onChange({ sap_changes_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="2. Have all IMS been updated including inspection methods, Completion and Linked Documents uploaded to SAP?"
        value={data.ims_updated ?? null}
        onChange={(v) => onChange({ ims_updated: v })}
        details={data.ims_updated_details}
        onDetailsChange={(v) => onChange({ ims_updated_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="3. If the Job is acceptable to change to White, has the approval status been updated, if not has the Development Setup been updated in line with comments above (Stage 4)?"
        value={data.approval_status_updated ?? null}
        onChange={(v) => onChange({ approval_status_updated: v })}
        details={data.approval_status_details}
        onDetailsChange={(v) => onChange({ approval_status_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="4. If Job is acceptable to change to White, have the CAD/CAM programing resource, ManuEng, Development Setup and QA2 operations been removed from the routing?"
        value={data.routing_operations_removed ?? null}
        onChange={(v) => onChange({ routing_operations_removed: v })}
        details={data.routing_operations_details}
        onDetailsChange={(v) => onChange({ routing_operations_details: v })}
        detailsLabel="Details (If No)"
        disabled={disabled}
      />

      <YesNoField
        label="5. If job is staying on Blue have reasons been included in remarks sections?"
        value={data.reasons_in_remarks ?? null}
        onChange={(v) => onChange({ reasons_in_remarks: v })}
        details={data.reasons_in_remarks_details}
        onDetailsChange={(v) => onChange({ reasons_in_remarks_details: v })}
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
              value={data.supply_chain_signature || ''}
              onChange={(e) => onChange({ supply_chain_signature: e.target.value })}
              placeholder="Name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.supply_chain_signature_date || ''}
              onChange={(e) => onChange({ supply_chain_signature_date: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
