import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SiteStats } from '@/utils/npiOrderReport';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat('en-IE').format(n || 0);

type RGB = [number, number, number];
const PALETTE: RGB[] = [
  [59, 130, 246], [16, 185, 129], [139, 92, 246], [245, 158, 11],
  [244, 63, 94], [6, 182, 212], [132, 204, 22], [99, 102, 241],
];

export function exportMultiSiteReport(stats: SiteStats[], year: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const periodLabel = year === 'all' ? 'All years' : year;

  const drawHeader = () => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pw, 22, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('NPI Order Report - Group Sites', margin, 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(`Period: ${periodLabel}  |  Sites: ${stats.length}  |  Generated ${dateStr}`, margin, 16.5);
  };

  let y = 28;
  drawHeader();

  const ensure = (needed: number) => {
    if (y + needed > ph - 14) {
      pdf.addPage();
      drawHeader();
      y = 28;
    }
  };

  const sectionTitle = (title: string) => {
    ensure(16);
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y + 1.6, margin + 28, y + 1.6);
    pdf.setLineWidth(0.2);
    y += 8;
  };

  const kpiGrid = (kpis: { label: string; value: string; accent: RGB; tint: RGB }[], cols: number, cardH = 14) => {
    const gap = 5;
    const cardW = (pw - margin * 2 - gap * (cols - 1)) / cols;
    const rows = Math.ceil(kpis.length / cols);
    ensure(rows * (cardH + gap));
    kpis.forEach((k, i) => {
      const x = margin + (i % cols) * (cardW + gap);
      const cy = y + Math.floor(i / cols) * (cardH + gap);
      pdf.setFillColor(k.tint[0], k.tint[1], k.tint[2]);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, cy, cardW, cardH, 2, 2, 'FD');
      pdf.setFillColor(k.accent[0], k.accent[1], k.accent[2]);
      pdf.rect(x, cy, 1.5, cardH, 'F');
      pdf.setFontSize(6.2);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont('helvetica', 'bold');
      pdf.text(k.label.toUpperCase(), x + 4, cy + 5);
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text(k.value, x + 4, cy + cardH - 3.5);
    });
    y += rows * (cardH + gap) + 2;
  };

  const barChart = (data: { label: string; value: number; color?: RGB }[], fmt: (n: number) => string, rowH = 7.5) => {
    const max = Math.max(1, ...data.map(d => d.value));
    const labelW = 46;
    const valueW = 30;
    const barW = pw - margin * 2 - labelW - valueW;
    ensure(data.length * rowH + 4);
    data.forEach((d, i) => {
      const ry = y + i * rowH;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      const label = d.label.length > 26 ? d.label.slice(0, 25) + '...' : d.label;
      pdf.text(label, margin, ry + 4.6);
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin + labelW, ry + 1.2, barW, rowH - 2.6, 1, 1, 'F');
      const c = d.color || PALETTE[i % PALETTE.length];
      pdf.setFillColor(c[0], c[1], c[2]);
      pdf.roundedRect(margin + labelW, ry + 1.2, Math.max(1.2, (d.value / max) * barW), rowH - 2.6, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(fmt(d.value), pw - margin, ry + 4.6, { align: 'right' });
    });
    y += data.length * rowH + 4;
  };

  // ---------- Group summary ----------
  const tot = stats.reduce(
    (a, s) => ({
      revenue: a.revenue + s.revenue,
      lines: a.lines + s.lines,
      orders: a.orders + s.orders,
      openRevenue: a.openRevenue + s.openRevenue,
      closedRevenue: a.closedRevenue + s.closedRevenue,
      openLines: a.openLines + s.openLines,
      company: a.company + s.companyRevenue,
    }),
    { revenue: 0, lines: 0, orders: 0, openRevenue: 0, closedRevenue: 0, openLines: 0, company: 0 }
  );
  const groupNpvi = tot.company > 0 ? (tot.revenue / tot.company) * 100 : null;
  const leader = [...stats].sort((a, b) => b.revenue - a.revenue)[0];

  sectionTitle('Group Summary');
  kpiGrid([
    { label: 'Total NPI Revenue', value: fmtEur(tot.revenue), accent: [16, 185, 129], tint: [236, 253, 245] },
    { label: 'Order Lines', value: fmtNum(tot.lines), accent: [59, 130, 246], tint: [239, 246, 255] },
    { label: 'Orders', value: fmtNum(tot.orders), accent: [99, 102, 241], tint: [238, 242, 255] },
    { label: 'Sites Reported', value: String(stats.length), accent: [139, 92, 246], tint: [245, 243, 255] },
    { label: 'Invoiced (Closed)', value: fmtEur(tot.closedRevenue), accent: [20, 184, 166], tint: [240, 253, 250] },
    { label: 'To Invoice (Open)', value: fmtEur(tot.openRevenue), accent: [245, 158, 11], tint: [255, 251, 235] },
    { label: 'Group NPVI', value: groupNpvi === null ? 'n/a' : `${groupNpvi.toFixed(1)}%`, accent: [168, 85, 247], tint: [250, 245, 255] },
    { label: 'Top Site', value: leader ? leader.label : '-', accent: [244, 63, 94], tint: [255, 241, 242] },
  ], 4);

  sectionTitle('NPI Revenue by Site');
  barChart(stats.map((s, i) => ({ label: s.label, value: Math.round(s.revenue), color: PALETTE[i % PALETTE.length] })), fmtEur);

  sectionTitle('Order Lines by Site');
  barChart(stats.map((s, i) => ({ label: s.label, value: s.lines, color: PALETTE[i % PALETTE.length] })), fmtNum);

  sectionTitle('Site Comparison');
  autoTable(pdf, {
    startY: y,
    head: [['Site', 'Revenue', 'Lines', 'Orders', 'Customers', 'Parts', 'Avg Order', 'Open Value', 'NPVI', '% Group']],
    body: stats.map(s => [
      s.label,
      fmtEur(s.revenue),
      fmtNum(s.lines),
      fmtNum(s.orders),
      fmtNum(s.customers),
      fmtNum(s.parts),
      fmtEur(s.avgOrder),
      fmtEur(s.openRevenue),
      s.npvi === null ? 'n/a' : `${s.npvi.toFixed(1)}%`,
      tot.revenue > 0 ? `${((s.revenue / tot.revenue) * 100).toFixed(1)}%` : '-',
    ]),
    foot: [[
      'GROUP TOTAL', fmtEur(tot.revenue), fmtNum(tot.lines), fmtNum(tot.orders), '', '',
      tot.orders > 0 ? fmtEur(tot.revenue / tot.orders) : '-', fmtEur(tot.openRevenue),
      groupNpvi === null ? 'n/a' : `${groupNpvi.toFixed(1)}%`, '100.0%',
    ]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    theme: 'grid',
    didDrawPage: () => drawHeader(),
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  // ---------- Monthly group trend ----------
  sectionTitle('Monthly NPI Revenue by Site');
  autoTable(pdf, {
    startY: y,
    head: [['Site', ...MONTHS, 'Total']],
    body: stats.map(s => [s.label, ...s.monthly.map(v => (v ? Math.round(v).toLocaleString('en-IE') : '-')), Math.round(s.revenue).toLocaleString('en-IE')]),
    foot: [[
      'TOTAL',
      ...MONTHS.map((_, i) => {
        const v = stats.reduce((a, s) => a + s.monthly[i], 0);
        return v ? Math.round(v).toLocaleString('en-IE') : '-';
      }),
      Math.round(tot.revenue).toLocaleString('en-IE'),
    ]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 6.4, cellPadding: 1.3, halign: 'right' },
    columnStyles: { 0: { halign: 'left', cellWidth: 26, fontStyle: 'bold' } },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'right' },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' },
    theme: 'grid',
    didDrawPage: () => drawHeader(),
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  // ---------- Per-site pages ----------
  stats.forEach((s, idx) => {
    pdf.addPage();
    drawHeader();
    y = 28;
    const accent = PALETTE[idx % PALETTE.length];
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(accent[0], accent[1], accent[2]);
    pdf.text(s.label, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${periodLabel}${s.fileName ? `  |  Source: ${s.fileName}` : ''}`, margin, y + 5);
    y += 12;

    kpiGrid([
      { label: 'NPI Revenue', value: fmtEur(s.revenue), accent: [16, 185, 129], tint: [236, 253, 245] },
      { label: 'Order Lines', value: fmtNum(s.lines), accent: [59, 130, 246], tint: [239, 246, 255] },
      { label: 'Orders', value: fmtNum(s.orders), accent: [99, 102, 241], tint: [238, 242, 255] },
      { label: 'Customers', value: fmtNum(s.customers), accent: [139, 92, 246], tint: [245, 243, 255] },
      { label: 'Invoiced (Closed)', value: fmtEur(s.closedRevenue), accent: [20, 184, 166], tint: [240, 253, 250] },
      { label: 'To Invoice (Open)', value: fmtEur(s.openRevenue), accent: [245, 158, 11], tint: [255, 251, 235] },
      { label: 'Avg Order Value', value: fmtEur(s.avgOrder), accent: [6, 182, 212], tint: [236, 254, 255] },
      { label: 'NPVI', value: s.npvi === null ? 'n/a' : `${s.npvi.toFixed(1)}%`, accent: [168, 85, 247], tint: [250, 245, 255] },
    ], 4);

    if (s.topCustomers.length) {
      sectionTitle('Top Customers by Revenue');
      barChart(s.topCustomers.map(c => ({ label: c.name, value: Math.round(c.revenue), color: accent })), fmtEur, 7);
    }
    if (s.topParts.length) {
      sectionTitle('Top Parts by Revenue');
      barChart(s.topParts.map(p => ({ label: p.name, value: Math.round(p.revenue), color: [99, 102, 241] as RGB })), fmtEur, 7);
    }

    sectionTitle('Monthly Breakdown');
    autoTable(pdf, {
      startY: y,
      head: [['Month', 'Revenue', 'Order Lines']],
      body: MONTHS.map((m, i) => [m, fmtEur(s.monthly[i]), fmtNum(s.monthlyOrders[i])]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 1.6 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      theme: 'grid',
      didDrawPage: () => drawHeader(),
    });
  });

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Schivo Medical - Confidential', margin, ph - 5);
    pdf.text(`Page ${i} of ${total}`, pw - margin, ph - 5, { align: 'right' });
  }

  pdf.save(`npi-order-group-report-${periodLabel.replace(/\s+/g, '-').toLowerCase()}-${now.toISOString().slice(0, 10)}.pdf`);
}
