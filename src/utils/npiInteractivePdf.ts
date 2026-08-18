import { PDFDocument, PDFName, PDFString, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import { NormRow, SiteDataset, isOpenStatus } from '@/utils/npiOrderReport';

/**
 * Fully interactive (AcroForm + Acrobat JavaScript) customer report.
 * All data is embedded as document level JavaScript so the file keeps working
 * offline, after being emailed, with no link back to the app.
 */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const mLabel = (k: string) => `${MON[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;

type Cell = { t: number; o: number; c: number };

export type InteractiveData = {
  site: string;
  period: string;
  months: { k: string; label: string }[];
  customers: string[];
  cust: Record<string, Record<string, Cell>>;
  totals: Record<string, number>;
};

export const buildInteractiveData = (
  ds: SiteDataset,
  label: string,
  year: string,
  npiOnly: boolean,
  maxMonths = 12
): InteractiveData => {
  let rows: NormRow[] = ds.rows;
  if (npiOnly && ds.hasNpiCol) rows = rows.filter(r => r.isNpi);
  if (year !== 'all') rows = rows.filter(r => r.date && String(r.date.getFullYear()) === year);
  rows = rows.filter(r => r.date);

  const allKeys = Array.from(new Set(rows.map(r => mKey(r.date!)))).sort();
  const months = allKeys.slice(-maxMonths);
  const inWin = rows.filter(r => months.includes(mKey(r.date!)));

  const cust: Record<string, Record<string, Cell>> = {};
  const totals: Record<string, number> = {};
  months.forEach(k => { totals[k] = 0; });

  inWin.forEach(r => {
    const name = r.customer || 'Unknown';
    const k = mKey(r.date!);
    if (!cust[name]) cust[name] = {};
    if (!cust[name][k]) cust[name][k] = { t: 0, o: 0, c: 0 };
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

  const period = months.length
    ? months.length === 1
      ? mLabel(months[0])
      : `${mLabel(months[0])} - ${mLabel(months[months.length - 1])}`
    : '-';

  return {
    site: label,
    period,
    months: months.map(k => ({ k, label: mLabel(k) })),
    customers,
    cust,
    totals,
  };
};

// ---------- Acrobat document level script ----------
const buildScript = (data: InteractiveData, bar: { x: number; top: number; h: number; maxw: number }) => `
var DATA = ${JSON.stringify(data)};
var BAR = ${JSON.stringify(bar)};
var MI = DATA.months.length - 1;
var CUST = DATA.customers.length ? DATA.customers[0] : "";

function eur(n) {
  if (n === null || n === undefined || isNaN(n)) n = 0;
  var neg = n < 0; n = Math.round(Math.abs(n));
  var s = String(n), out = "";
  while (s.length > 3) { out = "," + s.substring(s.length - 3) + out; s = s.substring(0, s.length - 3); }
  out = s + out;
  return (neg ? "-EUR " : "EUR ") + out;
}
function pct(n) { return (n === null ? "n/a" : (n >= 0 ? "+" : "") + n.toFixed(1) + "%"); }
function cell(c, k) {
  if (!DATA.cust[c] || !DATA.cust[c][k]) return { t: 0, o: 0, c: 0 };
  return DATA.cust[c][k];
}
function ranking(k) {
  var arr = [];
  for (var i = 0; i < DATA.customers.length; i++) {
    var c = DATA.customers[i], v = cell(c, k).t;
    if (v > 0) arr.push({ n: c, v: v });
  }
  arr.sort(function (a, b) { return b.v - a.v; });
  return arr;
}
function setF(n, v) { var f = this.getField(n); if (f) f.value = v; }
function setCap(n, v) { var f = this.getField(n); if (f) f.buttonSetCaption(v); }
function fill(n, c) { var f = this.getField(n); if (f) f.fillColor = c; }

var NAVY = ["RGB", 0.06, 0.09, 0.16];
var LIGHT = ["RGB", 0.95, 0.96, 0.98];
var BLUE = ["RGB", 0.23, 0.51, 0.96];
var WHITE = ["RGB", 1, 1, 1];

function paintMonths() {
  for (var i = 0; i < DATA.months.length; i++) {
    var sel = (i === MI);
    fill("m1_" + i, sel ? NAVY : LIGHT);
    fill("m2_" + i, sel ? NAVY : LIGHT);
    var f1 = this.getField("m1_" + i); if (f1) f1.textColor = sel ? WHITE : NAVY;
    var f2 = this.getField("m2_" + i); if (f2) f2.textColor = sel ? WHITE : NAVY;
  }
}

function paintOverview() {
  var k = DATA.months[MI].k;
  var prevK = MI > 0 ? DATA.months[MI - 1].k : null;
  var total = DATA.totals[k] || 0;
  var r = ranking(k);
  var top10 = 0;
  for (var i = 0; i < r.length && i < 10; i++) top10 += r[i].v;
  var prevTotal = prevK ? (DATA.totals[prevK] || 0) : 0;
  var mom = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  setF("k_month", DATA.months[MI].label);
  setF("k_total", eur(total));
  setF("k_top10", eur(top10));
  setF("k_other", eur(total - top10));
  setF("k_topcust", r.length ? r[0].n + "  (" + eur(r[0].v) + ")" : "-");
  setF("k_mom", pct(mom));
  setF("rank_title", "Top 10 Customers - " + DATA.months[MI].label);

  for (var j = 0; j < 10; j++) {
    var row = r[j];
    if (row) {
      setCap("rc" + j, (j + 1) + ".  " + row.n);
      setF("rr" + j, eur(row.v));
      setF("rp" + j, total > 0 ? ((row.v / total) * 100).toFixed(1) + "%" : "-");
      var pv = prevK ? cell(row.n, prevK).t : 0;
      setF("rd" + j, pv > 0 ? pct(((row.v - pv) / pv) * 100) : (row.v > 0 ? "new" : "-"));
      fill("rc" + j, row.n === CUST ? BLUE : WHITE);
      var fb = this.getField("rc" + j); if (fb) fb.textColor = row.n === CUST ? WHITE : NAVY;
    } else {
      setCap("rc" + j, ""); setF("rr" + j, ""); setF("rp" + j, ""); setF("rd" + j, "");
      fill("rc" + j, WHITE);
    }
  }
}

function paintCustomer() {
  var k = DATA.months[MI].k;
  var prevK = MI > 0 ? DATA.months[MI - 1].k : null;
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
  if ((DATA.totals[k] || 0) > 0) share = ((cur.t / DATA.totals[k]) * 100).toFixed(1) + "%";

  setF("c_name", CUST || "-");
  setF("c_sub", "Selected month: " + DATA.months[MI].label + "   |   Rank " + rankPos + "   |   Share of month " + share);
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
    var bf = this.getField("bar" + h);
    if (bf) {
      var w = maxv > 0 ? (c2.t / maxv) * BAR.maxw : 0;
      if (w < 0.5) w = 0.5;
      var y = BAR.top - h * BAR.h;
      bf.rect = [BAR.x, y, BAR.x + w, y - (BAR.h - 4)];
      bf.fillColor = mk2 === DATA.months[MI].k ? NAVY : BLUE;
    }
  }
  var dd = this.getField("cust_select");
  if (dd && dd.value !== CUST) dd.value = CUST;
}

