import { Button } from '@/components/ui/button';
import { WorkOrder } from '@/types/workOrder';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportPDFProps {
  workOrder: Partial<WorkOrder>;
}

export function ExportPDF({ workOrder }: ExportPDFProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const content = generatePDFContent(workOrder);
      
      // Create a Blob with the HTML content
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast.success('PDF ready for download');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      Export PDF
    </Button>
  );
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value ? 'Yes' : 'No';
}

function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
}

function generatePDFContent(workOrder: Partial<WorkOrder>): string {
  const workCentres = workOrder.operations_work_centres || [];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Blue Review - W/O #${workOrder.work_order_number || 'Draft'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.4;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 18px; text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    h2 { font-size: 14px; background: #003366; color: white; padding: 8px; margin: 15px 0 10px 0; }
    h3 { font-size: 12px; margin: 10px 0 5px 0; border-bottom: 1px solid #ccc; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; color: #333; }
    .value { color: #000; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .signature-box { border: 1px solid #ccc; padding: 10px; margin-top: 10px; background: #f9f9f9; }
    .yes { color: green; font-weight: bold; }
    .no { color: red; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ccc; padding: 5px; text-align: left; font-size: 10px; }
    th { background: #f0f0f0; }
    @media print {
      body { padding: 10px; }
      h2 { background: #003366 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>BLUE WORK ORDER REVIEW</h1>
  
  <div class="section">
    <h2>Header Information</h2>
    <div class="grid">
      <div class="field"><span class="label">Customer:</span> <span class="value">${workOrder.customer || 'N/A'}</span></div>
      <div class="field"><span class="label">W/O #:</span> <span class="value">${workOrder.work_order_number || 'N/A'}</span></div>
      <div class="field"><span class="label">Part & Rev:</span> <span class="value">${workOrder.part_and_rev || 'N/A'}</span></div>
      <div class="field"><span class="label">ICN Number:</span> <span class="value">${workOrder.icn_number || 'N/A'}</span></div>
      <div class="field"><span class="label">Status:</span> <span class="value">${workOrder.status || 'N/A'}</span></div>
      <div class="field"><span class="label">Current Stage:</span> <span class="value">${workOrder.current_stage || 'N/A'}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Engineering Review</h2>
    <div class="grid">
      <div class="field"><span class="label">Est. Development Time:</span> <span class="value">${workOrder.est_development_time || 'N/A'} hrs</span></div>
      <div class="field"><span class="label">Est. Setup Time:</span> <span class="value">${workOrder.est_setup_time || 'N/A'} hrs</span></div>
      <div class="field"><span class="label">Est. Cycle Time:</span> <span class="value">${workOrder.est_cycle_time || 'N/A'} mins</span></div>
      <div class="field"><span class="label">Est. Tooling Cost:</span> <span class="value">£${workOrder.est_tooling_cost || 'N/A'}</span></div>
    </div>
    
    <h3>Checklist Items</h3>
    <div class="field"><span class="label">Material Size Correct:</span> <span class="${workOrder.material_size_correct ? 'yes' : 'no'}">${formatBoolean(workOrder.material_size_correct)}</span></div>
    <div class="field"><span class="label">BOM Hardware Available:</span> <span class="${workOrder.bom_hardware_available ? 'yes' : 'no'}">${formatBoolean(workOrder.bom_hardware_available)}</span></div>
    <div class="field"><span class="label">Drawings Available:</span> <span class="${workOrder.drawings_available ? 'yes' : 'no'}">${formatBoolean(workOrder.drawings_available)}</span></div>
    <div class="field"><span class="label">Tooling in Matrix:</span> <span class="${workOrder.tooling_in_matrix ? 'yes' : 'no'}">${formatBoolean(workOrder.tooling_in_matrix)}</span></div>
    <div class="field"><span class="label">Fixtures Required:</span> <span class="${workOrder.fixtures_required ? 'yes' : 'no'}">${formatBoolean(workOrder.fixtures_required)}</span></div>
    <div class="field"><span class="label">Gauges Calibrated:</span> <span class="${workOrder.gauges_calibrated ? 'yes' : 'no'}">${formatBoolean(workOrder.gauges_calibrated)}</span></div>
    <div class="field"><span class="label">CMM Program Required:</span> <span class="${workOrder.cmm_program_required ? 'yes' : 'no'}">${formatBoolean(workOrder.cmm_program_required)}</span></div>
    <div class="field"><span class="label">Inspection Sheet Available:</span> <span class="${workOrder.inspection_sheet_available ? 'yes' : 'no'}">${formatBoolean(workOrder.inspection_sheet_available)}</span></div>
    <div class="field"><span class="label">Additional Requirements:</span> <span class="${workOrder.additional_requirements ? 'yes' : 'no'}">${formatBoolean(workOrder.additional_requirements)}</span></div>
    
    <div class="signature-box">
      <div class="field"><span class="label">Approved By:</span> <span class="value">${workOrder.engineering_approved_by || 'N/A'}</span></div>
      <div class="field"><span class="label">Date:</span> <span class="value">${formatDate(workOrder.engineering_approved_date)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Operations Review</h2>
    ${workCentres.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Work Centre</th>
          <th>Routing</th>
          <th>Program</th>
          <th>Tooling</th>
          <th>Setup</th>
          <th>Fixture</th>
          <th>Initial Date</th>
        </tr>
      </thead>
      <tbody>
        ${workCentres.map((wc: any) => `
        <tr>
          <td>${wc.name || 'N/A'}</td>
          <td>${wc.routing_checked ? '✓' : '✗'}</td>
          <td>${wc.program_checked ? '✓' : '✗'}</td>
          <td>${wc.tooling_checked ? '✓' : '✗'}</td>
          <td>${wc.setup_checked ? '✓' : '✗'}</td>
          <td>${wc.fixture_checked ? '✓' : '✗'}</td>
          <td>${wc.initial_date || 'N/A'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p>No work centres added</p>'}
    
    <div class="grid">
      <div class="field"><span class="label">Deburr Time:</span> <span class="value">${workOrder.deburr_time || 'N/A'} mins</span></div>
      <div class="field"><span class="label">Wash Time:</span> <span class="value">${workOrder.wash_time || 'N/A'} mins</span></div>
      <div class="field"><span class="label">Inspection Time:</span> <span class="value">${workOrder.inspection_time || 'N/A'} mins</span></div>
    </div>
    <div class="field"><span class="label">Comments:</span> <span class="value">${workOrder.operations_comments || 'N/A'}</span></div>
  </div>

  <div class="section">
    <h2>Quality Review</h2>
    <div class="field"><span class="label">FAIR Complete:</span> <span class="${workOrder.fair_complete ? 'yes' : 'no'}">${formatBoolean(workOrder.fair_complete)}</span></div>
    <div class="field"><span class="label">Inspection AQL Specified:</span> <span class="${workOrder.inspection_aql_specified ? 'yes' : 'no'}">${formatBoolean(workOrder.inspection_aql_specified)}</span></div>
    <div class="field"><span class="label">Gauges Calibrated:</span> <span class="${workOrder.quality_gauges_calibrated ? 'yes' : 'no'}">${formatBoolean(workOrder.quality_gauges_calibrated)}</span></div>
    <div class="field"><span class="label">Additional Requirements:</span> <span class="${workOrder.quality_additional_requirements ? 'yes' : 'no'}">${formatBoolean(workOrder.quality_additional_requirements)}</span></div>
    
    <div class="signature-box">
      <div class="field"><span class="label">Signature:</span> <span class="value">${workOrder.quality_signature || 'N/A'}</span></div>
      <div class="field"><span class="label">Date:</span> <span class="value">${formatDate(workOrder.quality_signature_date)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>NPI Final Review</h2>
    <div class="field"><span class="label">All Sections Filled:</span> <span class="${workOrder.all_sections_filled ? 'yes' : 'no'}">${formatBoolean(workOrder.all_sections_filled)}</span></div>
    <div class="field"><span class="label">Acceptable to Change White:</span> <span class="${workOrder.acceptable_to_change_white ? 'yes' : 'no'}">${formatBoolean(workOrder.acceptable_to_change_white)}</span></div>
    <div class="field"><span class="label">Comments:</span> <span class="value">${workOrder.npi_final_comments || 'N/A'}</span></div>
    
    <div class="signature-box">
      <div class="field"><span class="label">Signature:</span> <span class="value">${workOrder.npi_final_signature || 'N/A'}</span></div>
      <div class="field"><span class="label">Date:</span> <span class="value">${formatDate(workOrder.npi_final_signature_date)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Supply Chain Administration</h2>
    <div class="field"><span class="label">SAP Changes Completed:</span> <span class="${workOrder.sap_changes_completed ? 'yes' : 'no'}">${formatBoolean(workOrder.sap_changes_completed)}</span></div>
    <div class="field"><span class="label">IMS Updated:</span> <span class="${workOrder.ims_updated ? 'yes' : 'no'}">${formatBoolean(workOrder.ims_updated)}</span></div>
    <div class="field"><span class="label">Approval Status Updated:</span> <span class="${workOrder.approval_status_updated ? 'yes' : 'no'}">${formatBoolean(workOrder.approval_status_updated)}</span></div>
    <div class="field"><span class="label">Routing Operations Removed:</span> <span class="${workOrder.routing_operations_removed ? 'yes' : 'no'}">${formatBoolean(workOrder.routing_operations_removed)}</span></div>
    
    <div class="signature-box">
      <div class="field"><span class="label">Signature:</span> <span class="value">${workOrder.supply_chain_signature || 'N/A'}</span></div>
      <div class="field"><span class="label">Date:</span> <span class="value">${formatDate(workOrder.supply_chain_signature_date)}</span></div>
    </div>
  </div>

  <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
    Generated on ${new Date().toLocaleString()} | Blue Work Order Review System
  </div>
</body>
</html>
  `;
}