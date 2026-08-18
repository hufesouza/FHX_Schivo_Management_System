import { PDFDocument, PDFName, PDFString, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import { NormRow, SiteDataset, isOpenStatus } from '@/utils/npiOrderReport';

/**
 * Fully interactive (AcroForm + Acrobat JavaScript) GROUP customer report.
 *
 * One self-contained PDF covering every selected site:
 *   - site selector (group aggregate + one entry per site)
 *   - month selector
 *   - clickable Top 10 customer ranking
 *   - customer overview with Closed / Open / To receive
 *
 * All data is embedded as document level JavaScript, so the file keeps working
 * offline, after being emailed, with no link back to the app.
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

// ---------- Acrobat document level script ----------
const buildScript = (
  data: InteractiveGroupData,
  bar: { x: number; top: number; h: number; maxw: number },
  matrixRows: number
) => `
var DOC = this;
var DATA = ${JSON.stringify(data)};
var BAR = ${JSON.stringify(bar)};
var MROWS = ${matrixRows};
var SI = 0;
var MI = DATA.months.length - 1;
var CUST = DATA.sites[0].customers.length ? DATA.sites[0].customers[0] : "";

var NAVY = ["RGB", 0.07, 0.11, 0.20];
var LIGHT = ["RGB", 0.95, 0.96, 0.98];
var BLUE = ["RGB", 0.16, 0.44, 0.90];
var WHITE = ["RGB", 1, 1, 1];
var GREY = ["RGB", 0.45, 0.48, 0.55];

function site() { return DATA.sites[SI]; }
function eur(n) {
  if (n === null || n === undefined || isNaN(n)) n = 0;
  var neg = n < 0; n = Math.round(Math.abs(n));
  var s = String(n), out = "";
  while (s.length > 3) { out = "," + s.substring(s.length - 3) + out; s = s.substring(0, s.length - 3); }
  out = s + out;
  return (neg ? "-EUR " : "EUR ") + out;
}
function num(n) {
  if (!n) return "-";
  var s = String(Math.round(n)), out = "";
  while (s.length > 3) { out = "," + s.substring(s.length - 3) + out; s = s.substring(0, s.length - 3); }
  return s + out;
}
function pct(n) { return (n === null ? "n/a" : (n >= 0 ? "+" : "") + n.toFixed(1) + "%"); }
function cell(c, k) {
  var S = site();
  if (!S.cust[c] || !S.cust[c][k]) return { t: 0, o: 0, c: 0 };
  return S.cust[c][k];
}
function ranking(k) {
  var S = site(), arr = [];
  for (var i = 0; i < S.customers.length; i++) {
    var c = S.customers[i], v = cell(c, k).t;
    if (v > 0) arr.push({ n: c, v: v });
  }
  arr.sort(function (a, b) { return b.v - a.v; });
  return arr;
}
function setF(n, v) { var f = DOC.getField(n); if (f) f.value = v; }
function padCap(s) { var o = s; while (o.length < 74) { o += " "; } return o; }
function setCap(n, v) { var f = DOC.getField(n); if (f) f.buttonSetCaption(v); }
function paint(n, bg, fg) {
  var f = DOC.getField(n);
  if (!f) return;
  f.fillColor = bg;
  if (fg) f.textColor = fg;
}

function paintSites() {
  for (var i = 0; i < DATA.sites.length; i++) {
    var sel = (i === SI);
    paint("s1_" + i, sel ? BLUE : LIGHT, sel ? WHITE : NAVY);
    paint("s2_" + i, sel ? BLUE : LIGHT, sel ? WHITE : NAVY);
    paint("s3_" + i, sel ? BLUE : LIGHT, sel ? WHITE : NAVY);
  }
}

function paintMonths() {
  for (var i = 0; i < DATA.months.length; i++) {
    var sel = (i === MI);
    paint("m1_" + i, sel ? NAVY : LIGHT, sel ? WHITE : NAVY);
    paint("m2_" + i, sel ? NAVY : LIGHT, sel ? WHITE : NAVY);
  }
}

function paintOverview() {
  var k = DATA.months[MI].k;
  var prevK = MI > 0 ? DATA.months[MI - 1].k : null;
  var S = site();
  var total = S.totals[k] || 0;
  var r = ranking(k);
  var top10 = 0;
  for (var i = 0; i < r.length && i < 10; i++) top10 += r[i].v;
  var prevTotal = prevK ? (S.totals[prevK] || 0) : 0;
  var mom = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  setF("k_scope", S.label + "   |   " + DATA.months[MI].label);
  setF("k_total", eur(total));
  setF("k_top10", eur(top10));
  setF("k_other", eur(total - top10));
  setF("k_topcust", r.length ? r[0].n + "  (" + eur(r[0].v) + ")" : "-");
  setF("k_mom", pct(mom));
  setF("rank_title", "Top 10 Customers - " + S.label + " - " + DATA.months[MI].label);

  for (var j = 0; j < 10; j++) {
    var row = r[j];
    if (row) {
      setCap("rc" + j, padCap((j + 1) + ".  " + row.n));
      setF("rr" + j, eur(row.v));
      setF("rp" + j, total > 0 ? ((row.v / total) * 100).toFixed(1) + "%" : "-");
      var pv = prevK ? cell(row.n, prevK).t : 0;
      setF("rd" + j, pv > 0 ? pct(((row.v - pv) / pv) * 100) : (row.v > 0 ? "new" : "-"));
      paint("rc" + j, row.n === CUST ? BLUE : WHITE, row.n === CUST ? WHITE : NAVY);
    } else {
      setCap("rc" + j, ""); setF("rr" + j, ""); setF("rp" + j, ""); setF("rd" + j, "");
      paint("rc" + j, WHITE, NAVY);
    }
  }
}

function paintCustomer() {
  var k = DATA.months[MI].k;
  var prevK = MI > 0 ? DATA.months[MI - 1].k : null;
  var S = site();
  var cur = cell(CUST, k), prev = prevK ? cell(CUST, prevK) : { t: 0, o: 0, c: 0 };
  var totT = 0, totO = 0, totC = 0, ytd = 0;
  var yr = k.substring(0, 4);
  for (var i = 0; i < DATA.months.length; i++) {
    var mk = DATA.months[i].k, cc = cell(CUST, mk);
    totT += cc.t; totO += cc.o; totC += cc.c;
    if (mk.substring(0, 4) === yr && mk <= k) ytd += cc.t;
  }
  var mom = prev.t > 0 ? ((cur.t - prev.t) / prev.t) * 100 : null;
  var r = ranking(k), rankPos = "-", share = "-";
  for (var q = 0; q < r.length; q++) if (r[q].n === CUST) rankPos = "#" + (q + 1);
  if ((S.totals[k] || 0) > 0) share = ((cur.t / S.totals[k]) * 100).toFixed(1) + "%";

  setF("c_name", CUST || "-");
  setF("c_sub", S.label + "   |   " + DATA.months[MI].label + "   |   Rank " + rankPos + "   |   Share of month " + share);
  setF("c_total", eur(totT));
  setF("c_cur", eur(cur.t));
  setF("c_prev", eur(prev.t));
  setF("c_mom", pct(mom));
  setF("c_ytd", eur(ytd));
  setF("c_closed", eur(cur.c));
  setF("c_open", eur(cur.o));
  setF("c_toreceive", eur(cur.o));
  setF("c_closed_p", eur(totC));
  setF("c_open_p", eur(totO));
  setF("c_toreceive_p", eur(totO));

  var maxv = 0;
  for (var m = 0; m < DATA.months.length; m++) { var v = cell(CUST, DATA.months[m].k).t; if (v > maxv) maxv = v; }
  for (var h = 0; h < DATA.months.length; h++) {
    var mk2 = DATA.months[h].k, c2 = cell(CUST, mk2);
    setF("h_m" + h, DATA.months[h].label);
    setF("h_v" + h, eur(c2.t));
    var st = "-";
    if (c2.t > 0) { st = c2.o > 0 && c2.c > 0 ? "Open / Closed" : (c2.o > 0 ? "Open (to receive)" : "Closed"); }
    setF("h_s" + h, st);
    var bf = DOC.getField("bar" + h);
    if (bf) {
      var w = maxv > 0 ? (c2.t / maxv) * BAR.maxw : 0;
      if (w < 0.5) w = 0.5;
      var y = BAR.top - h * BAR.h;
      bf.rect = [BAR.x, y, BAR.x + w, y - (BAR.h - 4)];
      bf.fillColor = mk2 === DATA.months[MI].k ? NAVY : BLUE;
    }
  }
}

function paintMatrix() {
  var S = site();
  setF("g_title", "Monthly revenue by customer - " + S.label);
  for (var j = 0; j < MROWS; j++) {
    var name = S.customers[j];
    setF("gn" + j, name ? (j + 1) + ".  " + name : "");
    for (var i = 0; i < DATA.months.length; i++) {
      setF("gv" + j + "_" + i, name ? num(cell(name, DATA.months[i].k).t) : "");
    }
  }
  for (var t = 0; t < DATA.months.length; t++) setF("gt" + t, num(S.totals[DATA.months[t].k] || 0));
}

function fillDropdown() {
  var f = DOC.getField("cust_select");
  if (!f) return;
  var cs = site().customers;
  f.clearItems();
  for (var i = 0; i < cs.length; i++) f.insertItemAt(cs[i], cs[i], i);
  if (cs.length) f.value = CUST;
}

function refresh() { paintSites(); paintMonths(); paintOverview(); paintCustomer(); paintMatrix(); }
function setMonth(i) { MI = i; refresh(); }
function setSite(i) {
  SI = i;
  var cs = site().customers;
  if (cs.length && cs.indexOf(CUST) === -1) CUST = cs[0];
  fillDropdown();
  refresh();
}
function setCustomerByRank(j) { var r = ranking(DATA.months[MI].k); if (r[j]) { CUST = r[j].n; refresh(); } }
function setCustomer(n) { if (n) { CUST = n; refresh(); } }

refresh();
`;

// ---------- PDF generation ----------
export async function exportInteractiveGroupReport(data: InteractiveGroupData) {
  if (!data.months.length) throw new Error('No dated revenue rows available for the selected sites');
  if (!data.sites.length) throw new Error('Select at least one site with uploaded data');

  const doc = await PDFDocument.create();
  doc.setTitle('NPI Order Dashboard - Interactive Group Customer Report');
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();

  const W = 842, H = 595;
  const navy = rgb(0.07, 0.11, 0.2);
  const navySoft = rgb(0.13, 0.18, 0.29);
  const blue = rgb(0.16, 0.44, 0.9);
  const slate = rgb(0.45, 0.48, 0.55);
  const line = rgb(0.87, 0.89, 0.92);
  const light = rgb(0.95, 0.96, 0.98);
  const white = rgb(1, 1, 1);
  const green = rgb(0.09, 0.6, 0.41);
  const amber = rgb(0.85, 0.55, 0.09);

  const pages = [doc.addPage([W, H]), doc.addPage([W, H]), doc.addPage([W, H])];

  const jsAction = (script: string) =>
    doc.context.obj({ Type: PDFName.of('Action'), S: PDFName.of('JavaScript'), JS: PDFString.of(script) });

  const setAction = (field: any, script: string) => {
    field.acroField.getWidgets().forEach((w: any) => w.dict.set(PDFName.of('A'), jsAction(script)));
  };

  const btn = (
    name: string,
    label: string,
    page: any,
    x: number,
    y: number,
    width: number,
    height: number,
    script: string,
    opts: { size?: number; bg?: any; fg?: any; border?: any; transparent?: boolean } = {}
  ) => {
    const b = form.createButton(name);
    b.addToPage(label, page, {
      x, y, width, height,
      font: bold,
      textColor: opts.fg ?? navy,
      backgroundColor: opts.transparent ? undefined : opts.bg ?? light,
      borderColor: opts.transparent ? undefined : opts.border ?? line,
      borderWidth: opts.transparent ? 0 : 0.8,
    });
    b.setFontSize(opts.size ?? 8);
    setAction(b, script);
    return b;
  };

  const txt = (
    name: string,
    value: string,
    page: any,
    x: number,
    y: number,
    width: number,
    height: number,
    opts: { size?: number; align?: TextAlignment; fg?: any; boldFont?: boolean } = {}
  ) => {
    const f = form.createTextField(name);
    f.setText(value);
    f.setAlignment(opts.align ?? TextAlignment.Left);
    f.enableReadOnly();
    f.addToPage(page, {
      x, y, width, height,
      font: opts.boldFont ? bold : helv,
      textColor: opts.fg ?? navy,
      backgroundColor: white,
      borderColor: white,
      borderWidth: 0,
    });
    f.setFontSize(opts.size ?? 9);
    return f;
  };

  const header = (page: any, title: string, subtitle: string) => {
    page.drawRectangle({ x: 0, y: H - 66, width: W, height: 66, color: navy });
    page.drawRectangle({ x: 0, y: H - 69, width: W, height: 3, color: blue });
    page.drawRectangle({ x: 32, y: H - 34, width: 3, height: 18, color: blue });
    page.drawText(title, { x: 42, y: H - 31, size: 16, font: bold, color: white });
    page.drawText(subtitle, { x: 42, y: H - 47, size: 8.5, font: helv, color: rgb(0.75, 0.8, 0.88) });
    page.drawText(`Report period: ${data.period}    |    Scope: ${data.scope}`.slice(0, 150), {
      x: 42, y: H - 60, size: 7, font: helv, color: rgb(0.58, 0.66, 0.79),
    });
  };

  const footer = (page: any, n: number) => {
    page.drawLine({ start: { x: 32, y: 32 }, end: { x: W - 32, y: 32 }, color: line, thickness: 0.6 });
    page.drawText(
      'Interactive PDF - open in Adobe Acrobat Reader / Acrobat on desktop for full interactivity. Data embedded, no internet required.',
      { x: 32, y: 21, size: 6.5, font: helv, color: slate }
    );
    page.drawText(`Page ${n} of 3`, { x: W - 70, y: 21, size: 6.5, font: helv, color: slate });
  };

  const nav = (page: any, prefix: string) => {
    const items: [string, string][] = [
      ['Overview', 'this.pageNum = 0;'],
      ['Customers', 'this.pageNum = 1;'],
      ['Monthly Revenue', 'this.pageNum = 2;'],
      ['Back', 'this.pageNum = Math.max(0, this.pageNum - 1);'],
    ];
    let x = W - 32 - 4 * 78 - 3 * 6;
    items.forEach(([label, script], i) => {
      btn(`${prefix}nav${i}`, label, page, x, H - 44, 78, 18, script, {
        size: 7.5, bg: navySoft, fg: white, border: rgb(0.3, 0.36, 0.47),
      });
      x += 84;
    });
  };

  const sectionLabel = (page: any, x: number, y: number, label: string) => {
    page.drawRectangle({ x, y: y - 1, width: 2.5, height: 9, color: blue });
    page.drawText(label, { x: x + 7, y, size: 7.5, font: bold, color: navy });
  };

  const card = (page: any, x: number, y: number, w: number, h: number, label: string, accent = blue) => {
    page.drawRectangle({ x, y, width: w, height: h, color: light, borderColor: line, borderWidth: 0.8 });
    page.drawRectangle({ x, y, width: 3, height: h, color: accent });
    page.drawText(label, { x: x + 11, y: y + h - 14, size: 6.5, font: bold, color: slate });
  };

  // ---- pre-rendered initial state (group / latest month / top customer) ----
  const S0 = data.sites[0];
  const mi0 = data.months.length - 1;
  const k0 = data.months[mi0].k;
  const kp0 = mi0 > 0 ? data.months[mi0 - 1].k : null;
  const cellOf = (c: string, k: string) => S0.cust[c]?.[k] || emptyCell();
  const eurS = (n: number) =>
    'EUR ' + new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
  const numS = (n: number) =>
    n ? new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(Math.round(n)) : '-';
  const pctS = (n: number | null) => (n === null ? 'n/a' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%');
  const rank0 = S0.customers
    .map(c => ({ n: c, v: cellOf(c, k0).t }))
    .filter(r => r.v > 0)
    .sort((a, b) => b.v - a.v);
  const cust0 = rank0[0]?.n || S0.customers[0] || '';
  const total0 = S0.totals[k0] || 0;
  const top10_0 = rank0.slice(0, 10).reduce((s, r) => s + r.v, 0);
  const prevTotal0 = kp0 ? S0.totals[kp0] || 0 : 0;
  const cur0 = cellOf(cust0, k0);
  const prev0 = kp0 ? cellOf(cust0, kp0) : emptyCell();
  let totT0 = 0, totO0 = 0, totC0 = 0, ytd0 = 0;
  data.months.forEach(m => {
    const c = cellOf(cust0, m.k);
    totT0 += c.t; totO0 += c.o; totC0 += c.c;
    if (m.k.slice(0, 4) === k0.slice(0, 4) && m.k <= k0) ytd0 += c.t;
  });
  const maxv0 = Math.max(...data.months.map(m => cellOf(cust0, m.k).t), 0);

  const init: Record<string, string> = {
    k_scope: `${S0.label}   |   ${data.months[mi0].label}`,
    k_total: eurS(total0),
    k_top10: eurS(top10_0),
    k_other: eurS(total0 - top10_0),
    k_topcust: rank0.length ? `${rank0[0].n}  (${eurS(rank0[0].v)})` : '-',
    k_mom: pctS(prevTotal0 > 0 ? ((total0 - prevTotal0) / prevTotal0) * 100 : null),
    rank_title: `Top 10 Customers - ${S0.label} - ${data.months[mi0].label}`,
    c_name: cust0 || '-',
    c_sub: `${S0.label}   |   ${data.months[mi0].label}   |   Rank #${(rank0.findIndex(r => r.n === cust0) + 1) || '-'}   |   Share of month ${total0 > 0 ? ((cur0.t / total0) * 100).toFixed(1) + '%' : '-'}`,
    c_total: eurS(totT0),
    c_cur: eurS(cur0.t),
    c_prev: eurS(prev0.t),
    c_mom: pctS(prev0.t > 0 ? ((cur0.t - prev0.t) / prev0.t) * 100 : null),
    c_ytd: eurS(ytd0),
    c_closed: eurS(cur0.c),
    c_open: eurS(cur0.o),
    c_toreceive: eurS(cur0.o),
    c_closed_p: eurS(totC0),
    c_open_p: eurS(totO0),
    c_toreceive_p: eurS(totO0),
    g_title: `Monthly revenue by customer - ${S0.label}`,
  };
  rank0.slice(0, 10).forEach((r, j) => {
    const pv = kp0 ? cellOf(r.n, kp0).t : 0;
    init[`rr${j}`] = eurS(r.v);
    init[`rp${j}`] = total0 > 0 ? ((r.v / total0) * 100).toFixed(1) + '%' : '-';
    init[`rd${j}`] = pv > 0 ? pctS(((r.v - pv) / pv) * 100) : 'new';
  });
  data.months.forEach((m, i) => {
    const c = cellOf(cust0, m.k);
    init[`h_m${i}`] = m.label;
    init[`h_v${i}`] = eurS(c.t);
    init[`h_s${i}`] = c.t > 0 ? (c.o > 0 && c.c > 0 ? 'Open / Closed' : c.o > 0 ? 'Open (to receive)' : 'Closed') : '-';
  });
  const MATRIX_ROWS = 12;
  for (let j = 0; j < MATRIX_ROWS; j++) {
    const name = S0.customers[j];
    init[`gn${j}`] = name ? `${j + 1}.  ${name}` : '';
    data.months.forEach((m, i) => {
      init[`gv${j}_${i}`] = name ? numS(cellOf(name, m.k).t) : '';
    });
  }
  data.months.forEach((m, i) => { init[`gt${i}`] = numS(S0.totals[m.k] || 0); });

  const I = (n: string) => init[n] ?? '';
  const padCap = (t: string) => (t + ' '.repeat(74)).slice(0, Math.max(74, t.length));

  // site selector strip (shared layout on every page)
  const siteStrip = (page: any, prefix: string, y: number) => {
    sectionLabel(page, 32, y + 24, 'SITE');
    const n = data.sites.length;
    const sw = Math.min(150, (W - 64 - (n - 1) * 6) / n);
    data.sites.forEach((s, i) => {
      const label = s.label.length > 26 ? s.label.slice(0, 25) + '.' : s.label;
      btn(`${prefix}_${i}`, label, page, 32 + i * (sw + 6), y, sw, 19, `setSite(${i});`, {
        size: 7.5,
        bg: i === 0 ? blue : light,
        fg: i === 0 ? white : navy,
      });
    });
  };

  const mCount = data.months.length;
  const mW = Math.min(60, (W - 64 - (mCount - 1) * 5) / mCount);
  const monthStrip = (page: any, prefix: string, y: number) => {
    sectionLabel(page, 32, y + 24, 'MONTH');
    data.months.forEach((m, i) => {
      btn(`${prefix}_${i}`, m.label, page, 32 + i * (mW + 5), y, mW, 20, `setMonth(${i});`, {
        size: 8,
        bg: i === mi0 ? navy : light,
        fg: i === mi0 ? white : navy,
      });
    });
  };

  // ================= PAGE 1 : OVERVIEW =================
  const p1 = pages[0];
  header(p1, 'Top 10 Customers by Month', 'Group customer revenue & financial overview - interactive');
  nav(p1, 'p1');
  footer(p1, 1);

  siteStrip(p1, 's1', H - 100);
  monthStrip(p1, 'm1', H - 142);

  const kpis: [string, string, any][] = [
    ['TOTAL REVENUE', 'k_total', blue],
    ['TOP 10 CUSTOMER REVENUE', 'k_top10', navy],
    ['OTHER CUSTOMERS', 'k_other', slate],
    ['TOP CUSTOMER', 'k_topcust', green],
    ['MONTH OVER MONTH', 'k_mom', amber],
  ];
  const cw = (W - 64 - 4 * 8) / 5;
  kpis.forEach(([label, field, accent], i) => {
    const x = 32 + i * (cw + 8);
    card(p1, x, H - 218, cw, 60, label, accent);
    txt(field, I(field), p1, x + 11, H - 206, cw - 20, 22, {
      size: field === 'k_topcust' ? 8.5 : 14,
      boldFont: true,
    });
  });
  txt('k_scope', I('k_scope'), p1, 32, H - 234, 400, 12, { size: 7.5, fg: slate });

  txt('rank_title', I('rank_title'), p1, 32, H - 258, 500, 14, { size: 10.5, boldFont: true });

  const cols = [
    { label: 'RANK', x: 32, w: 40 },
    { label: 'CUSTOMER (click to select)', x: 72, w: 330 },
    { label: 'REVENUE', x: 402, w: 110 },
    { label: '% OF TOTAL', x: 512, w: 90 },
    { label: 'VS PREVIOUS MONTH', x: 602, w: 130 },
  ];
  let ry = H - 280;
  p1.drawRectangle({ x: 32, y: ry - 5, width: W - 64, height: 18, color: navy });
  cols.forEach(c => p1.drawText(c.label, { x: c.x + 6, y: ry, size: 6.8, font: bold, color: white }));
  ry -= 21;
  for (let j = 0; j < 10; j++) {
    const y = ry - j * 22;
    if (j % 2 === 1) {
      p1.drawRectangle({ x: 32, y: y - 4, width: W - 64, height: 21, color: rgb(0.975, 0.98, 0.99) });
    }
    p1.drawLine({ start: { x: 32, y: y - 4 }, end: { x: W - 32, y: y - 4 }, color: line, thickness: 0.4 });
    p1.drawText(String(j + 1), { x: 44, y: y + 4, size: 8, font: bold, color: slate });
    btn(`rc${j}`, rank0[j] ? padCap(`${j + 1}.  ${rank0[j].n}`) : '', p1, 72, y, 330, 17, `setCustomerByRank(${j});`, {
      size: 8.5, bg: white, fg: navy, border: white,
    });
    txt(`rr${j}`, I(`rr${j}`), p1, 402, y + 2, 100, 13, { size: 8.5, align: TextAlignment.Right, boldFont: true });
    txt(`rp${j}`, I(`rp${j}`), p1, 512, y + 2, 80, 13, { size: 8.5, align: TextAlignment.Right });
    txt(`rd${j}`, I(`rd${j}`), p1, 602, y + 2, 100, 13, { size: 8.5, align: TextAlignment.Right });
  }

  // ================= PAGE 2 : CUSTOMER =================
  const p2 = pages[1];
  header(p2, 'Customer Overview', 'Select a site, a customer and a month - all values recalculate inside the PDF');
  nav(p2, 'p2');
  footer(p2, 2);

  siteStrip(p2, 's2', H - 96);
  monthStrip(p2, 'm2', H - 136);

  sectionLabel(p2, 32, H - 156, 'CUSTOMER');
  const dd = form.createDropdown('cust_select');
  dd.setOptions(S0.customers.length ? S0.customers : ['-']);
  dd.select(cust0 || '-');
  dd.addToPage(p2, {
    x: 32, y: H - 182, width: 330, height: 20,
    font: helv, textColor: navy, backgroundColor: white, borderColor: line, borderWidth: 1,
  });
  dd.setFontSize(9);
  dd.acroField.dict.set(PDFName.of('Ff'), doc.context.obj(1 << 26));
  dd.acroField.getWidgets().forEach(w => {
    w.dict.set(PDFName.of('AA'), doc.context.obj({ V: jsAction('setCustomer(event.value);') }));
  });

  txt('c_name', I('c_name'), p2, 372, H - 178, 440, 18, { size: 13, boldFont: true });
  txt('c_sub', I('c_sub'), p2, 372, H - 194, 440, 12, { size: 7.5, fg: slate });

  const custKpis: [string, string, any][] = [
    ['TOTAL REVENUE (PERIOD)', 'c_total', blue],
    ['CURRENT MONTH', 'c_cur', navy],
    ['PREVIOUS MONTH', 'c_prev', slate],
    ['MONTH OVER MONTH', 'c_mom', amber],
    ['YTD REVENUE', 'c_ytd', green],
  ];
  custKpis.forEach(([label, field, accent], i) => {
    const x = 32 + i * (cw + 8);
    card(p2, x, H - 254, cw, 56, label, accent);
    txt(field, I(field), p2, x + 11, H - 243, cw - 20, 20, { size: 12, boldFont: true });
  });

  sectionLabel(p2, 32, H - 272, 'CUSTOMER FINANCIAL STATUS  (selected month / full period)');
  const statuses: [string, string, string, any][] = [
    ['CLOSED', 'c_closed', 'c_closed_p', green],
    ['OPEN', 'c_open', 'c_open_p', amber],
    ['TO RECEIVE', 'c_toreceive', 'c_toreceive_p', blue],
  ];
  const sw2 = (390 - 2 * 10) / 3;
  statuses.forEach(([label, f1, f2, accent], i) => {
    const x = 32 + i * (sw2 + 10);
    card(p2, x, H - 348, sw2, 64, label, accent);
    txt(f1, I(f1), p2, x + 11, H - 326, sw2 - 20, 20, { size: 12, boldFont: true });
    txt(f2, I(f2), p2, x + 11, H - 342, sw2 - 20, 14, { size: 7.5, fg: slate });
  });

  sectionLabel(p2, 32, H - 366, 'CUSTOMER MONTHLY HISTORY');
  sectionLabel(p2, 470, H - 366, 'REVENUE TREND (click a bar to change month)');
  p2.drawRectangle({ x: 32, y: H - 388, width: 400, height: 15, color: light });
  p2.drawText('MONTH', { x: 38, y: H - 384, size: 6.5, font: bold, color: slate });
  p2.drawText('REVENUE', { x: 150, y: H - 384, size: 6.5, font: bold, color: slate });
  p2.drawText('STATUS', { x: 260, y: H - 384, size: 6.5, font: bold, color: slate });

  const rowH = 14;
  const barTop = H - 392;
  data.months.forEach((_, i) => {
    const y = H - 404 - i * rowH;
    txt(`h_m${i}`, I(`h_m${i}`), p2, 38, y, 76, 12, { size: 7.5, boldFont: true });
    txt(`h_v${i}`, I(`h_v${i}`), p2, 116, y, 110, 12, { size: 7.5, align: TextAlignment.Right });
    txt(`h_s${i}`, I(`h_s${i}`), p2, 260, y, 150, 12, { size: 7.5, fg: slate });
    const b = form.createButton(`bar${i}`);
    b.addToPage('', p2, {
      x: 470,
      y: barTop - (i + 1) * rowH + 3,
      width: Math.max(1, (maxv0 > 0 ? cellOf(cust0, data.months[i].k).t / maxv0 : 0) * 330),
      height: rowH - 4,
      font: helv,
      backgroundColor: blue,
      borderWidth: 0,
      textColor: white,
    });
    setAction(b, `setMonth(${i});`);
  });

  // ================= PAGE 3 : MONTHLY REVENUE MATRIX =================
  const p3 = pages[2];
  header(p3, 'Monthly Revenue', 'Revenue by customer and month - updates with the selected site');
  nav(p3, 'p3');
  footer(p3, 3);

  siteStrip(p3, 's3', H - 96);
  txt('g_title', I('g_title'), p3, 32, H - 122, 500, 14, { size: 10.5, boldFont: true });

  const colW = Math.min(52, (W - 64 - 232) / Math.max(1, data.months.length));
  let hy = H - 146;
  p3.drawRectangle({ x: 32, y: hy - 5, width: W - 64, height: 18, color: navy });
  p3.drawText('CUSTOMER', { x: 38, y: hy, size: 6.8, font: bold, color: white });
  data.months.forEach((m, i) => {
    p3.drawText(m.label, { x: 264 + i * colW, y: hy, size: 6.3, font: bold, color: white });
  });
  hy -= 21;
  for (let j = 0; j < MATRIX_ROWS; j++) {
    const y = hy - j * 18;
    if (j % 2 === 1) {
      p3.drawRectangle({ x: 32, y: y - 4, width: W - 64, height: 17, color: rgb(0.975, 0.98, 0.99) });
    }
    p3.drawLine({ start: { x: 32, y: y - 4 }, end: { x: W - 32, y: y - 4 }, color: line, thickness: 0.4 });
    txt(`gn${j}`, I(`gn${j}`), p3, 38, y, 220, 13, { size: 7.5 });
    data.months.forEach((_, i) => {
      txt(`gv${j}_${i}`, I(`gv${j}_${i}`), p3, 258 + i * colW, y, colW - 4, 13, {
        size: 6.5, align: TextAlignment.Right,
      });
    });
  }
  const ty = hy - MATRIX_ROWS * 18 - 4;
  p3.drawRectangle({ x: 32, y: ty - 5, width: W - 64, height: 17, color: light });
  p3.drawText('SITE TOTAL', { x: 38, y: ty, size: 7.5, font: bold, color: navy });
  data.months.forEach((_, i) => {
    txt(`gt${i}`, I(`gt${i}`), p3, 258 + i * colW, ty - 2, colW - 4, 13, {
      size: 6.5, align: TextAlignment.Right, boldFont: true,
    });
  });

  // document level JavaScript with all embedded data
  doc.addJavaScript(
    'npi_group_report',
    buildScript(data, { x: 470, top: barTop, h: rowH, maxw: 330 }, MATRIX_ROWS)
  );

  form.updateFieldAppearances(helv);
  const bytes = await doc.save({ updateFieldAppearances: false });
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Group_Interactive_Customer_Report.pdf';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
