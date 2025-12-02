import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkOrder } from '@/types/workOrder';
import { YesNoField } from './YesNoField';

interface EngineeringReviewProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
}

export function EngineeringReview({ data, onChange }: EngineeringReviewProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Engineering Review</h2>
        <p className="text-sm text-muted-foreground">Pre-Release to Floor</p>
      </div>
      
      {/* 1. Process Parameter Estimation */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">1. Process Parameter Estimation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Estimated Development Time (min)</Label>
            <Input
              type="number"
              value={data.est_development_time || ''}
              onChange={(e) => onChange({ est_development_time: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Minutes"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Setup Time (min)</Label>
            <Input
              type="number"
              value={data.est_setup_time || ''}
              onChange={(e) => onChange({ est_setup_time: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Minutes"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Cycle Time (min)</Label>
            <Input
              type="number"
              value={data.est_cycle_time || ''}
              onChange={(e) => onChange({ est_cycle_time: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Minutes"
            />
          </div>
          <div className="space-y-2">
            <Label>Estimated Tooling Cost (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={data.est_tooling_cost || ''}
              onChange={(e) => onChange({ est_tooling_cost: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="€"
            />
          </div>
          <div className="space-y-2">
            <Label>Tooling Lead Time</Label>
            <Input
              value={data.tooling_lead_time || ''}
              onChange={(e) => onChange({ tooling_lead_time: e.target.value })}
              placeholder="Lead time"
            />
          </div>
          <div className="space-y-2">
            <Label>Deburr/Wash/Inspection (min)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={data.deburr_time || ''}
                onChange={(e) => onChange({ deburr_time: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Deburr"
              />
              <Input
                type="number"
                value={data.wash_time || ''}
                onChange={(e) => onChange({ wash_time: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Wash"
              />
              <Input
                type="number"
                value={data.inspection_time || ''}
                onChange={(e) => onChange({ inspection_time: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Inspect"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* 2. Raw Material */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">2. Raw Material</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Material Size & Allowance</Label>
            <Input
              value={data.material_size_allowance || ''}
              onChange={(e) => onChange({ material_size_allowance: e.target.value })}
              placeholder="Size and allowance"
            />
          </div>
          <div className="space-y-2">
            <Label>Material Lead Time</Label>
            <Input
              value={data.material_leadtime || ''}
              onChange={(e) => onChange({ material_leadtime: e.target.value })}
              placeholder="Lead time"
            />
          </div>
        </div>
        <YesNoField
          label="Is material size specified correct and are scrap allowances reasonable?"
          value={data.material_size_correct ?? null}
          onChange={(v) => onChange({ material_size_correct: v })}
          details={data.material_size_details}
          onDetailsChange={(v) => onChange({ material_size_details: v })}
          detailsLabel="Details (If No)"
        />
      </section>
      
      {/* 3. BOM */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">3. BOM</h3>
        <YesNoField
          label="Are Dowels/Pems/Hardware etc. required & available?"
          value={data.bom_hardware_available ?? null}
          onChange={(v) => onChange({ bom_hardware_available: v })}
          details={data.bom_hardware_details}
          onDetailsChange={(v) => onChange({ bom_hardware_details: v })}
          detailsLabel="Details (If No)"
        />
        <div className="space-y-2">
          <Label>Lead Time</Label>
          <Input
            value={data.bom_lead_time || ''}
            onChange={(e) => onChange({ bom_lead_time: e.target.value })}
            placeholder="Lead time"
          />
        </div>
      </section>
      
      {/* 4. Drawing & Specifications */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">4. Drawing & Specifications</h3>
        <YesNoField
          label="Are all dimensions, specifications, and production tolerances available?"
          value={data.drawings_available ?? null}
          onChange={(v) => onChange({ drawings_available: v })}
          details={data.drawings_details}
          onDetailsChange={(v) => onChange({ drawings_details: v })}
          detailsLabel="Details (If No)"
        />
      </section>
      
      {/* 5. Tooling & Fixturing */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">5. Tooling & Fixturing</h3>
        <YesNoField
          label="Is all tooling available in the Matrix?"
          value={data.tooling_in_matrix ?? null}
          onChange={(v) => onChange({ tooling_in_matrix: v })}
          details={data.tooling_details}
          onDetailsChange={(v) => onChange({ tooling_details: v })}
          detailsLabel="Details (If No)"
        />
        <YesNoField
          label="Are there any fixtures required?"
          value={data.fixtures_required ?? null}
          onChange={(v) => onChange({ fixtures_required: v })}
          details={data.fixtures_details}
          onDetailsChange={(v) => onChange({ fixtures_details: v })}
          detailsLabel="Details (If Yes)"
          showDetailsWhen="yes"
        />
        <div className="space-y-2">
          <Label>Fixtures Lead Time</Label>
          <Input
            value={data.fixtures_lead_time || ''}
            onChange={(e) => onChange({ fixtures_lead_time: e.target.value })}
            placeholder="Lead time"
          />
        </div>
      </section>
      
      {/* 6. Gauges & Standards */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">6. Gauges & Standards</h3>
        <YesNoField
          label="Are the required gauges and standards available and calibrated?"
          value={data.gauges_calibrated ?? null}
          onChange={(v) => onChange({ gauges_calibrated: v })}
          details={data.gauges_details}
          onDetailsChange={(v) => onChange({ gauges_details: v })}
          detailsLabel="Details (If No)"
        />
        <YesNoField
          label="Is a CMM or Vici-Vision Program Required?"
          value={data.cmm_program_required ?? null}
          onChange={(v) => onChange({ cmm_program_required: v })}
          details={data.cmm_program_details}
          onDetailsChange={(v) => onChange({ cmm_program_details: v })}
          detailsLabel="Details (If Yes)"
          showDetailsWhen="yes"
        />
        <div className="space-y-2">
          <Label>CMM Lead Time</Label>
          <Input
            value={data.cmm_lead_time || ''}
            onChange={(e) => onChange({ cmm_lead_time: e.target.value })}
            placeholder="Lead time"
          />
        </div>
      </section>
      
      {/* 7. Inspection Sheet */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">7. Inspection Sheet</h3>
        <YesNoField
          label="Is an inspection sheet available or assigned?"
          value={data.inspection_sheet_available ?? null}
          onChange={(v) => onChange({ inspection_sheet_available: v })}
          details={data.inspection_sheet_details}
          onDetailsChange={(v) => onChange({ inspection_sheet_details: v })}
          detailsLabel="Details (If No)"
        />
      </section>
      
      {/* 8. Additional Requirements */}
      <section className="space-y-4">
        <h3 className="font-medium text-primary">8. Additional Requirements</h3>
        <YesNoField
          label="Are there any additional requirements? (e.g: Deburring/Wash/Packing/Inspection Instructions)"
          value={data.additional_requirements ?? null}
          onChange={(v) => onChange({ additional_requirements: v })}
          details={data.additional_requirements_details}
          onDetailsChange={(v) => onChange({ additional_requirements_details: v })}
          detailsLabel="Details (If Yes)"
          showDetailsWhen="yes"
        />
      </section>
      
      {/* Signatures */}
      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="font-medium text-primary">Signatures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Reviewed and Approved for Production By</Label>
            <Input
              value={data.engineering_approved_by || ''}
              onChange={(e) => onChange({ engineering_approved_by: e.target.value })}
              placeholder="Name"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.engineering_approved_date || ''}
              onChange={(e) => onChange({ engineering_approved_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>NPI Approval (Only If Capital Spend Required)</Label>
            <Input
              value={data.npi_approval_by || ''}
              onChange={(e) => onChange({ npi_approval_by: e.target.value })}
              placeholder="Name"
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={data.npi_approval_date || ''}
              onChange={(e) => onChange({ npi_approval_date: e.target.value })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
