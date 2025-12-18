import { Button } from '@/components/ui/button';
import { NPIProjectWithRelations, PROJECT_PHASES } from '@/types/npiProject';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ExportNPIProjectPDFProps {
  project: NPIProjectWithRelations;
}

export function ExportNPIProjectPDF({ project }: ExportNPIProjectPDFProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const content = generatePDFContent(project);
      
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
  try {
    return format(new Date(date), 'dd MMM yyyy');
  } catch {
    return 'N/A';
  }
}

function getStatusBadge(status: string): string {
  const colors: Record<string, { bg: string; color: string }> = {
    not_started: { bg: '#f1f5f9', color: '#64748b' },
    in_progress: { bg: '#dbeafe', color: '#1e40af' },
    completed: { bg: '#dcfce7', color: '#166534' },
    not_applicable: { bg: '#f5f5f4', color: '#78716c' },
    pending: { bg: '#fef3c7', color: '#92400e' },
    approved: { bg: '#dcfce7', color: '#166534' },
    blocked: { bg: '#fee2e2', color: '#991b1b' },
  };
  const { bg, color } = colors[status] || colors.not_started;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `<span style="background: ${bg}; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; text-transform: uppercase;">${label}</span>`;
}

function getPhaseLabel(phase: string): string {
  const phaseData = PROJECT_PHASES.find(p => p.value === phase);
  return phaseData?.label || phase;
}

