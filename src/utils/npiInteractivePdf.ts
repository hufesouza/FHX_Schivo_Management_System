import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NormRow, SiteDataset, isOpenStatus } from '@/utils/npiOrderReport';

/**
 * Interactive GROUP customer report.
 *
 * Interactivity is delivered with real PDF page links (no Acrobat JavaScript),
 * so the site / month buttons work in EVERY viewer (Acrobat, Preview, Chrome):
 * one styled page is pre-rendered per site x month, and every button jumps to
 * the matching page. Styling follows the static NPI group report.
 */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const mLabel = (k: string) => `${MON[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;

type Cell = { t: number; o: number; c: number };

export type SiteBlock = {
  label: string;
  customers: string[];
  cust: Record<string, Record<string, Cell>>;
  totals: Record<string, number>;
};

export type InteractiveGroupData = {
  title: string;
  period: string;
  scope: string;
  months: { k: string; label: string }[];
  sites: SiteBlock[];
};

const emptyCell = (): Cell => ({ t: 0, o: 0, c: 0 });

export const buildInteractiveGroupData = (
  inputs: { ds: SiteDataset; label: string }[],
  year: string,
  npiOnly: boolean,
  maxMonths = 12
): InteractiveGroupData => {
  const prepared = inputs.map(({ ds, label }) => {
    let rows: NormRow[] = ds.rows;
    if (npiOnly && ds.hasNpiCol) rows = rows.filter(r => r.isNpi);
    if (year !== 'all') rows = rows.filter(r => r.date && String(r.date.getFullYear()) === year);
    return { label, rows: rows.filter(r => r.date) };
  });

  const allKeys = Array.from(
    new Set(prepared.flatMap(p => p.rows.map(r => mKey(r.date!))))
  ).sort();
  const months = allKeys.slice(-maxMonths);
  const monthSet = new Set(months);

  const blockFrom = (label: string, rows: NormRow[]): SiteBlock => {
    const cust: Record<string, Record<string, Cell>> = {};
    const totals: Record<string, number> = {};
    months.forEach(k => { totals[k] = 0; });

    rows.forEach(r => {
      const k = mKey(r.date!);
      if (!monthSet.has(k)) return;
      const name = r.customer || 'Unknown';
      if (!cust[name]) cust[name] = {};
      if (!cust[name][k]) cust[name][k] = emptyCell();
      const cell = cust[name][k];
      cell.t += r.revenue;
      if (isOpenStatus(r.status)) cell.o += r.revenue; else cell.c += r.revenue;
      totals[k] += r.revenue;
    });

    const customers = Object.keys(cust).sort(
      (a, b) =>
        Object.values(cust[b]).reduce((s, c) => s + c.t, 0) -
        Object.values(cust[a]).reduce((s, c) => s + c.t, 0)
    );
    return { label, customers, cust, totals };
  };

  const siteBlocks = prepared.map(p => blockFrom(p.label, p.rows));
  const sites: SiteBlock[] =
    siteBlocks.length > 1
      ? [blockFrom('All sites (group)', prepared.flatMap(p => p.rows)), ...siteBlocks]
      : siteBlocks;

  const period = months.length
    ? months.length === 1
      ? mLabel(months[0])
      : `${mLabel(months[0])} - ${mLabel(months[months.length - 1])}`
    : '-';

  return {
    title: 'NPI Order Dashboard - Group Customer Report',
    period,
    scope:
      siteBlocks.length > 1
        ? `${siteBlocks.length} sites: ${siteBlocks.map(s => s.label).join(', ')}`
        : siteBlocks[0]?.label || '-',
    months: months.map(k => ({ k, label: mLabel(k) })),
    sites,
  };
};

// ---------- PDF generation (link-driven interactivity) ----------
const fmtEur = (n: number) =>
  '\u20AC' + new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtNum = (n: number) => (n ? new Intl.NumberFormat('en-IE').format(Math.round(n)) : '-');
const fmtPct = (n: number | null) => (n === null ? 'n/a' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '.' : s);

export async function exportInteractiveGroupReport(data: InteractiveGroupData) {
  if (!data.months.length) throw new Error('No dated revenue rows available for the selected sites');
  if (!data.sites.length) throw new Error('Select at least one site with uploaded data');

  const pdf = new jsPDF('l', 'mm', 'a4');
  const pw = pdf.internal.pageSize.getWidth();   // 297
  const ph = pdf.internal.pageSize.getHeight();  // 210
  const M = 12;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const nSites = data.sites.length;
  const nMonths = data.months.length;
  const perSite = nMonths + 1;                                  // month pages + matrix page
  const pageOf = (si: number, mi: number) => si * perSite + mi + 1;
  const matrixOf = (si: number) => si * perSite + nMonths + 1;
  const totalPages = nSites * perSite;

  for (let i = 1; i < totalPages; i++) pdf.addPage();

  const cellOf = (S: SiteBlock, c: string, k: string): Cell => S.cust[c]?.[k] || emptyCell();
  const ranking = (S: SiteBlock, k: string) =>
    S.customers.map(c => ({ n: c, v: cellOf(S, c, k).t })).filter(r => r.v > 0).sort((a, b) => b.v - a.v);

  // ---------- shared chrome ----------
  const header = (subtitle: string) => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pw, 22, 'F');
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 22, pw, 1, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('NPI Order Report - Interactive Group Sites', M, 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(190, 205, 226);
    pdf.text(`${subtitle}  |  Period: ${data.period}  |  Generated ${dateStr}`, M, 16.5);
  };

  const footer = (n: number) => {
    pdf.setDrawColor(226, 232, 240);
    pdf.line(M, ph - 10, pw - M, ph - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Interactive report - click the SITE and MONTH buttons to navigate. Works in any PDF reader.', M, ph - 6);
    pdf.text(`Page ${n} of ${totalPages}`, pw - M, ph - 6, { align: 'right' });
  };

  const sectionTitle = (title: string, y: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, M, y);
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.6);
    pdf.line(M, y + 1.6, M + 26, y + 1.6);
    pdf.setLineWidth(0.2);
  };

  const pill = (
    label: string, x: number, y: number, w: number, h: number, active: boolean, target: number
  ) => {
    if (active) {
      pdf.setFillColor(59, 130, 246);
      pdf.setDrawColor(59, 130, 246);
    } else {
      pdf.setFillColor(241, 245, 249);
      pdf.setDrawColor(214, 222, 233);
    }
    pdf.roundedRect(x, y, w, h, 1.2, 1.2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.2);
    pdf.setTextColor(...(active ? [255, 255, 255] : [30, 41, 59]) as [number, number, number]);
    pdf.text(clip(label, Math.floor(w / 1.55)), x + w / 2, y + h / 2 + 1.3, { align: 'center' });
    pdf.link(x, y, w, h, { pageNumber: target });
  };

  const label = (text: string, y: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(text, M, y);
  };

  /** SITE + MONTH navigation strips. Returns the y after the strips. */
  const controls = (si: number, mi: number | null) => {
    label('SITE', 29);
    const sw = Math.min(58, (pw - 2 * M - (nSites - 1) * 3) / nSites);
    data.sites.forEach((s, i) => {
      pill(s.label, M + i * (sw + 3), 31, sw, 7, i === si, mi === null ? matrixOf(i) : pageOf(i, mi));
    });

    label('MONTH', 45);
    const mw = Math.min(20, (pw - 2 * M - (nMonths - 1) * 2.5) / nMonths);
    data.months.forEach((m, i) => {
      pill(m.label, M + i * (mw + 2.5), 47, mw, 7, mi === i, pageOf(si, i));
    });

    // matrix shortcut on the right
    const bx = pw - M - 44;
    pdf.setFillColor(30, 41, 59);
    pdf.setDrawColor(30, 41, 59);
    pdf.roundedRect(bx, 31, 44, 7, 1.2, 1.2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text('MONTHLY MATRIX', bx + 22, 35.5, { align: 'center' });
    pdf.link(bx, 31, 44, 7, { pageNumber: matrixOf(si) });
    return 60;
  };

  const kpiGrid = (
    kpis: { label: string; value: string; accent: [number, number, number]; tint: [number, number, number] }[],
    y: number,
    cardH = 16
  ) => {
    const gap = 4;
    const cw = (pw - 2 * M - gap * (kpis.length - 1)) / kpis.length;
    kpis.forEach((k, i) => {
      const x = M + i * (cw + gap);
      pdf.setFillColor(...k.tint);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, y, cw, cardH, 1.8, 1.8, 'FD');
      pdf.setFillColor(...k.accent);
      pdf.rect(x, y, 1.5, cardH, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(71, 85, 105);
      pdf.text(k.label.toUpperCase(), x + 4, y + 5);
      pdf.setFontSize(k.value.length > 22 ? 8 : 11.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(clip(k.value, 34), x + 4, y + cardH - 4);
    });
    return y + cardH + 7;
  };

  // ---------- month pages ----------
  data.sites.forEach((S, si) => {
    data.months.forEach((m, mi) => {
      pdf.setPage(pageOf(si, mi));
      header(`${S.label}  |  ${m.label}`);
      let y = controls(si, mi);

      const k = m.label && data.months[mi].k;
      const prevK = mi > 0 ? data.months[mi - 1].k : null;
      const r = ranking(S, k);
      const total = S.totals[k] || 0;
      const top10 = r.slice(0, 10).reduce((s, x) => s + x.v, 0);
      const prevTotal = prevK ? S.totals[prevK] || 0 : 0;
      const mom = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
      const closed = r.reduce((s, x) => s + cellOf(S, x.n, k).c, 0);
      const open = r.reduce((s, x) => s + cellOf(S, x.n, k).o, 0);

      y = kpiGrid([
        { label: 'Revenue in month', value: fmtEur(total), accent: [59, 130, 246], tint: [239, 246, 255] },
        { label: 'Top 10 customers', value: fmtEur(top10), accent: [15, 23, 42], tint: [241, 245, 249] },
        { label: 'Other customers', value: fmtEur(total - top10), accent: [100, 116, 139], tint: [248, 250, 252] },
        { label: 'Invoiced (closed)', value: fmtEur(closed), accent: [16, 185, 129], tint: [236, 253, 245] },
        { label: 'To invoice (open)', value: fmtEur(open), accent: [245, 158, 11], tint: [255, 251, 235] },
        { label: 'Month over month', value: fmtPct(mom), accent: [139, 92, 246], tint: [245, 243, 255] },
      ], y);

      sectionTitle(`Top 10 Customers - ${S.label} - ${m.label}`, y);
      y += 6;

      const max = Math.max(1, ...r.slice(0, 10).map(x => x.v));
      autoTable(pdf, {
        startY: y,
        head: [['#', 'Customer', 'Share', 'Revenue', '% of month', 'vs prev. month', 'Closed', 'Open']],
        body: r.slice(0, 10).map((x, j) => {
          const pv = prevK ? cellOf(S, x.n, prevK).t : 0;
          const c = cellOf(S, x.n, k);
          return [
            String(j + 1),
            clip(x.n, 40),
            '',
            fmtEur(x.v),
            total > 0 ? `${((x.v / total) * 100).toFixed(1)}%` : '-',
            pv > 0 ? fmtPct(((x.v - pv) / pv) * 100) : x.v > 0 ? 'new' : '-',
            fmtEur(c.c),
            fmtEur(c.o),
          ];
        }),
        foot: [[
          '', 'MONTH TOTAL', '', fmtEur(total), '100.0%', fmtPct(mom), fmtEur(closed), fmtEur(open),
        ]],
        margin: { left: M, right: M },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.8, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'left' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
          1: { cellWidth: 72 },
          2: { cellWidth: 52 },
          3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 28, halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
        },
        didDrawCell: (d: any) => {
          if (d.section !== 'body' || d.column.index !== 2) return;
          const row = r[d.row.index];
          if (!row) return;
          const bw = d.cell.width - 4;
          const cy = d.cell.y + d.cell.height / 2 - 1.5;
          pdf.setFillColor(226, 232, 240);
          pdf.roundedRect(d.cell.x + 2, cy, bw, 3, 0.8, 0.8, 'F');
          pdf.setFillColor(59, 130, 246);
          pdf.roundedRect(d.cell.x + 2, cy, Math.max(0.8, (row.v / max) * bw), 3, 0.8, 0.8, 'F');
        },
      });
      footer(pageOf(si, mi));
    });
  });

  // ---------- matrix page per site ----------
  data.sites.forEach((S, si) => {
    pdf.setPage(matrixOf(si));
    header(`${S.label}  |  Monthly revenue by customer`);
    const y = controls(si, null);
    sectionTitle(`Monthly Revenue by Customer - ${S.label}`, y);

    const top = S.customers.slice(0, 20);
    autoTable(pdf, {
      startY: y + 6,
      head: [['Customer', ...data.months.map(m => m.label), 'Total']],
      body: top.map((c, j) => {
        const vals = data.months.map(m => cellOf(S, c, m.k).t);
        return [
          `${j + 1}. ${clip(c, 34)}`,
          ...vals.map(v => fmtNum(v)),
          fmtNum(vals.reduce((s, v) => s + v, 0)),
        ];
      }),
      foot: [[
        'SITE TOTAL',
        ...data.months.map(m => fmtNum(S.totals[m.k] || 0)),
        fmtNum(data.months.reduce((s, m) => s + (S.totals[m.k] || 0), 0)),
      ]],
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { fontSize: 6.6, cellPadding: 1.2, halign: 'right', textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      columnStyles: { 0: { halign: 'left', cellWidth: 56, fontStyle: 'bold' } },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, halign: 'right', fontSize: 6.6 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' },
      alternateRowStyles: { fillColor: [249, 250, 252] },
    });
    footer(matrixOf(si));
  });

  pdf.save('Group_Interactive_Customer_Report.pdf');
}
