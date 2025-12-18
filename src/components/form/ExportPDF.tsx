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
      
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
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

function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
}

function renderCheckItem(label: string, value: boolean | null | undefined): string {
  const status = value === null || value === undefined ? 'na' : value ? 'yes' : 'no';
  const icon = status === 'yes' ? '✓' : status === 'no' ? '✗' : '—';
  const text = status === 'yes' ? 'Yes' : status === 'no' ? 'No' : 'N/A';
  
  return `
    <div class="check-item">
      <span class="check-icon ${status}">${icon}</span>
      <span>${label}: <strong>${text}</strong></span>
    </div>
  `;
}

function generatePDFContent(workOrder: Partial<WorkOrder>): string {
  const workCentres = workOrder.operations_work_centres || [];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Blue Review - W/O #${workOrder.work_order_number || 'Draft'} | Schivo Medical</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: 'Open Sans', Arial, sans-serif; 
      font-size: 11px; 
      line-height: 1.5;
      color: #1a365d;
      background: #fff;
    }
    
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 0;
    }
    
    /* Schivo Medical Header */
    .header {
      background: linear-gradient(135deg, #003366 0%, #004080 100%);
      color: white;
      padding: 20px 30px;
      position: relative;
    }
    
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #d4a84b 0%, #e5c17a 100%);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo-section h1 {
      font-family: 'Montserrat', sans-serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    
    .logo-section .tagline {
      font-size: 11px;
      opacity: 0.9;
      font-style: italic;
    }
    
    .doc-info {
      text-align: right;
      font-size: 10px;
    }
    
    .doc-info .doc-number {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #d4a84b;
    }
    
    /* Document Title Bar */
    .title-bar {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 15px 30px;
    }
    
    .title-bar h2 {
      font-family: 'Montserrat', sans-serif;
      font-size: 18px;
      font-weight: 600;
      color: #003366;
      margin-bottom: 8px;
    }
    
    .wo-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      font-size: 11px;
    }
    
    .wo-detail-item {
      display: flex;
      flex-direction: column;
    }
    
    .wo-detail-item .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 2px;
    }
    
    .wo-detail-item .value {
      font-weight: 600;
      color: #1e293b;
    }
    
    /* Main Content */
    .content {
      padding: 20px 30px;
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .section-header {
      background: linear-gradient(135deg, #003366 0%, #004080 100%);
      color: white;
      padding: 10px 15px;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-header::before {
      content: '';
      width: 3px;
      height: 16px;
      background: #d4a84b;
      border-radius: 2px;
    }
    
    .section-content {
      padding: 15px;
      background: #fff;
    }
    
    /* Field Grid */
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .field {
      padding: 8px 10px;
      background: #f8fafc;
      border-radius: 4px;
      border-left: 3px solid #003366;
    }
    
    .field .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #64748b;
      margin-bottom: 3px;
    }
    
    .field .value {
      font-weight: 500;
      color: #1e293b;
    }
    
    .field.full-width {
      grid-column: 1 / -1;
    }
    
    /* Checklist Items */
    .checklist {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    
    .check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: #f8fafc;
      border-radius: 4px;
      font-size: 10px;
    }
    
    .check-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 10px;
    }
    
    .check-icon.yes {
      background: #dcfce7;
      color: #166534;
    }
    
    .check-icon.no {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .check-icon.na {
      background: #f1f5f9;
      color: #64748b;
    }
    
    /* Table Styling */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 10px;
    }
    
    th {
      background: #003366;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    
    .status-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .status-check.yes {
      background: #dcfce7;
      color: #166534;
    }
    
    .status-check.no {
      background: #fee2e2;
      color: #991b1b;
    }
    
    /* Signature Box */
    .signature-box {
      background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
      border: 1px solid #d4a84b;
      border-radius: 6px;
      padding: 12px 15px;
      margin-top: 15px;
    }
    
    .signature-box .title {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .signature-field .label {
      font-size: 9px;
      color: #92400e;
      margin-bottom: 2px;
    }
    
    .signature-field .value {
      font-weight: 600;
      color: #78350f;
      padding-bottom: 3px;
      border-bottom: 1px solid #d4a84b;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      padding: 20px 30px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .footer-left {
      font-size: 9px;
      color: #64748b;
    }
    
    .footer-left .company {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      color: #003366;
      font-size: 11px;
      margin-bottom: 2px;
    }
    
    .footer-right {
      text-align: right;
    }
    
    .footer-right .fhx-credit {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      color: #3b82f6;
      font-weight: 500;
    }
    
    .footer-right .generated {
      font-size: 8px;
      color: #94a3b8;
      margin-top: 3px;
    }
    
    /* Print Styles */
    @media print {
      body { padding: 0; }
      .page { max-width: 100%; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .check-icon { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .signature-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo-section">
          <h1>Schivo</h1>
          <div class="tagline">We make possible happen.</div>
        </div>
        <div class="doc-info">
          <div class="doc-number">WD-FRM-0017</div>
          <div>Blue Work Order Review</div>
          <div>Rev. 1.0</div>
        </div>
      </div>
    </div>
    
    <!-- Title Bar -->
    <div class="title-bar">
      <h2>Blue Work Order Review</h2>
      <div class="wo-details">
        <div class="wo-detail-item">
          <span class="label">Customer</span>
          <span class="value">${workOrder.customer || 'N/A'}</span>
        </div>
        <div class="wo-detail-item">
          <span class="label">Work Order #</span>
          <span class="value">${workOrder.work_order_number || 'N/A'}</span>
        </div>
        <div class="wo-detail-item">
          <span class="label">Part & Rev</span>
          <span class="value">${workOrder.part_and_rev || 'N/A'}</span>
        </div>
        <div class="wo-detail-item">
          <span class="label">Blue Review #</span>
          <span class="value">${workOrder.blue_review_number ? `BR-${String(workOrder.blue_review_number).padStart(5, '0')}` : 'N/A'}</span>
        </div>
        <div class="wo-detail-item">
          <span class="label">Status</span>
          <span class="value">${workOrder.status || 'N/A'}</span>
        </div>
        <div class="wo-detail-item">
          <span class="label">Current Stage</span>
          <span class="value">${workOrder.current_stage || 'N/A'}</span>
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Engineering Review -->
      <div class="section">
        <div class="section-header">Engineering Review</div>
        <div class="section-content">
          <div class="field-grid">
            <div class="field">
              <div class="label">Est. Development Time</div>
              <div class="value">${workOrder.est_development_time || 'N/A'} hrs</div>
            </div>
            <div class="field">
              <div class="label">Est. Setup Time</div>
              <div class="value">${workOrder.est_setup_time || 'N/A'} hrs</div>
            </div>
            <div class="field">
              <div class="label">Est. Cycle Time</div>
              <div class="value">${workOrder.est_cycle_time || 'N/A'} mins</div>
            </div>
            <div class="field">
              <div class="label">Est. Tooling Cost</div>
              <div class="value">£${workOrder.est_tooling_cost || 'N/A'}</div>
            </div>
          </div>
          
          <div class="checklist">
            ${renderCheckItem('Material Size Correct', workOrder.material_size_correct)}
            ${renderCheckItem('BOM Hardware Available', workOrder.bom_hardware_available)}
            ${renderCheckItem('Drawings Available', workOrder.drawings_available)}
            ${renderCheckItem('Tooling in Matrix', workOrder.tooling_in_matrix)}
            ${renderCheckItem('Fixtures Required', workOrder.fixtures_required)}
            ${renderCheckItem('Gauges Calibrated', workOrder.gauges_calibrated)}
            ${renderCheckItem('CMM Program Required', workOrder.cmm_program_required)}
            ${renderCheckItem('Inspection Sheet Available', workOrder.inspection_sheet_available)}
            ${renderCheckItem('Additional Requirements', workOrder.additional_requirements)}
          </div>
          
          <div class="signature-box">
            <div class="title">Engineering Approval</div>
            <div class="signature-grid">
              <div class="signature-field">
                <div class="label">Approved By</div>
                <div class="value">${workOrder.engineering_approved_by || 'Pending'}</div>
              </div>
              <div class="signature-field">
                <div class="label">Date</div>
                <div class="value">${formatDate(workOrder.engineering_approved_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Operations Review -->
      <div class="section">
        <div class="section-header">Operations Review</div>
        <div class="section-content">
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
                <td><strong>${wc.name || 'N/A'}</strong></td>
                <td><span class="status-check ${wc.routing_checked ? 'yes' : 'no'}">${wc.routing_checked ? '✓' : '✗'}</span></td>
                <td><span class="status-check ${wc.program_checked ? 'yes' : 'no'}">${wc.program_checked ? '✓' : '✗'}</span></td>
                <td><span class="status-check ${wc.tooling_checked ? 'yes' : 'no'}">${wc.tooling_checked ? '✓' : '✗'}</span></td>
                <td><span class="status-check ${wc.setup_checked ? 'yes' : 'no'}">${wc.setup_checked ? '✓' : '✗'}</span></td>
                <td><span class="status-check ${wc.fixture_checked ? 'yes' : 'no'}">${wc.fixture_checked ? '✓' : '✗'}</span></td>
                <td>${wc.initial_date || 'N/A'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          ` : '<p style="color: #64748b; font-style: italic;">No work centres added</p>'}
          
          <div class="field-grid" style="margin-top: 15px;">
            <div class="field">
              <div class="label">Deburr Time</div>
              <div class="value">${workOrder.deburr_time || 'N/A'} mins</div>
            </div>
            <div class="field">
              <div class="label">Wash Time</div>
              <div class="value">${workOrder.wash_time || 'N/A'} mins</div>
            </div>
            <div class="field">
              <div class="label">Inspection Time</div>
              <div class="value">${workOrder.inspection_time || 'N/A'} mins</div>
            </div>
            <div class="field full-width">
              <div class="label">Comments</div>
              <div class="value">${workOrder.operations_comments || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Quality Review -->
      <div class="section">
        <div class="section-header">Quality Review</div>
        <div class="section-content">
          <div class="checklist">
            ${renderCheckItem('FAIR Complete', workOrder.fair_complete)}
            ${renderCheckItem('Inspection AQL Specified', workOrder.inspection_aql_specified)}
            ${renderCheckItem('Gauges Calibrated', workOrder.quality_gauges_calibrated)}
            ${renderCheckItem('Additional Requirements', workOrder.quality_additional_requirements)}
          </div>
          
          <div class="signature-box">
            <div class="title">Quality Approval</div>
            <div class="signature-grid">
              <div class="signature-field">
                <div class="label">Signature</div>
                <div class="value">${workOrder.quality_signature || 'Pending'}</div>
              </div>
              <div class="signature-field">
                <div class="label">Date</div>
                <div class="value">${formatDate(workOrder.quality_signature_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- NPI Final Review -->
      <div class="section">
        <div class="section-header">NPI Final Review</div>
        <div class="section-content">
          <div class="checklist">
            ${renderCheckItem('All Sections Filled', workOrder.all_sections_filled)}
            ${renderCheckItem('Acceptable to Change White', workOrder.acceptable_to_change_white)}
          </div>
          
          <div class="field-grid" style="margin-top: 15px;">
            <div class="field full-width">
              <div class="label">Comments</div>
              <div class="value">${workOrder.npi_final_comments || 'N/A'}</div>
            </div>
          </div>
          
          <div class="signature-box">
            <div class="title">NPI Approval</div>
            <div class="signature-grid">
              <div class="signature-field">
                <div class="label">Signature</div>
                <div class="value">${workOrder.npi_final_signature || 'Pending'}</div>
              </div>
              <div class="signature-field">
                <div class="label">Date</div>
                <div class="value">${formatDate(workOrder.npi_final_signature_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Supply Chain Administration -->
      <div class="section">
        <div class="section-header">Supply Chain Administration</div>
        <div class="section-content">
          <div class="checklist">
            ${renderCheckItem('SAP Changes Completed', workOrder.sap_changes_completed)}
            ${renderCheckItem('IMS Updated', workOrder.ims_updated)}
            ${renderCheckItem('Approval Status Updated', workOrder.approval_status_updated)}
            ${renderCheckItem('Routing Operations Removed', workOrder.routing_operations_removed)}
          </div>
          
          <div class="signature-box">
            <div class="title">Supply Chain Approval</div>
            <div class="signature-grid">
              <div class="signature-field">
                <div class="label">Signature</div>
                <div class="value">${workOrder.supply_chain_signature || 'Pending'}</div>
              </div>
              <div class="signature-field">
                <div class="label">Date</div>
                <div class="value">${formatDate(workOrder.supply_chain_signature_date)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <div class="company">Schivo Medical</div>
          <div>We make possible happen.</div>
          <div>www.schivomedical.com</div>
        </div>
        <div class="footer-right">
          <div class="fhx-credit">Developed by FHX Engineering</div>
          <div class="generated">Generated on ${new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