function refresh() { paintMonths(); paintOverview(); paintCustomer(); }
function setMonth(i) { MI = i; refresh(); }
function setCustomerByRank(j) { var r = ranking(DATA.months[MI].k); if (r[j]) { CUST = r[j].n; refresh(); } }
function setCustomer(n) { if (n) { CUST = n; refresh(); } }

refresh();
`;

// ---------- PDF generation ----------
export async function exportInteractiveCustomerReport(data: InteractiveData) {
  if (!data.months.length) throw new Error('No dated revenue rows available for this site');

  const doc = await PDFDocument.create();
  doc.setTitle(`${data.site} - Interactive Customer Report`);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const form = doc.getForm();

  const W = 842, H = 595;
  const navy = rgb(0.06, 0.09, 0.16);
  const slate = rgb(0.42, 0.45, 0.5);
  const line = rgb(0.85, 0.87, 0.9);
  const light = rgb(0.95, 0.96, 0.98);
  const white = rgb(1, 1, 1);

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
    opts: { size?: number; bg?: any; fg?: any; border?: any } = {}
  ) => {
    const b = form.createButton(name);
    b.acroField.setFontSize(opts.size ?? 8);
    b.addToPage(label, page, {
      x, y, width, height,
      font: bold,
      textColor: opts.fg ?? navy,
      backgroundColor: opts.bg ?? light,
      borderColor: opts.border ?? line,
      borderWidth: 0.8,
    });
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
    f.setFontSize(opts.size ?? 9);
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
    page.drawRectangle({ x: 0, y: H - 62, width: W, height: 62, color: navy });
    page.drawText(title, { x: 32, y: H - 30, size: 16, font: bold, color: white });
    page.drawText(subtitle, { x: 32, y: H - 48, size: 9, font: helv, color: rgb(0.75, 0.8, 0.88) });
    page.drawText(`Site: ${data.site}    |    Report period: ${data.period}`, {
      x: 32, y: H - 58, size: 7.5, font: helv, color: rgb(0.6, 0.68, 0.8),
    });
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
        size: 7.5, bg: rgb(0.15, 0.2, 0.3), fg: white, border: rgb(0.15, 0.2, 0.3),
      });
      x += 84;
    });
  };

  const card = (page: any, x: number, y: number, w: number, h: number, label: string) => {
    page.drawRectangle({ x, y, width: w, height: h, color: white, borderColor: line, borderWidth: 1 });
    page.drawText(label, { x: x + 10, y: y + h - 15, size: 7, font: bold, color: slate });
  };

  // ---- pre-rendered initial state (latest month, top customer) ----
  const mi0 = data.months.length - 1;
  const k0 = data.months[mi0].k;
  const kp0 = mi0 > 0 ? data.months[mi0 - 1].k : null;
  const cellOf = (c: string, k: string) => data.cust[c]?.[k] || { t: 0, o: 0, c: 0 };
  const eurS = (n: number) =>
    'EUR ' + new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(Math.round(n || 0));
  const pctS = (n: number | null) => (n === null ? 'n/a' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%');
  const rank0 = data.customers
    .map(c => ({ n: c, v: cellOf(c, k0).t }))
    .filter(r => r.v > 0)
    .sort((a, b) => b.v - a.v);
  const cust0 = rank0[0]?.n || data.customers[0] || '';
  const total0 = data.totals[k0] || 0;
  const top10_0 = rank0.slice(0, 10).reduce((s, r) => s + r.v, 0);
  const prevTotal0 = kp0 ? data.totals[kp0] || 0 : 0;
  const cur0 = cellOf(cust0, k0);
  const prev0 = kp0 ? cellOf(cust0, kp0) : { t: 0, o: 0, c: 0 };
  let totT0 = 0, totO0 = 0, totC0 = 0, ytd0 = 0;
  data.months.forEach(m => {
    const c = cellOf(cust0, m.k);
    totT0 += c.t; totO0 += c.o; totC0 += c.c;
    if (m.k.slice(0, 4) === k0.slice(0, 4) && m.k <= k0) ytd0 += c.t;
  });
  const maxv0 = Math.max(...data.months.map(m => cellOf(cust0, m.k).t), 0);
  const init: Record<string, string> = {
    k_month: `Selected month: ${data.months[mi0].label}`,
    k_total: eurS(total0),
    k_top10: eurS(top10_0),
    k_other: eurS(total0 - top10_0),
    k_topcust: rank0.length ? `${rank0[0].n}  (${eurS(rank0[0].v)})` : '-',
    k_mom: pctS(prevTotal0 > 0 ? ((total0 - prevTotal0) / prevTotal0) * 100 : null),
    rank_title: `Top 10 Customers - ${data.months[mi0].label}`,
    c_name: cust0 || '-',
    c_sub: `Selected month: ${data.months[mi0].label}   |   Rank #${(rank0.findIndex(r => r.n === cust0) + 1) || '-'}   |   Share of month ${total0 > 0 ? ((cur0.t / total0) * 100).toFixed(1) + '%' : '-'}`,
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
  const I = (n: string) => init[n] ?? '';

  // ================= PAGE 1 : OVERVIEW =================
  const p1 = pages[0];
  header(p1, 'Top 10 Customers by Month', 'Customer Revenue & Financial Overview');
  nav(p1, 'p1');

  p1.drawText(
    'Interactive PDF - for the best experience open this report in Adobe Acrobat Reader or Adobe Acrobat on desktop. Some browser based PDF viewers may not support all interactive features.',
    { x: 32, y: H - 78, size: 7, font: helv, color: slate }
  );

  // month buttons
  const mCount = data.months.length;
  const mW = Math.min(60, (W - 64 - (mCount - 1) * 5) / mCount);
  data.months.forEach((m, i) => {
    btn(`m1_${i}`, m.label, p1, 32 + i * (mW + 5), H - 108, mW, 22, `setMonth(${i});`, { size: 8 });
  });

  // KPI cards
  const kpis: [string, string][] = [
    ['TOTAL REVENUE', 'k_total'],
    ['TOP 10 CUSTOMER REVENUE', 'k_top10'],
    ['OTHER CUSTOMERS', 'k_other'],
    ['TOP CUSTOMER', 'k_topcust'],
    ['MONTH OVER MONTH', 'k_mom'],
  ];
  const cw = (W - 64 - 4 * 8) / 5;
  kpis.forEach(([label, field], i) => {
    const x = 32 + i * (cw + 8);
    card(p1, x, H - 190, cw, 62, label);
    txt(field, '', p1, x + 8, H - 178, cw - 16, 22, { size: field === 'k_topcust' ? 9 : 14, boldFont: true });
  });
  txt('k_month', '', p1, 32, H - 205, 200, 12, { size: 8, fg: slate });

  // ranking table
  txt('rank_title', '', p1, 32, H - 230, 400, 14, { size: 11, boldFont: true });
  const cols = [
    { label: 'RANK', x: 32, w: 40 },
    { label: 'CUSTOMER (click to select)', x: 72, w: 330 },
    { label: 'REVENUE', x: 402, w: 110 },
    { label: '% OF TOTAL', x: 512, w: 90 },
    { label: 'VS PREVIOUS MONTH', x: 602, w: 130 },
  ];
  let ry = H - 252;
  p1.drawRectangle({ x: 32, y: ry - 4, width: W - 64, height: 18, color: light });
  cols.forEach(c => p1.drawText(c.label, { x: c.x + 6, y: ry + 1, size: 7, font: bold, color: slate }));
  ry -= 20;
  for (let j = 0; j < 10; j++) {
    const y = ry - j * 24;
    p1.drawLine({ start: { x: 32, y: y - 3 }, end: { x: W - 32, y: y - 3 }, color: line, thickness: 0.5 });
    p1.drawText(String(j + 1), { x: 40, y: y + 5, size: 8.5, font: bold, color: slate });
    btn(`rc${j}`, '', p1, 72, y, 330, 18, `setCustomerByRank(${j});`, {
      size: 8.5, bg: white, fg: navy, border: white,
    });
    txt(`rr${j}`, '', p1, 402, y + 2, 100, 14, { size: 8.5, align: TextAlignment.Right, boldFont: true });
    txt(`rp${j}`, '', p1, 512, y + 2, 80, 14, { size: 8.5, align: TextAlignment.Right });
    txt(`rd${j}`, '', p1, 602, y + 2, 100, 14, { size: 8.5, align: TextAlignment.Right });
  }

  // ================= PAGE 2 : CUSTOMER =================
  const p2 = pages[1];
  header(p2, 'Customer Overview', 'Select a customer and a month - all values recalculate inside the PDF');
  nav(p2, 'p2');

  data.months.forEach((m, i) => {
    btn(`m2_${i}`, m.label, p2, 32 + i * (mW + 5), H - 90, mW, 20, `setMonth(${i});`, { size: 8 });
  });

  p2.drawText('CUSTOMER', { x: 32, y: H - 108, size: 7, font: bold, color: slate });
  const dd = form.createDropdown('cust_select');
  dd.setOptions(data.customers);
  dd.select(data.customers[0]);
  dd.addToPage(p2, {
    x: 32, y: H - 132, width: 330, height: 20,
    font: helv, textColor: navy, backgroundColor: white, borderColor: line, borderWidth: 1,
  });
  dd.acroField.setFontSize(9);
  // commit on selection change + run selection script
  dd.acroField.dict.set(PDFName.of('Ff'), doc.context.obj((1 << 26)));
  dd.acroField.getWidgets().forEach(w => {
    w.dict.set(PDFName.of('AA'), doc.context.obj({ V: jsAction('setCustomer(event.value);') }));
  });

  txt('c_name', '', p2, 372, H - 130, 440, 18, { size: 13, boldFont: true });
  txt('c_sub', '', p2, 372, H - 146, 440, 12, { size: 8, fg: slate });

  const custKpis: [string, string][] = [
    ['TOTAL REVENUE (PERIOD)', 'c_total'],
    ['CURRENT MONTH', 'c_cur'],
    ['PREVIOUS MONTH', 'c_prev'],
    ['MONTH OVER MONTH', 'c_mom'],
    ['YTD REVENUE', 'c_ytd'],
  ];
  custKpis.forEach(([label, field], i) => {
    const x = 32 + i * (cw + 8);
    card(p2, x, H - 216, cw, 58, label);
    txt(field, '', p2, x + 8, H - 205, cw - 16, 20, { size: 12, boldFont: true });
  });

  // financial status
  p2.drawText('CUSTOMER FINANCIAL STATUS (selected month / full period)', {
    x: 32, y: H - 236, size: 8, font: bold, color: navy,
  });
  const statuses: [string, string, string][] = [
    ['CLOSED', 'c_closed', 'c_closed_p'],
    ['OPEN', 'c_open', 'c_open_p'],
    ['TO RECEIVE', 'c_toreceive', 'c_toreceive_p'],
  ];
  const sw = (390 - 2 * 10) / 3;
  statuses.forEach(([label, f1, f2], i) => {
    const x = 32 + i * (sw + 10);
    card(p2, x, H - 310, sw, 66, label);
    txt(f1, '', p2, x + 8, H - 288, sw - 16, 20, { size: 12, boldFont: true });
    txt(f2, '', p2, x + 8, H - 304, sw - 16, 14, { size: 8, fg: slate });
  });

  // monthly history + bars
  p2.drawText('CUSTOMER MONTHLY HISTORY', { x: 32, y: H - 330, size: 8, font: bold, color: navy });
  p2.drawText('MONTH', { x: 38, y: H - 346, size: 7, font: bold, color: slate });
  p2.drawText('REVENUE', { x: 120, y: H - 346, size: 7, font: bold, color: slate });
  p2.drawText('STATUS', { x: 240, y: H - 346, size: 7, font: bold, color: slate });
  p2.drawText('REVENUE TREND (selected customer)', { x: 470, y: H - 330, size: 8, font: bold, color: navy });

  const rowH = 19;
  const barTop = H - 352;
  data.months.forEach((_, i) => {
    const y = H - 366 - i * rowH;
    txt(`h_m${i}`, '', p2, 38, y, 76, 13, { size: 8, boldFont: true });
    txt(`h_v${i}`, '', p2, 116, y, 110, 13, { size: 8, align: TextAlignment.Right });
    txt(`h_s${i}`, '', p2, 240, y, 140, 13, { size: 8, fg: slate });
    const b = form.createButton(`bar${i}`);
    b.addToPage('', p2, {
      x: 470, y: barTop - (i + 1) * rowH + 4, width: 20, height: rowH - 4,
      font: helv, backgroundColor: rgb(0.23, 0.51, 0.96), borderWidth: 0, textColor: white,
    });
    setAction(b, `setMonth(${i});`);
  });

  // ================= PAGE 3 : MONTHLY REVENUE MATRIX =================
  const p3 = pages[2];
  header(p3, 'Monthly Revenue', 'Revenue by customer and month - embedded data');
  nav(p3, 'p3');

  const top = data.customers.slice(0, 12);
  const colW = Math.min(52, (W - 64 - 230) / Math.max(1, data.months.length));
  let hy = H - 96;
  p3.drawRectangle({ x: 32, y: hy - 4, width: W - 64, height: 18, color: light });
  p3.drawText('CUSTOMER', { x: 38, y: hy + 1, size: 7, font: bold, color: slate });
  data.months.forEach((m, i) => {
    p3.drawText(m.label, { x: 262 + i * colW, y: hy + 1, size: 6.5, font: bold, color: slate });
  });
  hy -= 20;
  const nf = (n: number) =>
    n ? new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 }).format(n) : '-';
  top.forEach((c, r) => {
    const y = hy - r * 18;
    p3.drawLine({ start: { x: 32, y: y - 4 }, end: { x: W - 32, y: y - 4 }, color: line, thickness: 0.5 });
    p3.drawText(c.length > 40 ? c.slice(0, 40) + '.' : c, { x: 38, y, size: 7.5, font: helv, color: navy });
    data.months.forEach((m, i) => {
      p3.drawText(nf(data.cust[c]?.[m.k]?.t || 0), { x: 262 + i * colW, y, size: 6.5, font: helv, color: navy });
    });
  });
  const ty = hy - top.length * 18 - 6;
  p3.drawText('SITE TOTAL', { x: 38, y: ty, size: 7.5, font: bold, color: navy });
  data.months.forEach((m, i) => {
    p3.drawText(nf(data.totals[m.k] || 0), { x: 262 + i * colW, y: ty, size: 6.5, font: bold, color: navy });
  });

  // document level JavaScript with all embedded data
  doc.addJavaScript('npi_report', buildScript(data, { x: 470, top: barTop, h: rowH, maxw: 320 }));

  form.updateFieldAppearances(helv);
  const bytes = await doc.save({ updateFieldAppearances: false });
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.site.replace(/[^A-Za-z0-9]+/g, '_')}_Interactive_Customer_Report.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
