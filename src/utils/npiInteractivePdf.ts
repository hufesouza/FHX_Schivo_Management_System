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
    params,
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

  // ---------- PAGE 1: EXECUTIVE SUMMARY ----------
  {
    pdf.setPage(OVERVIEW);
    header();

    const P = data.params || { projectedRevenue: 0, npviBenchmark: 0 };
    const projected = P.projectedRevenue > 0 ? P.projectedRevenue : 0;
    const bench = P.npviBenchmark > 0 ? P.npviBenchmark : 0;
    const actualCompany = G.companyRevenue > 0 ? G.companyRevenue : 0;
    const actualNpvi = actualCompany > 0 ? (gTotal / actualCompany) * 100 : null;
    const requiredNpi = projected > 0 && bench > 0 ? (projected * bench) / 100 : 0;
    const npiGap = requiredNpi > 0 ? requiredNpi - gTotal : 0;
    const coverage = requiredNpi > 0 ? (gTotal / requiredNpi) * 100 : null;
    const achievement = projected > 0 && actualCompany > 0 ? (actualCompany / projected) * 100 : null;
    const revGap = projected > 0 && actualCompany > 0 ? projected - actualCompany : 0;
    const openCoverage = npiGap > 0 ? (gOpen / npiGap) * 100 : null;
    const monthsElapsed = data.months.filter(m => (G.totals[m.k] || 0) !== 0).length || nMonths;
    const runRate = monthsElapsed > 0 ? (gTotal / monthsElapsed) * 12 : 0;
    const runVs = requiredNpi > 0 && runRate > 0 ? (runRate / requiredNpi) * 100 : null;
    const status =
      runVs === null ? 'NO TARGET SET' : runVs >= 100 ? 'ON TRACK' : runVs >= 90 ? 'AT RISK' : 'BELOW TARGET';
    const statusCol: [number, number, number] =
      runVs === null ? [100, 116, 139] : runVs >= 100 ? [16, 185, 129] : runVs >= 90 ? [245, 158, 11] : [244, 63, 94];

    const fmtM = (n: number) => {
      const v = n || 0;
      const a = Math.abs(v);
      if (a >= 1e6) return `${v < 0 ? '-' : ''}\u20AC${(a / 1e6).toFixed(2)}M`;
      if (a >= 1e3) return `${v < 0 ? '-' : ''}\u20AC${(a / 1e3).toFixed(0)}k`;
      return fmtEur(v);
    };
    const pctTxt = (n: number | null) => (n === null ? 'n/a' : `${n.toFixed(1)}%`);

    // scope line
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.4);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Executive summary  |  ${data.scope}  |  Period ${data.period}  |  Projected company revenue ${projected > 0 ? fmtM(projected) : 'not provided'}  |  NPVI benchmark ${bench > 0 ? bench.toFixed(2) + '%' : 'not provided'}`,
      M, 28
    );

    // deep dive buttons (top right area / row)
    const navs: { t: string; p: number }[] = [
      { t: 'SITE PERFORMANCE >', p: GROUP },
      { t: 'MONTHLY PERFORMANCE >', p: pageOf(0, nMonths - 1) },
      { t: 'CUSTOMER PERFORMANCE >', p: custOf(0, 0) },
      { t: 'NPI PIPELINE >', p: matrixOf(0) },
    ];
    const nbw = (pw - 2 * M - 3 * 4) / 4;
    navs.forEach((n, i) => darkPill(n.t, M + i * (nbw + 4), 31, nbw, n.p));

    // SECTION A
    sectionTitle('Company performance', 44);
    kpiGrid([
      { label: 'Company revenue (actual)', value: actualCompany > 0 ? fmtM(actualCompany) : 'not set', accent: [15, 23, 42], tint: [241, 245, 249] },
      { label: 'Projected company revenue', value: projected > 0 ? fmtM(projected) : 'not set', accent: [59, 130, 246], tint: [239, 246, 255] },
      { label: 'Revenue achievement', value: pctTxt(achievement), accent: [37, 99, 235], tint: [239, 246, 255] },
      { label: 'Revenue gap', value: projected > 0 && actualCompany > 0 ? fmtM(revGap) : 'n/a', accent: [244, 63, 94], tint: [255, 241, 242] },
    ], 47.5, 14);

    // SECTION B
    sectionTitle('NPI performance', 66);
    kpiGrid([
      { label: 'NPI revenue (period)', value: fmtM(gTotal), accent: [59, 130, 246], tint: [239, 246, 255] },
      { label: 'Actual New Product Vitality Index', value: actualNpvi === null ? 'n/a' : `${actualNpvi.toFixed(2)}%`, accent: [139, 92, 246], tint: [245, 243, 255] },
      { label: 'Required NPI revenue', value: requiredNpi > 0 ? fmtM(requiredNpi) : 'n/a', accent: [15, 23, 42], tint: [241, 245, 249] },
      { label: npiGap > 0 ? 'NPI gap' : 'NPI surplus', value: requiredNpi > 0 ? fmtM(Math.abs(npiGap)) : 'n/a', accent: npiGap > 0 ? [244, 63, 94] : [16, 185, 129], tint: npiGap > 0 ? [255, 241, 242] : [236, 253, 245] },
    ], 69.5, 14);


    // three panels: target coverage / pipeline / outlook
    const panelY = 87;
    const panelH = 30;

    const pgap = 5;
    const panW = (pw - 2 * M - 2 * pgap) / 3;
    const panel = (i: number, title: string) => {
      const x = M + i * (panW + pgap);
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(214, 222, 233);
      pdf.roundedRect(x, panelY, panW, panelH, 1.8, 1.8, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.4);
      pdf.setTextColor(100, 116, 139);
      pdf.text(title.toUpperCase(), x + 4, panelY + 5.5);
      return x;
    };

    // panel 1 - NPI target coverage gauge
    {
      const x = panel(0, 'NPI target coverage');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42);
      pdf.text(pctTxt(coverage), x + 4, panelY + 14);
      const gw = panW - 8;
      const gy = panelY + 16.5;
      pdf.setFillColor(226, 232, 240);
      pdf.roundedRect(x + 4, gy, gw, 4, 1, 1, 'F');
      const frac = coverage === null ? 0 : Math.max(0, Math.min(1, coverage / 100));
      if (frac > 0) {
        pdf.setFillColor(...(coverage !== null && coverage >= 100 ? [16, 185, 129] : [59, 130, 246]) as [number, number, number]);
        pdf.roundedRect(x + 4, gy, Math.max(1, gw * frac), 4, 1, 1, 'F');
      }
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.6);
      pdf.setTextColor(71, 85, 105);
      pdf.text(
        requiredNpi > 0
          ? `${fmtM(gTotal)} achieved / ${fmtM(requiredNpi)} required`
          : 'Enter projected revenue and NPVI benchmark',
        x + 4, gy + 7.5
      );
      if (requiredNpi > 0) {
        pdf.text(
          npiGap > 0 ? `${fmtM(npiGap)} remaining` : `${fmtM(-npiGap)} above requirement`,
          x + 4, gy + 11.3
        );
      }
    }


    // panel 2 - pipeline coverage
    {
      const x = panel(1, 'NPI pipeline coverage');
      const rows: [string, string][] = [
        ['Current NPI revenue', fmtM(gTotal)],
        ['Open NPI (to invoice)', fmtM(gOpen)],
        [npiGap > 0 ? 'NPI gap' : 'NPI surplus', requiredNpi > 0 ? fmtM(Math.abs(npiGap)) : 'n/a'],
      ];
      rows.forEach((r, i) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.8);
        pdf.setTextColor(71, 85, 105);
        pdf.text(r[0], x + 4, panelY + 10.5 + i * 4.2);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(r[1], x + panW - 4, panelY + 10.5 + i * 4.2, { align: 'right' });
      });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(...(openCoverage !== null && openCoverage >= 100 ? [16, 185, 129] : [245, 158, 11]) as [number, number, number]);
      pdf.text(
        openCoverage === null ? (requiredNpi > 0 ? 'no gap' : 'n/a') : `${openCoverage.toFixed(0)}%`,
        x + 4, panelY + 27
      );
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.2);
      pdf.setTextColor(71, 85, 105);
      const msg =
        requiredNpi <= 0
          ? 'Benchmark not provided - coverage not calculated.'
          : npiGap <= 0
            ? 'No NPI gap: current NPI revenue already meets the requirement.'
            : openCoverage !== null && openCoverage >= 100
              ? `Open NPI provides ${openCoverage.toFixed(0)}% coverage of the identified NPI gap.`
              : `Open NPI provides ${(openCoverage || 0).toFixed(0)}% coverage of the identified NPI gap (not sufficient).`;
      pdf.text(pdf.splitTextToSize(msg, panW - 28), x + 24, panelY + 24.5);
    }

    // panel 3 - outlook
    {
      const x = panel(2, 'NPI outlook');
      const rows: [string, string][] = [
        [`Annualised NPI run rate (${monthsElapsed} mth)`, runRate > 0 ? fmtM(runRate) : 'n/a'],
        ['Required NPI revenue', requiredNpi > 0 ? fmtM(requiredNpi) : 'n/a'],
        ['Forecast gap / surplus', requiredNpi > 0 && runRate > 0 ? fmtM(runRate - requiredNpi) : 'n/a'],
        ['Run rate vs required', pctTxt(runVs)],
      ];
      rows.forEach((r, i) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.6);
        pdf.setTextColor(71, 85, 105);
        pdf.text(r[0], x + 4, panelY + 10.5 + i * 4);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(r[1], x + panW - 4, panelY + 10.5 + i * 4, { align: 'right' });
      });
      pdf.setFillColor(...statusCol);
      pdf.roundedRect(x + 4, panelY + 23, 44, 5.4, 1.2, 1.2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.setTextColor(255, 255, 255);
      pdf.text(status, x + 26, panelY + 26.7, { align: 'center' });
    }


    // SECTION E - site performance (compact)
    let sy = panelY + panelH + 6;
    sectionTitle('Site performance', sy);
    pill('VIEW SITE DETAILS >', pw - M - 42, sy - 4, 42, 6, false, GROUP);
    const detail = data.sites.slice(1, 7);
    const npviOf = (S: SiteBlock) => {
      const t = siteTotal(S);
      return S.companyRevenue > 0 ? (t / S.companyRevenue) * 100 : 0;
    };
    const closedOf = (S: SiteBlock) =>
      data.months.reduce((s, m) => s + S.customers.reduce((a, c) => a + cellOf(S, c, m.k).c, 0), 0);
    const leadRev = detail.reduce((b, S) => (siteTotal(S) > siteTotal(b) ? S : b), detail[0]);
    const leadNpvi = detail.reduce((b, S) => (npviOf(S) > npviOf(b) ? S : b), detail[0]);
    const leadOpen = detail.reduce(
      (b, S) => (siteTotal(S) - closedOf(S) > siteTotal(b) - closedOf(b) ? S : b), detail[0]);

    autoTable(pdf, {
      startY: sy + 3,
      head: [['Site', 'NPI revenue', '% of NPI Revenue', 'New Product Vitality Index', 'Closed', 'Open', 'Leading in']],
      body: detail.map(S => {
        const t = siteTotal(S);
        const c = closedOf(S);
        const tags: string[] = [];
        if (S === leadRev) tags.push('NPI revenue');
        if (S === leadNpvi) tags.push('vitality');
        if (S === leadOpen) tags.push('open NPI');
        return [
          clip(S.label, 34), fmtM(t),
          gTotal > 0 ? `${((t / gTotal) * 100).toFixed(1)}%` : '-',
          S.companyRevenue > 0 ? `${npviOf(S).toFixed(2)}%` : 'n/a',
          fmtM(c), fmtM(t - c), tags.join(', ') || '-',
        ];
      }),
      foot: [[
        'GROUP', fmtM(gTotal), '100.0%',
        actualNpvi === null ? 'n/a' : `${actualNpvi.toFixed(2)}%`,
        fmtM(gClosed), fmtM(gOpen), '',
      ]],
      margin: { left: M, right: M },
      theme: 'grid',
      styles: { fontSize: 7.2, cellPadding: 1.3, halign: 'right', textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      columnStyles: {
        0: { halign: 'left', cellWidth: 58, fontStyle: 'bold' },
        6: { halign: 'left', cellWidth: 52, textColor: [37, 99, 235] },
      },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 6.6, halign: 'right' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'right' },
      alternateRowStyles: { fillColor: [249, 250, 252] },
      didParseCell: (d: any) => {
        if (d.section === 'head' && (d.column.index === 0 || d.column.index === 6)) d.cell.styles.halign = 'left';
      },

      didDrawCell: (d: any) => {
        if (d.section === 'body' && d.column.index === 0) {
          const S = detail[d.row.index];
          const si = data.sites.indexOf(S);
          if (si > 0) pdf.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { pageNumber: pageOf(si, nMonths - 1) });
        }
      },
    });

    // SECTION F - customer concentration
    let cy = Math.min(((pdf as any).lastAutoTable?.finalY || sy + 24) + 6, 160);
    sectionTitle('Customer concentration', cy);
    pill('VIEW CUSTOMER DETAILS >', pw - M - 48, cy - 4, 48, 6, false, custOf(0, 0));
    const sumTop = (n: number) => G.customers.slice(0, n).reduce((s, c) => s + (G.custTotals[c] || 0), 0);
    const share = (v: number) => (gTotal > 0 ? `${((v / gTotal) * 100).toFixed(1)}%` : 'n/a');
    const top1Name = G.customers[0] || 'n/a';
    cy = kpiGrid([
      { label: `Top customer - ${clip(top1Name, 26)}`, value: `${fmtM(sumTop(1))}  (${share(sumTop(1))})`, accent: [59, 130, 246], tint: [239, 246, 255] },
      { label: 'Top 3 customers', value: `${fmtM(sumTop(3))}  (${share(sumTop(3))})`, accent: [37, 99, 235], tint: [239, 246, 255] },
      { label: 'Top 10 customers', value: `${fmtM(sumTop(10))}  (${share(sumTop(10))})`, accent: [15, 23, 42], tint: [241, 245, 249] },
      { label: 'Active customers', value: String(G.customers.length), accent: [100, 116, 139], tint: [248, 250, 252] },
    ], cy + 4, 12);


    // MANAGEMENT INSIGHT
    sectionTitle('Management insight', cy - 1);
    const insight = [
      actualNpvi === null
        ? `NPI revenue for the period is ${fmtM(gTotal)}; actual company revenue is not set, so the vitality index cannot be calculated.`
        : `NPI currently represents ${actualNpvi.toFixed(2)}% of actual company revenue of ${fmtM(actualCompany)}.`,
      requiredNpi > 0
        ? `Against the ${fmtM(projected)} projected revenue target, ${fmtM(requiredNpi)} of NPI revenue is required to hold the ${bench.toFixed(2)}% benchmark. Current NPI revenue is ${fmtM(gTotal)}, ${npiGap > 0 ? `leaving a ${fmtM(npiGap)} gap` : `which is ${fmtM(-npiGap)} above the requirement`}.`
        : 'No projected revenue or NPVI benchmark was provided for this report, so target coverage is not calculated.',
      openCoverage !== null
        ? `Current open NPI of ${fmtM(gOpen)} provides ${openCoverage.toFixed(0)}% coverage of this gap (coverage indicator, not a forecast).`
        : requiredNpi > 0 ? 'There is no outstanding NPI gap for the selected benchmark.' : '',
      runVs !== null
        ? `The annualised NPI run rate over ${monthsElapsed} reported month(s) is ${fmtM(runRate)}, i.e. ${runVs.toFixed(1)}% of the requirement - status ${status}.`
        : '',
      `${clip(top1Name, 30)} is the largest customer at ${share(sumTop(1))} of NPI revenue; the top 10 represent ${share(sumTop(10))}.`,
    ].filter(Boolean).join(' ');

    const boxY = cy + 1;
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(214, 222, 233);
    const boxH = Math.max(10, Math.min(18, ph - 13 - boxY));
    pdf.roundedRect(M, boxY, pw - 2 * M, boxH, 1.8, 1.8, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.8);
    pdf.setTextColor(30, 41, 59);
    const lines = (pdf.splitTextToSize(insight, pw - 2 * M - 8) as string[]).slice(0, 4);
    lines.forEach((ln, i) => pdf.text(ln, M + 4, boxY + 4.5 + i * 3.6));


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
      { label: 'NPI revenue (period)', value: fmtEur(gTotal), accent: [59, 130, 246], tint: [239, 246, 255] },
      { label: 'Company revenue', value: G.companyRevenue > 0 ? fmtEur(G.companyRevenue) : 'not set', accent: [15, 23, 42], tint: [241, 245, 249] },
      { label: 'New Product Vitality Index', value: npvi(gTotal, G.companyRevenue) === null ? 'n/a' : fmtPp(npvi(gTotal, G.companyRevenue)), accent: [139, 92, 246], tint: [245, 243, 255] },
      { label: 'Invoiced (closed)', value: fmtEur(gClosed), accent: [16, 185, 129], tint: [236, 253, 245] },
      { label: 'To invoice (open)', value: fmtEur(gOpen), accent: [245, 158, 11], tint: [255, 251, 235] },
      { label: 'Customers', value: String(G.customers.length), accent: [100, 116, 139], tint: [248, 250, 252] },
    ], 42);

    sectionTitle('Site comparison', y);
    autoTable(pdf, {
      startY: y + 4,
      head: [['Site', 'NPI revenue', 'Share of group', 'Company revenue', 'New Product Vitality Index', 'Closed', 'Open', 'Customers']],
      body: data.sites.slice(1).map(S => {
        const t = siteTotal(S);
        const closed = data.months.reduce((s, m) => s + S.customers.reduce((a, c) => a + cellOf(S, c, m.k).c, 0), 0);
        return [
          clip(S.label, 34),
          fmtEur(t),
          gTotal > 0 ? `${((t / gTotal) * 100).toFixed(1)}%` : '-',
          S.companyRevenue > 0 ? fmtEur(S.companyRevenue) : 'not set',
          npvi(t, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(t, S.companyRevenue)),
          fmtEur(closed),
          fmtEur(t - closed),
          String(S.customers.length),
        ];
      }),
      foot: [[
        'GROUP', fmtEur(gTotal), '100.0%',
        G.companyRevenue > 0 ? fmtEur(G.companyRevenue) : 'not set',
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
    sectionTitle('Top 10 group customers - revenue and New Product Vitality Index contribution', y2);
    const top = G.customers.slice(0, 10);
    const maxV = Math.max(1, ...top.map(c => G.custTotals[c] || 0));
    autoTable(pdf, {
      startY: y2 + 4,
      head: [['#', 'Customer', 'Share', 'Revenue', '% of NPI Revenue', 'New Product Vitality Index contribution']],
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
      styles: { fontSize: 7.6, cellPadding: 1.6, textColor: [30, 41, 59], lineColor: [226, 232, 240] },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7, halign: 'left' },
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
        { label: 'New Product Vitality Index in month', value: monthNpvi === null ? 'n/a' : fmtPp(monthNpvi), accent: [139, 92, 246], tint: [245, 243, 255] },
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
        head: [['#', 'Customer', 'Share', 'Revenue', '% of NPI Revenue', 'New Product Vitality Index', 'vs prev. month', 'Closed', 'Open']],
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
      head: [['Customer', ...data.months.map(m => m.label), 'Total', 'New Product Vitality Index']],
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
        { label: 'New Product Vitality Index contribution', value: npvi(tot, S.companyRevenue) === null ? 'n/a' : fmtPp(npvi(tot, S.companyRevenue)), accent: [139, 92, 246], tint: [245, 243, 255] },
        { label: 'Share of site', value: site > 0 ? `${((tot / site) * 100).toFixed(1)}%` : '-', accent: [15, 23, 42], tint: [241, 245, 249] },
        { label: 'Invoiced (closed)', value: fmtEur(closed), accent: [16, 185, 129], tint: [236, 253, 245] },
        { label: 'To invoice (open)', value: fmtEur(open), accent: [245, 158, 11], tint: [255, 251, 235] },
        { label: 'Best month', value: `${data.months[bestIdx].label} ${fmtEur(vals[bestIdx].t)}`, accent: [37, 99, 235], tint: [239, 246, 255] },
        { label: 'Active months', value: `${active} of ${nMonths}`, accent: [100, 116, 139], tint: [248, 250, 252] },
        { label: 'Last vs prev month', value: prev > 0 ? fmtPct(((last - prev) / prev) * 100) : last > 0 ? 'new' : 'n/a', accent: [244, 63, 94], tint: [255, 241, 242] },
      ], y);

      sectionTitle(`Monthly detail and New Product Vitality Index - ${clip(name, 40)}`, y);
      y += 6;

      const maxV = Math.max(1, ...vals.map(v => v.t));
      autoTable(pdf, {
        startY: y,
        head: [['Month', 'Trend', 'Revenue', 'Closed', 'Open', '% of site month', 'New Product Vitality Index', 'Rank in month']],
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
