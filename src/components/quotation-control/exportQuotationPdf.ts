import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EnquiryLog } from '@/types/enquiryLog';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

const calcWorkingDays = (start: Date, end: Date): number => {
  const holidayStart = new Date(2025, 11, 23);
  const holidayEnd = new Date(2026, 0, 1);
  let days = 0;
  const cur = new Date(start); cur.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  while (cur < e) {
    const d = cur.getDay();
    const weekend = d === 0 || d === 6;
    const holiday = cur >= holidayStart && cur <= holidayEnd;
    if (!weekend && !holiday) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

export function exportQuotationPdf(enquiries: EnquiryLog[], fileName?: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // ----- Header band (drawn on every page via did-draw hook below) -----
  const drawHeader = () => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pw, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Quotation Dashboard', margin, 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(`Schivo Waterford  •  ${dateStr} ${timeStr}`, margin, 15);
    if (fileName) {
      pdf.text(fileName, pw - margin, 15, { align: 'right' });
    }
  };

  drawHeader();
  let y = 26;

  // ----- Stats -----
  const hasCustomer = (e: EnquiryLog) => Boolean((e.customer || '').trim());
  const base = enquiries.filter(hasCustomer);

  const upper = (s?: string | null) => (s || '').toUpperCase().trim();
  const open = base.filter(e => ['OPEN', 'WIP'].includes(upper(e.status))).length;
  const quoted = base.filter(e => upper(e.status) === 'QUOTED').length;
  const won = base.filter(e => e.po_received === true || ['WON', 'PO RAISED'].includes(upper(e.status))).length;
  const lost = base.filter(e => ['LOST', 'NOT CONVERTED', 'DECLINED', 'CANCELLED'].includes(upper(e.status))).length;
  const onHold = base.filter(e => upper(e.status) === 'ON HOLD' || (e.priority || '').toLowerCase().includes('hold')).length;
  const uniqueCustomers = new Set(base.map(e => e.customer).filter(Boolean)).size;
  const totalQuoted = base.reduce((s, e) => s + (e.quoted_price_euro || 0), 0);
  const totalPo = base.reduce((s, e) => s + (e.po_value_euro || 0), 0);

  const winRate = quoted > 0 ? (won / quoted) * 100 : 0;
  const conv = base.length > 0 ? (won / base.length) * 100 : 0;

  // ----- KPI cards (4 columns x 2 rows) -----
  const kpis = [
    { label: 'Total Enquiries', value: String(base.length), accent: [99, 102, 241] },
    { label: 'Unique Customers', value: String(uniqueCustomers), accent: [139, 92, 246] },
    { label: 'Open', value: String(open), accent: [14, 165, 233] },
    { label: 'Quoted', value: String(quoted), accent: [20, 184, 166] },
    { label: 'Won (PO)', value: String(won), accent: [16, 185, 129] },
    { label: 'Lost', value: String(lost), accent: [244, 63, 94] },
    { label: 'On Hold', value: String(onHold), accent: [245, 158, 11] },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, accent: [168, 85, 247] },
  ];
  const cols = 4;
  const gap = 3;
  const cardW = (pw - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = 20;
  kpis.forEach((k, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = margin + c * (cardW + gap);
    const cy = y + r * (cardH + gap);
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, 'FD');
    pdf.setFillColor(k.accent[0], k.accent[1], k.accent[2]);
    pdf.rect(x, cy, 1.2, cardH, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.text(k.label.toUpperCase(), x + 4, cy + 6);
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.text(k.value, x + 4, cy + 14);
  });
  y += cardH * 2 + gap + 5;

  // ----- Pipeline summary banner -----
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(191, 219, 254);
  pdf.roundedRect(margin, y, pw - margin * 2, 22, 1.5, 1.5, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(30, 64, 175);
  pdf.text('Pipeline Summary', margin + 4, y + 7);
  const items = [
    `Total Quoted Value: ${fmtEur(totalQuoted)}`,
    `Total PO Value: ${fmtEur(totalPo)}`,
    `Conversion Rate: ${conv.toFixed(1)}%`,
    `Avg Quote: ${quoted > 0 ? fmtEur(totalQuoted / quoted) : 'N/A'}`,
    `Avg PO: ${won > 0 ? fmtEur(totalPo / won) : 'N/A'}`,
  ];
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(51, 65, 85);
  items.forEach((t, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    pdf.text(t, margin + 4 + col * ((pw - margin * 2 - 8) / 3), y + 13 + row * 5);
  });
  y += 26;

  // ----- Section title helper -----
  const sectionTitle = (title: string) => {
    if (y + 12 > ph - 12) { pdf.addPage(); drawHeader(); y = 26; }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y + 1.5, margin + 28, y + 1.5);
    pdf.setLineWidth(0.2);
    y += 6;
  };

  // ----- Breakdown tables: status / customers / owners side-by-side via autoTable -----
  const byStatus = Object.entries(
    base.reduce<Record<string, number>>((a, e) => {
      const s = e.status || 'OPEN';
      a[s] = (a[s] || 0) + 1;
      return a;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const byCustomer = Object.entries(
    base.reduce<Record<string, number>>((a, e) => {
      const c = e.customer || 'Unknown';
      a[c] = (a[c] || 0) + 1;
      return a;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const byOwner = Object.entries(
    base.reduce<Record<string, number>>((a, e) => {
      const o = e.npi_owner || 'Unassigned';
      a[o] = (a[o] || 0) + 1;
      return a;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  sectionTitle('Breakdown by Status');
  autoTable(pdf, {
    startY: y,
    head: [['Status', 'Count']],
    body: byStatus.map(([s, c]) => [s, String(c)]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: 'grid',
    didDrawPage: () => drawHeader(),
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  sectionTitle('Top 10 Customers');
  autoTable(pdf, {
    startY: y,
    head: [['Customer', 'Enquiries']],
    body: byCustomer.map(([c, n]) => [c, String(n)]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: 'grid',
    didDrawPage: () => drawHeader(),
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  sectionTitle('By NPI Owner');
  autoTable(pdf, {
    startY: y,
    head: [['Owner', 'Enquiries']],
    body: byOwner.map(([o, n]) => [o, String(n)]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: 'grid',
    didDrawPage: () => drawHeader(),
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  // ----- Open Enquiries with aging (own page) -----
  pdf.addPage(); drawHeader(); y = 26;
  sectionTitle('Open Enquiries (sorted by aging)');
  const today = new Date();
  const openRows = base
    .filter(e => ['OPEN', 'WIP'].includes(upper(e.status)))
    .map(e => {
      let aging: number | null = null;
      if (e.date_received) {
        try {
          const d = new Date(e.date_received);
          if (d <= today) aging = calcWorkingDays(d, today);
        } catch { /* noop */ }
      }
      return { e, aging };
    })
    .sort((a, b) => (b.aging ?? -1) - (a.aging ?? -1));

  autoTable(pdf, {
    startY: y,
    head: [['Enquiry No', 'Customer', 'Details', 'NPI Owner', 'Received', 'Aging (d)']],
    body: openRows.map(({ e, aging }) => [
      e.enquiry_no || '-',
      e.customer || '-',
      (e.details || '-').slice(0, 80),
      e.npi_owner || '-',
      e.date_received ? new Date(e.date_received).toLocaleDateString('en-GB') : '-',
      aging !== null ? String(aging) : '-',
    ]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 24 },
      4: { cellWidth: 20 },
      5: { cellWidth: 16, halign: 'right' },
    },
    theme: 'grid',
    didDrawPage: () => drawHeader(),
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  // ----- Actions list (WIP) -----
  const actions = base
    .filter(e => upper(e.status) === 'WIP' && e.action_required && e.action_required.trim())
    .map(e => ({
      enquiry_no: e.enquiry_no || '-',
      customer: e.customer || '-',
      owner: e.action_owner || 'Unassigned',
      action: e.action_required!.trim(),
    }))
    .sort((a, b) => a.owner.localeCompare(b.owner));

  pdf.addPage(); drawHeader(); y = 26;
  sectionTitle(`Action List (${actions.length})`);

  if (actions.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No outstanding actions on WIP enquiries.', margin, y + 4);
  } else {
    autoTable(pdf, {
      startY: y,
      head: [['Enquiry', 'Customer', 'Owner', 'Action Required']],
      body: actions.map(a => [a.enquiry_no, a.customer, a.owner, a.action]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 30 },
        2: { cellWidth: 26 },
        3: { cellWidth: 'auto' },
      },
      theme: 'grid',
      didDrawPage: () => drawHeader(),
    });
  }

  // ----- Footer on every page -----
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Schivo Medical — Confidential', margin, ph - 4);
    pdf.text(`Page ${i} of ${total}`, pw - margin, ph - 4, { align: 'right' });
  }

  pdf.save(`quotation-dashboard-${now.toISOString().slice(0, 10)}.pdf`);
}