function generatePDFContent(project: NPIProjectWithRelations): string {
  const charter = project.charter;
  const milestones = project.milestones || [];
  const team = project.team || [];
  const designTransferItems = project.design_transfer_items || [];

  // Group design transfer items by phase
  const itemsByPhase = designTransferItems.reduce((acc, item) => {
    if (!acc[item.phase]) acc[item.phase] = [];
    acc[item.phase].push(item);
    return acc;
  }, {} as Record<string, typeof designTransferItems>);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>NPI Project Report - ${project.project_number} | Schivo Medical</title>
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
    
    /* Title Bar */
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
    
    .project-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      font-size: 11px;
    }
    
    .detail-item {
      display: flex;
      flex-direction: column;
    }
    
    .detail-item .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 2px;
    }
    
    .detail-item .value {
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
    
    /* Charter Fields */
    .charter-field {
      margin-bottom: 12px;
    }
    
    .charter-field .label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
    }
    
    .charter-field .value {
      color: #1e293b;
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 4px;
      border-left: 3px solid #003366;
      white-space: pre-wrap;
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
      vertical-align: top;
    }
    
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    
    /* Phase Header */
    .phase-header {
      background: #f1f5f9;
      padding: 8px 12px;
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      margin-top: 10px;
    }
    
    .phase-header:first-child {
      margin-top: 0;
    }
    
    /* Progress Bar */
    .progress-container {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .progress-bar {
      flex: 1;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #003366 0%, #0066cc 100%);
      border-radius: 4px;
    }
    
    .progress-text {
      font-size: 11px;
      font-weight: 600;
      color: #003366;
      min-width: 40px;
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
      .progress-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .phase-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
          <div class="doc-number">${project.project_number}</div>
          <div>NPI Project Report</div>
          <div>Rev. 1.0</div>
        </div>
      </div>
    </div>
    
    <!-- Title Bar -->
    <div class="title-bar">
      <h2>${project.project_name}</h2>
      <div class="project-details">
        <div class="detail-item">
          <span class="label">Customer</span>
          <span class="value">${project.customer || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Project Type</span>
          <span class="value">${project.project_type === 'simple' ? 'Simple NPI' : 'Complex NPI'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Current Phase</span>
          <span class="value">${getPhaseLabel(project.current_phase)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Start Date</span>
          <span class="value">${formatDate(project.start_date)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Target Completion</span>
          <span class="value">${formatDate(project.target_completion_date)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Status</span>
          <span class="value">${project.status.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="content">
      ${project.description ? `
      <!-- Description -->
      <div class="section">
        <div class="section-header">Project Description</div>
        <div class="section-content">
          <p>${project.description}</p>
        </div>
      </div>
      ` : ''}
      
      ${charter ? `
      <!-- Project Charter -->
      <div class="section">
        <div class="section-header">Project Charter</div>
        <div class="section-content">
          ${charter.scope ? `
          <div class="charter-field">
            <div class="label">Scope</div>
            <div class="value">${charter.scope}</div>
          </div>
          ` : ''}
          ${charter.objectives ? `
          <div class="charter-field">
            <div class="label">Objectives</div>
            <div class="value">${charter.objectives}</div>
          </div>
          ` : ''}
          ${charter.deliverables ? `
          <div class="charter-field">
            <div class="label">Deliverables</div>
            <div class="value">${charter.deliverables}</div>
          </div>
          ` : ''}
          ${charter.success_criteria ? `
          <div class="charter-field">
            <div class="label">Success Criteria</div>
            <div class="value">${charter.success_criteria}</div>
          </div>
          ` : ''}
          ${charter.assumptions ? `
          <div class="charter-field">
            <div class="label">Assumptions</div>
            <div class="value">${charter.assumptions}</div>
          </div>
          ` : ''}
          ${charter.constraints ? `
          <div class="charter-field">
            <div class="label">Constraints</div>
            <div class="value">${charter.constraints}</div>
          </div>
          ` : ''}
          ${charter.risks ? `
          <div class="charter-field">
            <div class="label">Risks</div>
            <div class="value">${charter.risks}</div>
          </div>
          ` : ''}
          ${charter.budget_notes ? `
          <div class="charter-field">
            <div class="label">Budget Notes</div>
            <div class="value">${charter.budget_notes}</div>
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}
      
      ${team.length > 0 ? `
      <!-- Team Members -->
      <div class="section">
        <div class="section-header">Project Team</div>
        <div class="section-content">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Responsibilities</th>
              </tr>
            </thead>
            <tbody>
              ${team.map(member => `
              <tr>
                <td>${member.full_name || member.email || member.user_id}</td>
                <td>${member.role}</td>
                <td>${member.responsibilities || '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}
      
      ${milestones.length > 0 ? `
      <!-- Milestones -->
      <div class="section">
        <div class="section-header">Project Milestones</div>
        <div class="section-content">
          <table>
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Phase</th>
                <th>Target Date</th>
                <th>Actual Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${milestones.map(m => `
              <tr>
                <td>${m.milestone_name}</td>
                <td>${getPhaseLabel(m.phase)}</td>
                <td>${formatDate(m.target_date)}</td>
                <td>${formatDate(m.actual_date)}</td>
                <td>${getStatusBadge(m.status)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}
      
      ${designTransferItems.length > 0 ? `
      <!-- Design Transfer Checklist -->
      <div class="section">
        <div class="section-header">Design Transfer Checklist</div>
        <div class="section-content">
          ${['planning', 'execution', 'process_qualification'].map(phase => {
            const items = itemsByPhase[phase] || [];
            if (items.length === 0) return '';
            
            const completed = items.filter(i => i.status === 'completed' || i.status === 'not_applicable').length;
            const progress = Math.round((completed / items.length) * 100);
            
            return `
            <div class="phase-header">
              ${getPhaseLabel(phase)}
              <span style="float: right; font-weight: normal; font-size: 10px;">${completed}/${items.length} (${progress}%)</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%">Item</th>
                  <th style="width: 15%">Category</th>
                  <th style="width: 15%">Status</th>
                  <th style="width: 15%">Due Date</th>
                  <th style="width: 25%">Notes</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                <tr>
                  <td>${item.item_name}</td>
                  <td>${item.category}</td>
                  <td>${getStatusBadge(item.status)}</td>
                  <td>${formatDate(item.due_date)}</td>
                  <td style="font-size: 9px; color: #64748b;">${item.notes || '-'}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <div class="company">Schivo Medical</div>
          <div>Precision Medical Device Manufacturing</div>
          <div>NPI Project Documentation</div>
        </div>
        <div class="footer-right">
          <div class="fhx-credit">Solution by FHX Engineering</div>
          <div class="generated">Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
