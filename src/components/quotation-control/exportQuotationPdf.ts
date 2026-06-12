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

// Parse a leading date prefix from action text. Supports "27/01", "27/01/26", "27-01", "27.01.2026", optional dash/colon separator.
const parseActionDate = (text: string): Date | null => {
  if (!text) return null;
  const m = text.match(/^\s*(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  let year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
  if (year < 100) year += 2000;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
};

const stripDatePrefix = (text: string): string =>
  text.replace(/^\s*\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?\s*[-–—:]?\s*/i, '').trim();

type RGB = [number, number, number];

export function exportQuotationPdf(enquiries: EnquiryLog[], fileName?: string) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

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
    if (fileName) pdf.text(fileName, pw - margin, 15, { align: 'right' });
  };

  drawHeader();
  let y = 26;

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 12) {
      pdf.addPage();
      drawHeader();
      y = 26;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y + 1.5, margin + 28, y + 1.5);
    pdf.setLineWidth(0.2);
    y += 7;
  };

  // ----- stats -----
  const upper = (s?: string | null) => (s || '').toUpperCase().trim();
  const hasCustomer = (e: EnquiryLog) => Boolean((e.customer || '').trim());
  const base = enquiries.filter(hasCustomer);

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

  // ----- KPI dashboard cards -----
  const drawKpiGrid = (kpis: { label: string; value: string; accent: RGB; tint: RGB }[], cols: number, cardH: number) => {
    const gap = 5;
    const cardW = (pw - margin * 2 - gap * (cols - 1)) / cols;
    const rows = Math.ceil(kpis.length / cols);
    ensureSpace(rows * (cardH + gap));
    kpis.forEach((k, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = margin + c * (cardW + gap);
      const cy = y + r * (cardH + gap);
      pdf.setFillColor(k.tint[0], k.tint[1], k.tint[2]);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, cy, cardW, cardH, 2, 2, 'FD');
      pdf.setFillColor(k.accent[0], k.accent[1], k.accent[2]);
      pdf.rect(x, cy, 1.4, cardH, 'F');
      pdf.setFontSize(6.8);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont('helvetica', 'bold');
      pdf.text(k.label.toUpperCase(), x + 4, cy + 5);
      pdf.setFontSize(13);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(k.value, x + 4, cy + cardH - 3.5);
    });
    y += rows * (cardH + gap) + 2;
  };

  sectionTitle('Key Indicators');
  drawKpiGrid([
    { label: 'Total Enquiries', value: String(base.length), accent: [99, 102, 241], tint: [238, 242, 255] },
    { label: 'Unique Customers', value: String(uniqueCustomers), accent: [139, 92, 246], tint: [245, 243, 255] },
    { label: 'Open', value: String(open), accent: [14, 165, 233], tint: [240, 249, 255] },
    { label: 'Quoted', value: String(quoted), accent: [20, 184, 166], tint: [240, 253, 250] },
    { label: 'Won (PO)', value: String(won), accent: [16, 185, 129], tint: [236, 253, 245] },
    { label: 'Lost', value: String(lost), accent: [244, 63, 94], tint: [255, 241, 242] },
    { label: 'On Hold', value: String(onHold), accent: [245, 158, 11], tint: [255, 251, 235] },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, accent: [168, 85, 247], tint: [250, 245, 255] },
  ], 4, 16);

  // ----- Pipeline summary banner (compact, like before) -----
  ensureSpace(26);
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
  y += 28;

  // ----- Status breakdown as horizontal bars -----
  const statusColors: Record<string, RGB> = {
    'OPEN': [59, 130, 246],
    'WIP': [14, 165, 233],
    'QUOTED': [20, 184, 166],
    'WON': [34, 197, 94],
    'PO RAISED': [16, 185, 129],
    'LOST': [239, 68, 68],
    'NOT CONVERTED': [139, 92, 246],
    'CANCELLED': [107, 114, 128],
    'ON HOLD': [245, 158, 11],
  };

  const byStatus = Object.entries(
    base.reduce<Record<string, number>>((a, e) => {
      const s = e.status || 'OPEN';
      a[s] = (a[s] || 0) + 1;
      return a;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const drawBarChart = (data: [string, number][], color: RGB | ((k: string) => RGB), rowH = 7) => {
    const max = Math.max(1, ...data.map(d => d[1]));
    const labelW = 50;
    const valueW = 14;
    const barAreaW = pw - margin * 2 - labelW - valueW - 4;
    ensureSpace(data.length * rowH + 4);
    data.forEach(([label, value], i) => {
      const ry = y + i * rowH;
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'normal');
      const truncated = label.length > 28 ? label.slice(0, 27) + '…' : label;
      pdf.text(truncated, margin, ry + 4.5);
      // track
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin + labelW, ry + 1.2, barAreaW, rowH - 2.4, 1, 1, 'F');
      // bar
      const c: RGB = typeof color === 'function' ? color(label) : color;
      pdf.setFillColor(c[0], c[1], c[2]);
      const w = Math.max(1.2, (value / max) * barAreaW);
      pdf.roundedRect(margin + labelW, ry + 1.2, w, rowH - 2.4, 1, 1, 'F');
      // value
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(value), pw - margin, ry + 4.5, { align: 'right' });
    });
    y += data.length * rowH + 4;
  };

  sectionTitle('Enquiries by Status');
  drawBarChart(byStatus, (k) => statusColors[k.toUpperCase()] || [99, 102, 241]);

  const byCustomer = Object.entries(
    base.reduce<Record<string, number>>((a, e) => {
      const c = e.customer || 'Unknown';
      a[c] = (a[c] || 0) + 1;
      return a;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 10);

  sectionTitle('Top 10 Customers');
  drawBarChart(byCustomer, [99, 102, 241]);

  // ----- Open Enquiries (own page) -----
  pdf.addPage(); drawHeader(); y = 26;
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

  const openOverdue = openRows.filter(r => (r.aging ?? 0) > 14).length;
  const openAtRisk = openRows.filter(r => (r.aging ?? 0) > 7 && (r.aging ?? 0) <= 14).length;
  const openFresh = openRows.filter(r => (r.aging ?? 0) <= 7).length;

  sectionTitle('Open Enquiries — Aging Overview');
  drawKpiGrid([
    { label: 'Total Open', value: String(openRows.length), accent: [14, 165, 233], tint: [240, 249, 255] },
    { label: 'Fresh (≤7d)', value: String(openFresh), accent: [34, 197, 94], tint: [240, 253, 244] },
    { label: 'At Risk (8-14d)', value: String(openAtRisk), accent: [245, 158, 11], tint: [255, 251, 235] },
    { label: 'Overdue (>14d)', value: String(openOverdue), accent: [239, 68, 68], tint: [254, 242, 242] },
  ], 4, 22);

  sectionTitle('Open Enquiries (sorted by aging)');
  autoTable(pdf, {
    startY: y,
    head: [['Enquiry', 'Customer', 'Details', 'Owner', 'Received', 'Aging']],
    body: openRows.map(({ e, aging }) => [
      e.enquiry_no || '-',
      e.customer || '-',
      (e.details || '-').slice(0, 80),
      e.npi_owner || '-',
      e.date_received ? new Date(e.date_received).toLocaleDateString('en-GB') : '-',
      aging !== null ? `${aging}d` : '-',
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
      5: { cellWidth: 14, halign: 'right' },
    },
    theme: 'grid',
    didDrawPage: () => drawHeader(),
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const txt = String(data.cell.raw || '');
        const n = parseInt(txt, 10);
        if (!isNaN(n)) {
          if (n > 14) { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [153, 27, 27]; }
          else if (n > 7) { data.cell.styles.fillColor = [254, 243, 199]; data.cell.styles.textColor = [146, 64, 14]; }
          else { data.cell.styles.fillColor = [220, 252, 231]; data.cell.styles.textColor = [22, 101, 52]; }
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  // ----- Action List (WIP) with aging — own page -----
  pdf.addPage(); drawHeader(); y = 26;

  const actions = base
    .filter(e => upper(e.status) === 'WIP' && e.action_required && e.action_required.trim())
    .map(e => {
      const raw = e.action_required!.trim();
      const dt = parseActionDate(raw);
      let aging: number | null = null;
      if (dt && dt <= today) {
        const diff = Math.floor((today.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
        aging = diff >= 0 ? diff : null;
      }
      return {
        enquiry_no: e.enquiry_no || '-',
        customer: e.customer || '-',
        owner: e.action_owner || 'Unassigned',
        action: stripDatePrefix(raw),
        date: dt,
        aging,
      };
    })
    .sort((a, b) => {
      if (a.aging === null && b.aging === null) return 0;
      if (a.aging === null) return 1;
      if (b.aging === null) return -1;
      return b.aging - a.aging;
    });

  const actOverdue = actions.filter(a => (a.aging ?? 0) > 14).length;
  const actAtRisk = actions.filter(a => (a.aging ?? 0) > 7 && (a.aging ?? 0) <= 14).length;
  const actOwners = new Set(actions.map(a => a.owner)).size;

  sectionTitle('Action List — Overview');
  drawKpiGrid([
    { label: 'Total Actions', value: String(actions.length), accent: [99, 102, 241], tint: [238, 242, 255] },
    { label: 'Action Owners', value: String(actOwners), accent: [139, 92, 246], tint: [245, 243, 255] },
    { label: 'At Risk (8-14d)', value: String(actAtRisk), accent: [245, 158, 11], tint: [255, 251, 235] },
    { label: 'Overdue (>14d)', value: String(actOverdue), accent: [239, 68, 68], tint: [254, 242, 242] },
  ], 4, 22);

  sectionTitle(`All Actions (${actions.length})`);
  if (actions.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text('No outstanding actions on WIP enquiries.', margin, y + 4);
  } else {
    autoTable(pdf, {
      startY: y,
      head: [['Enquiry', 'Customer', 'Owner', 'Action Required', 'Date', 'Aging']],
      body: actions.map(a => [
        a.enquiry_no,
        a.customer,
        a.owner,
        a.action,
        a.date ? a.date.toLocaleDateString('en-GB') : '-',
        a.aging !== null ? `${a.aging}d` : '-',
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 28 },
        2: { cellWidth: 22 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 18 },
        5: { cellWidth: 14, halign: 'right' },
      },
      theme: 'grid',
      didDrawPage: () => drawHeader(),
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const txt = String(data.cell.raw || '');
          const n = parseInt(txt, 10);
          if (!isNaN(n)) {
            if (n > 14) { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [153, 27, 27]; }
            else if (n > 7) { data.cell.styles.fillColor = [254, 243, 199]; data.cell.styles.textColor = [146, 64, 14]; }
            else { data.cell.styles.fillColor = [220, 252, 231]; data.cell.styles.textColor = [22, 101, 52]; }
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
  }

  // ----- footer -----
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
