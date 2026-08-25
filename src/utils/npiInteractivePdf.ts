import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NormRow, SiteDataset, isOpenStatus, getSiteRevenueTarget } from '@/utils/npiOrderReport';

/**
 * Interactive GROUP customer report.
 *
 * Interactivity is delivered with real PDF page links (no Acrobat JavaScript),
 * so the site / month / customer buttons work in EVERY viewer: one styled page
 * is pre-rendered per combination and each button jumps to the matching page.
 * The document opens in single-page / hidden-UI mode so only the page you are
 * looking at is visible.
 */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const mLabel = (k: string) => `${MON[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;

type Cell = { t: number; o: number; c: number };

export type SiteBlock = {
  label: string;
  companyRevenue: number;
  customers: string[];
  cust: Record<string, Record<string, Cell>>;
  custTotals: Record<string, number>;
  totals: Record<string, number>;
};

export type ExecParams = {
  /** projected full-year COMPANY revenue (not NPI) entered by the user */
  projectedRevenue: number;
  /** NPVI benchmark / target in percent, e.g. 4.28 */
  npviBenchmark: number;
  /** month the uploaded data ends on, e.g. "July 2026" */
  endMonthLabel?: string;
  /** year label used on the operational plan revenue card */
  planYear?: string;
};

export type InteractiveGroupData = {
  title: string;
  period: string;
  scope: string;
  months: { k: string; label: string }[];
  sites: SiteBlock[];
  /** number of customer pages rendered per site */
  custPages: number;
  params: ExecParams;
};

const emptyCell = (): Cell => ({ t: 0, o: 0, c: 0 });

export const buildInteractiveGroupData = (
  inputs: { ds: SiteDataset; label: string; companyRevenue?: number }[],
  year: string,
  npiOnly: boolean,
  params: ExecParams = { projectedRevenue: 0, npviBenchmark: 0 },
  maxMonths = 12,
  maxCustomers = 10
): InteractiveGroupData => {

  const prepared = inputs.map(({ ds, label, companyRevenue }) => {
    let rows: NormRow[] = ds.rows;
    if (npiOnly && ds.hasNpiCol) rows = rows.filter(r => r.isNpi);
    if (year !== 'all') rows = rows.filter(r => r.date && String(r.date.getFullYear()) === year);
    return {
      label,
      rows: rows.filter(r => r.date),
      companyRevenue: companyRevenue ?? getSiteRevenueTarget(ds.site, year),
    };
  });

  const allKeys = Array.from(
    new Set(prepared.flatMap(p => p.rows.map(r => mKey(r.date!))))
  ).sort();
  const months = allKeys.slice(-maxMonths);
  const monthSet = new Set(months);

  const blockFrom = (label: string, rows: NormRow[], companyRevenue: number): SiteBlock => {
    const cust: Record<string, Record<string, Cell>> = {};
    const custTotals: Record<string, number> = {};
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
      custTotals[name] = (custTotals[name] || 0) + r.revenue;
    });

    const customers = Object.keys(cust).sort((a, b) => (custTotals[b] || 0) - (custTotals[a] || 0));
    return { label, companyRevenue, customers, cust, custTotals, totals };
  };

  const siteBlocks = prepared.map(p => blockFrom(p.label, p.rows, p.companyRevenue));
  const sites: SiteBlock[] =
    siteBlocks.length > 1
      ? [
          blockFrom(
            'All sites (group)',
            prepared.flatMap(p => p.rows),
            prepared.reduce((s, p) => s + p.companyRevenue, 0)
          ),
          ...siteBlocks,
        ]
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
    custPages: Math.max(1, Math.min(maxCustomers, Math.max(...sites.map(s => s.customers.length), 1))),
    params: { ...params, planYear: params.planYear ?? year },
  };

};

// ---------- PDF generation (link-driven interactivity) ----------
const fmtEur = (n: number) => {
  const v = Math.round(n || 0) || 0;
  return '\u20AC' + new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(v);
};
const fmtNum = (n: number) => (n ? new Intl.NumberFormat('en-IE').format(Math.round(n)) : '-');
const fmtPct = (n: number | null) => (n === null ? 'n/a' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);
const fmtPp = (n: number | null) => (n === null ? 'n/a' : `${n.toFixed(2)}%`);
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
  const nCust = data.custPages;
  const perSite = nMonths + 1 + nCust;                    // month pages + matrix + customer pages
  const OVERVIEW = 1;          // executive summary
  const GROUP = 2;             // group deep dive (site comparison + top group customers)
  const base = (si: number) => GROUP + si * perSite;
  const pageOf = (si: number, mi: number) => base(si) + mi + 1;
  const matrixOf = (si: number) => base(si) + nMonths + 1;
  const custOf = (si: number, ci: number) => base(si) + nMonths + 1 + ci + 1;
  const totalPages = GROUP + nSites * perSite;


  for (let i = 1; i < totalPages; i++) pdf.addPage();

  const cellOf = (S: SiteBlock, c: string, k: string): Cell => S.cust[c]?.[k] || emptyCell();
  const siteTotal = (S: SiteBlock) => data.months.reduce((s, m) => s + (S.totals[m.k] || 0), 0);
  const npvi = (rev: number, company: number) => (company > 0 ? (rev / company) * 100 : null);
  const ranking = (S: SiteBlock, k: string) =>
    S.customers.map(c => ({ n: c, v: cellOf(S, c, k).t })).filter(r => r.v > 0).sort((a, b) => b.v - a.v);

  // ---------- shared chrome ----------
  const header = (_subtitle?: string) => {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pw, 22, 'F');
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 22, pw, 1, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('NPI Vitality Scoring', M, 13.5);
  };

  const footer = (n: number) => {
    pdf.setDrawColor(226, 232, 240);
    pdf.line(M, ph - 10, pw - M, ph - 10);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('Interactive report - click EXEC SUMMARY / SITE / MONTH / CUSTOMER buttons to navigate. Works in any PDF reader.', M, ph - 6);
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

  const darkPill = (text: string, x: number, y: number, w: number, target: number) => {
    pdf.setFillColor(30, 41, 59);
    pdf.setDrawColor(30, 41, 59);
    pdf.roundedRect(x, y, w, 7, 1.2, 1.2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(text, x + w / 2, y + 4.6, { align: 'center' });
    pdf.link(x, y, w, 7, { pageNumber: target });
  };

  const label = (text: string, y: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.2);
    pdf.setTextColor(100, 116, 139);
    pdf.text(text, M, y);
  };

  /** SITE / MONTH / CUSTOMER navigation strips. Returns the y after the strips. */
  const controls = (
    si: number,
    mi: number | null,
    ci: number | null,
    view: 'month' | 'matrix' | 'customer'
  ) => {
    label('SITE', 29);
    const navW = 84;
    const sw = Math.min(52, (pw - 2 * M - navW - (nSites - 1) * 3) / nSites);
    data.sites.forEach((s, i) => {
      const target =
        view === 'matrix' ? matrixOf(i) : view === 'customer' ? custOf(i, ci ?? 0) : pageOf(i, mi ?? 0);
      pill(s.label, M + i * (sw + 3), 31, sw, 7, i === si, target);
    });
    darkPill('< EXEC SUMMARY', pw - M - navW, 31, 40, OVERVIEW);
    darkPill('MONTHLY MATRIX', pw - M - 42, 31, 42, matrixOf(si));

    label('MONTH', 45);
    const mw = Math.min(20, (pw - 2 * M - (nMonths - 1) * 2.5) / nMonths);
    data.months.forEach((m, i) => {
      pill(m.label, M + i * (mw + 2.5), 47, mw, 7, view === 'month' && mi === i, pageOf(si, i));
    });

    const S = data.sites[si];
    label('CUSTOMER (top ' + nCust + ')', 61);
    const cw = Math.min(30, (pw - 2 * M - (nCust - 1) * 2.5) / nCust);
    for (let i = 0; i < nCust; i++) {
      const name = S.customers[i];
      pill(name ? clip(name, 18) : '-', M + i * (cw + 2.5), 63, cw, 7,
        view === 'customer' && ci === i, custOf(si, i));
    }
    return 78;
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
      pdf.setFontSize(k.value.length > 16 ? 8.5 : 11.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(clip(k.value, 34), x + 4, y + cardH - 4);
    });
    return y + cardH + 7;
  };

  // ---------- shared group figures ----------
  const G = data.sites[0];
  const gTotal = siteTotal(G);
  const gClosed = data.months.reduce(
    (s, m) => s + G.customers.reduce((a, c) => a + cellOf(G, c, m.k).c, 0), 0);
  const gOpen = gTotal - gClosed;
  const endMonthLabelG =
    data.params?.endMonthLabel || data.months[data.months.length - 1]?.label || data.period;

  // ---------- PAGE 1: OVERVIEW ----------
  {
    pdf.setPage(OVERVIEW);
    header();

    const P = data.params || { projectedRevenue: 0, npviBenchmark: 0 };
    const projected = P.projectedRevenue > 0 ? P.projectedRevenue : 0;
    const actualCompany = G.companyRevenue > 0 ? G.companyRevenue : 0;
    const actualNpvi = actualCompany > 0 ? (gTotal / actualCompany) * 100 : null;
    const npviVsProjected = projected > 0 ? (gTotal / projected) * 100 : null;
    const endMonthTxt = endMonthLabelG;
    const planYearTxt = P.planYear && P.planYear !== 'all' ? ` ${P.planYear}` : '';

    const fmtM = (n: number) => {
      const v = n || 0;
      const a = Math.abs(v);
      if (a >= 1e6) return `${v < 0 ? '-' : ''}\u20AC${(a / 1e6).toFixed(2)}M`;
      if (a >= 1e3) return `${v < 0 ? '-' : ''}\u20AC${(a / 1e3).toFixed(0)}k`;
      return fmtEur(v);
    };
    const pctTxt = (n: number | null) => (n === null ? 'n/a' : `${n.toFixed(1)}%`);

    // site navigation row + pipeline deep dive
    label('GO TO SITE', 29);
    const sw0 = Math.min(58, (pw - 2 * M - 44 - (nSites - 1) * 3) / nSites);
    data.sites.forEach((s, i) => {
      pill(s.label, M + i * (sw0 + 3), 31, sw0, 7, i === 0, i === 0 ? GROUP : pageOf(i, nMonths - 1));
    });
    darkPill('NPI PIPELINE >', pw - M - 42, 31, 42, matrixOf(0));

    // KPI row 1 - group figures
    let y = kpiGrid([
      { label: `NPI revenue (to the end of ${endMonthTxt})`, value: fmtEur(gTotal), accent: [59, 130, 246], tint: [239, 246, 255] },
      { label: 'New Prototype Vitality Index YTD', value: actualNpvi === null ? 'n/a' : `${actualNpvi.toFixed(2)}%`, accent: [139, 92, 246], tint: [245, 243, 255] },
      { label: 'Invoiced (closed)', value: fmtEur(gClosed), accent: [16, 185, 129], tint: [236, 253, 245] },
      { label: 'To invoice (open)', value: fmtEur(gOpen), accent: [245, 158, 11], tint: [255, 251, 235] },
      { label: 'Customers', value: String(G.customers.length), accent: [100, 116, 139], tint: [248, 250, 252] },
    ], 42);

    // KPI row 2 - projected revenue metrics
    y = kpiGrid([
      { label: `Full year${planYearTxt} Operating Plan Revenue`, value: projected > 0 ? fmtM(projected) : 'not set', accent: [37, 99, 235], tint: [239, 246, 255] },
      { label: `Prototype Vitality Index vs Full year${planYearTxt} Operating Plan Revenue`, value: npviVsProjected === null ? 'n/a' : `${npviVsProjected.toFixed(2)}%`, accent: [139, 92, 246], tint: [245, 243, 255] },
    ], y - 2, 15);

    sectionTitle('Site comparison', y);
    autoTable(pdf, {
      startY: y + 4,
      head: [['Site', 'NPI revenue', 'Share of group', 'Prototype Vitality Index', 'Closed', 'Open', 'Customers']],
      body: data.sites.slice(1).map(S => {
        const t = siteTotal(S);
        const closed = data.months.reduce((s, m) => s + S.customers.reduce((a, c) => a + cellOf(S, c, m.k).c, 0), 0);
        return [
          clip(S.label, 34),
          fmtEur(t),
          gTotal > 0 ? `${((t / gTotal) * 100).toFixed(1)}%` : '-',
          npvi(t, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(t, S.companyRevenue)),
          fmtEur(closed),
          fmtEur(t - closed),
          String(S.customers.length),
        ];
      }),
      foot: [[
        'GROUP', fmtEur(gTotal), '100.0%',
        actualNpvi === null ? 'n/a' : `${actualNpvi.toFixed(2)}%`,
        fmtEur(gClosed), fmtEur(gOpen), String(G.customers.length),
      ]],
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8, halign: 'right', textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      columnStyles: { 0: { halign: 'left', cellWidth: 62, fontStyle: 'bold' } },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'right' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' },
      alternateRowStyles: { fillColor: [249, 250, 252] },
      didParseCell: (d: any) => {
        if (d.section === 'head' && d.column.index === 0) d.cell.styles.halign = 'left';
      },
      didDrawCell: (d: any) => {
        if (d.section === 'body' && d.column.index === 0) {
          const S = data.sites.slice(1)[d.row.index];
          const si = data.sites.indexOf(S);
          if (si > 0) pdf.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { pageNumber: pageOf(si, nMonths - 1) });
        }
      },
    });

    let yc = ((pdf as any).lastAutoTable?.finalY || y + 30) + 8;
    sectionTitle('Top 10 group customers - revenue and Prototype Vitality Index contribution', yc);
    const topC = G.customers.slice(0, 10);
    const maxC = Math.max(1, ...topC.map(c => G.custTotals[c] || 0));
    // Fit head + every row inside the remaining space on page 1 so the last
    // customers never spill onto page 2.
    const availC = ph - 14 - (yc + 4);
    const rowHC = Math.max(3.6, Math.min(6, availC / (topC.length + 1.2)));
    const padC = Math.max(0.5, Math.min(1.6, (rowHC - 3) / 2));
    autoTable(pdf, {
      startY: yc + 4,
      head: [['#', 'Customer', 'Share', 'Revenue', '% of NPI Revenue', 'Prototype Vitality Index contribution']],
      body: topC.map((c, i) => [
        String(i + 1),
        clip(c, 40),
        '',
        fmtEur(G.custTotals[c] || 0),
        gTotal > 0 ? `${(((G.custTotals[c] || 0) / gTotal) * 100).toFixed(1)}%` : '-',
        npvi(G.custTotals[c] || 0, G.companyRevenue) === null ? 'n/a' : fmtPp(npvi(G.custTotals[c] || 0, G.companyRevenue)),
      ]),
      margin: { left: M, right: M },
      theme: 'grid',
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      styles: { fontSize: 7.6, cellPadding: padC, minCellHeight: rowHC, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'left', minCellHeight: rowHC },
      alternateRowStyles: { fillColor: [249, 250, 252] },

      columnStyles: {
        0: { cellWidth: 9, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
        1: { cellWidth: 66 },
        2: { cellWidth: 46 },
        3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 28, halign: 'right' },
        5: { halign: 'right' },
      },
      didDrawCell: (d: any) => {
        if (d.section !== 'body') return;
        const name = topC[d.row.index];
        if (!name) return;
        if (d.column.index === 2) {
          const bw = d.cell.width - 4;
          const by = d.cell.y + d.cell.height / 2 - 1.5;
          pdf.setFillColor(226, 232, 240);
          pdf.roundedRect(d.cell.x + 2, by, bw, 3, 0.8, 0.8, 'F');
          pdf.setFillColor(59, 130, 246);
          pdf.roundedRect(d.cell.x + 2, by, Math.max(0.8, ((G.custTotals[name] || 0) / maxC) * bw), 3, 0.8, 0.8, 'F');
        }
        if (d.column.index === 1 && d.row.index < nCust) {
          pdf.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { pageNumber: custOf(0, d.row.index) });
        }
      },
    });

    footer(OVERVIEW);
  }


  // ---------- PAGE 2: GROUP DEEP DIVE ----------
  {
    pdf.setPage(GROUP);
    header();

    label('GO TO SITE', 29);
    const sw = Math.min(58, (pw - 2 * M - 84 - (nSites - 1) * 3) / nSites);
    data.sites.forEach((s, i) => {
      pill(s.label, M + i * (sw + 3), 31, sw, 7, false, pageOf(i, nMonths - 1));
    });
    darkPill('< EXEC SUMMARY', pw - M - 84, 31, 40, OVERVIEW);
    darkPill('MONTHLY MATRIX', pw - M - 42, 31, 42, matrixOf(0));

    let y = kpiGrid([
      { label: `NPI revenue (to the end of ${endMonthLabelG})`, value: fmtEur(gTotal), accent: [59, 130, 246], tint: [239, 246, 255] },
      { label: 'Prototype Vitality Index', value: npvi(gTotal, G.companyRevenue) === null ? 'n/a' : fmtPp(npvi(gTotal, G.companyRevenue)), accent: [139, 92, 246], tint: [245, 243, 255] },
      { label: 'Invoiced (closed)', value: fmtEur(gClosed), accent: [16, 185, 129], tint: [236, 253, 245] },
      { label: 'To invoice (open)', value: fmtEur(gOpen), accent: [245, 158, 11], tint: [255, 251, 235] },
      { label: 'Customers', value: String(G.customers.length), accent: [100, 116, 139], tint: [248, 250, 252] },
    ], 42);

    sectionTitle('Site comparison', y);
    autoTable(pdf, {
      startY: y + 4,
      head: [['Site', 'NPI revenue', 'Share of group', 'Prototype Vitality Index', 'Closed', 'Open', 'Customers']],
      body: data.sites.slice(1).map(S => {
        const t = siteTotal(S);
        const closed = data.months.reduce((s, m) => s + S.customers.reduce((a, c) => a + cellOf(S, c, m.k).c, 0), 0);
        return [
          clip(S.label, 34),
          fmtEur(t),
          gTotal > 0 ? `${((t / gTotal) * 100).toFixed(1)}%` : '-',
          npvi(t, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(t, S.companyRevenue)),
          fmtEur(closed),
          fmtEur(t - closed),
          String(S.customers.length),
        ];
      }),
      foot: [[
        'GROUP', fmtEur(gTotal), '100.0%',
        npvi(gTotal, G.companyRevenue) === null ? 'n/a' : fmtPp(npvi(gTotal, G.companyRevenue)),
        fmtEur(gClosed), fmtEur(gOpen), String(G.customers.length),
      ]],
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8, halign: 'right', textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      columnStyles: { 0: { halign: 'left', cellWidth: 62, fontStyle: 'bold' } },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'right' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' },
      alternateRowStyles: { fillColor: [249, 250, 252] },
    });

    let y2 = ((pdf as any).lastAutoTable?.finalY || y + 30) + 8;
    sectionTitle('Top 10 group customers - revenue and Prototype Vitality Index contribution', y2);
    const top = G.customers.slice(0, 10);
    const maxV = Math.max(1, ...top.map(c => G.custTotals[c] || 0));
    const availV = ph - 14 - (y2 + 4);
    const rowHV = Math.max(3.6, Math.min(6, availV / (top.length + 1.2)));
    const padV = Math.max(0.5, Math.min(1.6, (rowHV - 3) / 2));
    autoTable(pdf, {
      startY: y2 + 4,
      head: [['#', 'Customer', 'Share', 'Revenue', '% of NPI Revenue', 'Prototype Vitality Index contribution']],
      body: top.map((c, i) => [
        String(i + 1),
        clip(c, 40),
        '',
        fmtEur(G.custTotals[c] || 0),
        gTotal > 0 ? `${(((G.custTotals[c] || 0) / gTotal) * 100).toFixed(1)}%` : '-',
        npvi(G.custTotals[c] || 0, G.companyRevenue) === null ? 'n/a' : fmtPp(npvi(G.custTotals[c] || 0, G.companyRevenue)),
      ]),
      margin: { left: M, right: M },
      theme: 'grid',
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      styles: { fontSize: 7.6, cellPadding: padV, minCellHeight: rowHV, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'left', minCellHeight: rowHV },
      alternateRowStyles: { fillColor: [249, 250, 252] },

      columnStyles: {
        0: { cellWidth: 9, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
        1: { cellWidth: 66 },
        2: { cellWidth: 46 },
        3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 28, halign: 'right' },
        5: { halign: 'right' },
      },
      didDrawCell: (d: any) => {
        if (d.section !== 'body') return;
        const name = top[d.row.index];
        if (!name) return;
        if (d.column.index === 2) {
          const bw = d.cell.width - 4;
          const cy = d.cell.y + d.cell.height / 2 - 1.5;
          pdf.setFillColor(226, 232, 240);
          pdf.roundedRect(d.cell.x + 2, cy, bw, 3, 0.8, 0.8, 'F');
          pdf.setFillColor(59, 130, 246);
          pdf.roundedRect(d.cell.x + 2, cy, Math.max(0.8, ((G.custTotals[name] || 0) / maxV) * bw), 3, 0.8, 0.8, 'F');
        }
        if (d.column.index === 1 && d.row.index < nCust) {
          pdf.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { pageNumber: custOf(0, d.row.index) });
        }
      },
    });
    footer(GROUP);
  }


  // ---------- month pages ----------
  data.sites.forEach((S, si) => {
    data.months.forEach((m, mi) => {
      pdf.setPage(pageOf(si, mi));
      header(`${S.label}  |  ${m.label}`);
      let y = controls(si, mi, null, 'month');

      const k = data.months[mi].k;
      const prevK = mi > 0 ? data.months[mi - 1].k : null;
      const r = ranking(S, k);
      const total = S.totals[k] || 0;
      const top10 = r.slice(0, 10).reduce((s, x) => s + x.v, 0);
      const prevTotal = prevK ? S.totals[prevK] || 0 : 0;
      const mom = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
      const closed = r.reduce((s, x) => s + cellOf(S, x.n, k).c, 0);
      const open = r.reduce((s, x) => s + cellOf(S, x.n, k).o, 0);
      const monthNpvi = npvi(total, S.companyRevenue);

      y = kpiGrid([
        { label: 'Revenue in month', value: fmtEur(total), accent: [59, 130, 246], tint: [239, 246, 255] },
        { label: 'Prototype Vitality Index in month', value: monthNpvi === null ? 'n/a' : fmtPp(monthNpvi), accent: [139, 92, 246], tint: [245, 243, 255] },
        { label: 'Top 10 customers', value: fmtEur(top10), accent: [15, 23, 42], tint: [241, 245, 249] },
        { label: 'Other customers', value: fmtEur(total - top10), accent: [100, 116, 139], tint: [248, 250, 252] },
        { label: 'Invoiced (closed)', value: fmtEur(closed), accent: [16, 185, 129], tint: [236, 253, 245] },
        { label: 'To invoice (open)', value: fmtEur(open), accent: [245, 158, 11], tint: [255, 251, 235] },
        { label: 'Month over month', value: fmtPct(mom), accent: [37, 99, 235], tint: [239, 246, 255] },
      ], y);

      sectionTitle(`Top 10 Customers - ${S.label} - ${m.label}`, y);
      y += 6;

      const max = Math.max(1, ...r.slice(0, 10).map(x => x.v));
      const shown = r.slice(0, 10);
      autoTable(pdf, {
        startY: y,
        head: [['#', 'Customer', 'Share', 'Revenue', '% of NPI Revenue', 'Prototype Vitality Index', 'vs prev. month', 'Closed', 'Open']],
        body: shown.map((x, j) => {
          const pv = prevK ? cellOf(S, x.n, prevK).t : 0;
          const c = cellOf(S, x.n, k);
          return [
            String(j + 1),
            clip(x.n, 38),
            '',
            fmtEur(x.v),
            total > 0 ? `${((x.v / total) * 100).toFixed(1)}%` : '-',
            npvi(x.v, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(x.v, S.companyRevenue)),
            pv > 0 ? fmtPct(((x.v - pv) / pv) * 100) : x.v > 0 ? 'new' : '-',
            fmtEur(c.c),
            fmtEur(c.o),
          ];
        }),
        foot: [[
          '', 'MONTH TOTAL', '', fmtEur(total), '100.0%',
          monthNpvi === null ? 'n/a' : fmtPp(monthNpvi), fmtPct(mom), fmtEur(closed), fmtEur(open),
        ]],
        margin: { left: M, right: M },
        theme: 'grid',
        styles: { fontSize: 7.6, cellPadding: 1.5, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 6.8, halign: 'left' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.6 },
        alternateRowStyles: { fillColor: [249, 250, 252] },
        columnStyles: {
          0: { cellWidth: 9, halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] },
          1: { cellWidth: 62 },
          2: { cellWidth: 40 },
          3: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 21, halign: 'right' },
          5: { cellWidth: 24, halign: 'right' },
          6: { cellWidth: 26, halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
        },
        didDrawCell: (d: any) => {
          if (d.section !== 'body') return;
          const row = shown[d.row.index];
          if (!row) return;
          if (d.column.index === 2) {
            const bw = d.cell.width - 4;
            const cy = d.cell.y + d.cell.height / 2 - 1.5;
            pdf.setFillColor(226, 232, 240);
            pdf.roundedRect(d.cell.x + 2, cy, bw, 3, 0.8, 0.8, 'F');
            pdf.setFillColor(59, 130, 246);
            pdf.roundedRect(d.cell.x + 2, cy, Math.max(0.8, (row.v / max) * bw), 3, 0.8, 0.8, 'F');
          }
          if (d.column.index === 1) {
            const idx = S.customers.indexOf(row.n);
            if (idx >= 0 && idx < nCust) {
              pdf.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { pageNumber: custOf(si, idx) });
            }
          }
        },
      });
      footer(pageOf(si, mi));
    });
  });

  // ---------- matrix page per site ----------
  data.sites.forEach((S, si) => {
    pdf.setPage(matrixOf(si));
    header(`${S.label}  |  Monthly revenue by customer`);
    const y = controls(si, null, null, 'matrix');
    sectionTitle(`Monthly Revenue by Customer - ${S.label}`, y);

    const top = S.customers.slice(0, 18);
    autoTable(pdf, {
      startY: y + 5,
      head: [['Customer', ...data.months.map(m => m.label), 'Total', 'Prototype Vitality Index']],
      body: top.map((c, j) => {
        const vals = data.months.map(m => cellOf(S, c, m.k).t);
        const tot = vals.reduce((s, v) => s + v, 0);
        return [
          `${j + 1}. ${clip(c, 30)}`,
          ...vals.map(v => fmtNum(v)),
          fmtNum(tot),
          npvi(tot, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(tot, S.companyRevenue)),
        ];
      }),
      foot: [[
        'SITE TOTAL',
        ...data.months.map(m => fmtNum(S.totals[m.k] || 0)),
        fmtNum(siteTotal(S)),
        npvi(siteTotal(S), S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(siteTotal(S), S.companyRevenue)),
      ]],
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { fontSize: 6.4, cellPadding: 1.1, halign: 'right', textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      columnStyles: { 0: { halign: 'left', cellWidth: 50, fontStyle: 'bold' } },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, halign: 'right', fontSize: 6.4 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' },
      alternateRowStyles: { fillColor: [249, 250, 252] },
      didDrawCell: (d: any) => {
        if (d.section !== 'body' || d.column.index !== 0) return;
        if (d.row.index < nCust) {
          pdf.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { pageNumber: custOf(si, d.row.index) });
        }
      },
    });
    footer(matrixOf(si));
  });

  // ---------- customer pages per site ----------
  data.sites.forEach((S, si) => {
    for (let ci = 0; ci < nCust; ci++) {
      const page = custOf(si, ci);
      pdf.setPage(page);
      const name = S.customers[ci];
      header(`${S.label}  |  Customer: ${name || 'n/a'}`);
      let y = controls(si, null, ci, 'customer');

      if (!name) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text('No customer at this ranking position for this site.', M, y + 6);
        footer(page);
        continue;
      }

      const vals = data.months.map(m => cellOf(S, name, m.k));
      const tot = S.custTotals[name] || 0;
      const closed = vals.reduce((s, c) => s + c.c, 0);
      const open = vals.reduce((s, c) => s + c.o, 0);
      const site = siteTotal(S);
      const bestIdx = vals.reduce((b, c, i) => (c.t > vals[b].t ? i : b), 0);
      const active = vals.filter(c => c.t > 0).length;
      const last = vals[vals.length - 1]?.t || 0;
      const prev = vals[vals.length - 2]?.t || 0;

      y = kpiGrid([
        { label: 'Revenue (period)', value: fmtEur(tot), accent: [59, 130, 246], tint: [239, 246, 255] },
        { label: 'Prototype Vitality Index contribution', value: npvi(tot, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(tot, S.companyRevenue)), accent: [139, 92, 246], tint: [245, 243, 255] },
        { label: 'Share of site', value: site > 0 ? `${((tot / site) * 100).toFixed(1)}%` : '-', accent: [15, 23, 42], tint: [241, 245, 249] },
        { label: 'Invoiced (closed)', value: fmtEur(closed), accent: [16, 185, 129], tint: [236, 253, 245] },
        { label: 'To invoice (open)', value: fmtEur(open), accent: [245, 158, 11], tint: [255, 251, 235] },
        { label: 'Best month', value: `${data.months[bestIdx].label} ${fmtEur(vals[bestIdx].t)}`, accent: [37, 99, 235], tint: [239, 246, 255] },
        { label: 'Active months', value: `${active} of ${nMonths}`, accent: [100, 116, 139], tint: [248, 250, 252] },
        { label: 'Last vs prev month', value: prev > 0 ? fmtPct(((last - prev) / prev) * 100) : last > 0 ? 'new' : 'n/a', accent: [244, 63, 94], tint: [255, 241, 242] },
      ], y);

      sectionTitle(`Monthly detail and Prototype Vitality Index - ${clip(name, 40)}`, y);
      y += 6;

      const maxV = Math.max(1, ...vals.map(v => v.t));
      autoTable(pdf, {
        startY: y,
        head: [['Month', 'Trend', 'Revenue', 'Closed', 'Open', '% of site month', 'Prototype Vitality Index', 'Rank in month']],
        body: data.months.map((m, i) => {
          const c = vals[i];
          const monthTotal = S.totals[m.k] || 0;
          const rk = ranking(S, m.k).findIndex(x => x.n === name);
          return [
            m.label,
            '',
            fmtEur(c.t),
            fmtEur(c.c),
            fmtEur(c.o),
            monthTotal > 0 ? `${((c.t / monthTotal) * 100).toFixed(1)}%` : '-',
            npvi(c.t, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(c.t, S.companyRevenue)),
            rk >= 0 ? `#${rk + 1}` : '-',
          ];
        }),
        foot: [[
          'TOTAL', '', fmtEur(tot), fmtEur(closed), fmtEur(open),
          site > 0 ? `${((tot / site) * 100).toFixed(1)}%` : '-',
          npvi(tot, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(tot, S.companyRevenue)),
          `#${ci + 1}`,
        ]],
        margin: { left: M, right: M },
        theme: 'grid',
        styles: { fontSize: 7.4, cellPadding: 1.4, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 6.8, halign: 'left' },
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.4 },
        alternateRowStyles: { fillColor: [249, 250, 252] },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold' },
          1: { cellWidth: 62 },
          2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 28, halign: 'right' },
          5: { cellWidth: 30, halign: 'right' },
          6: { cellWidth: 26, halign: 'right' },
          7: { halign: 'right' },
        },
        didDrawCell: (d: any) => {
          if (d.section !== 'body') return;
          if (d.column.index === 0) {
            pdf.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { pageNumber: pageOf(si, d.row.index) });
            return;
          }
          if (d.column.index !== 1) return;
          const v = vals[d.row.index];
          if (!v) return;
          const bw = d.cell.width - 4;
          const cy = d.cell.y + d.cell.height / 2 - 1.5;
          pdf.setFillColor(226, 232, 240);
          pdf.roundedRect(d.cell.x + 2, cy, bw, 3, 0.8, 0.8, 'F');
          pdf.setFillColor(59, 130, 246);
          pdf.roundedRect(d.cell.x + 2, cy, Math.max(0.8, (v.t / maxV) * bw), 3, 0.8, 0.8, 'F');
        },
      });
      footer(page);
    }
  });

  // Open as a single visible page, no thumbnails / no viewer chrome.
  try {
    (pdf as any).setDisplayMode('fullpage', 'single', 'UseNone');
    (pdf as any).viewerPreferences?.({
      HideToolbar: true,
      HideMenubar: true,
      HideWindowUI: true,
      FitWindow: true,
      DisplayDocTitle: true,
    });
  } catch {}

  pdf.save('Group_Interactive_Customer_Report.pdf');
}
