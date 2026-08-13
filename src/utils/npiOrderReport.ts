import { supabase } from '@/integrations/supabase/client';

export type Row = Record<string, any>;

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const findCol = (cols: string[], candidates: string[]): string | null => {
  const normalized = cols.map(c => ({ orig: c, n: norm(c) }));
  for (const cand of candidates) {
    const cn = norm(cand);
    const exact = normalized.find(c => c.n === cn);
    if (exact) return exact.orig;
  }
  for (const cand of candidates) {
    const cn = norm(cand);
    const partial = normalized.find(c => c.n.includes(cn));
    if (partial) return partial.orig;
  }
  return null;
};

export const toNum = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).replace(/[€$£\s]/g, '').replace(/[()]/g, m => (m === '(' ? '-' : ''));
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1;
    if (s.split(',').length === 2 && after > 0 && after <= 2) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

const toStr = (v: any): string => (v === null || v === undefined ? '' : String(v).trim());

const excelDateToJS = (v: any): Date | null => {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number' && v > 25000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const isOpenStatus = (s: string): boolean => {
  const raw = String(s || '').trim();
  if (!raw) return false;
  const upper = raw.toUpperCase();
  if (upper === 'O' || upper === 'OPEN') return true;
  if (upper === 'C' || upper === 'CLOSED') return false;
  const n = norm(raw);
  if (n.includes('close') || n.includes('complete') || n.includes('done') || n.includes('deliver') || n.includes('ship') || n.includes('cancel') || n.includes('invoiced')) return false;
  return true;
};

const isYes = (v: any): boolean => {
  const u = String(v ?? '').trim().toUpperCase();
  return u === 'YES' || u === 'Y' || u === 'TRUE' || u === '1';
};

export type NormRow = {
  customer: string;
  po: string;
  part: string;
  revenue: number;
  status: string;
  commodity: string;
  date: Date | null;
  isNpi: boolean;
};

export const normaliseRows = (rows: Row[]): { rows: NormRow[]; hasNpiCol: boolean } => {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const colMap = {
    customer: findCol(cols, ['customer_name', 'customername', 'customer name', 'customer', 'client', 'account']),
    po: findCol(cols, ['so_number', 'sonumber', 'so number', 'so no', 'po', 'po number', 'po no', 'purchase order', 'order no', 'order number']),
    part: findCol(cols, ['so_item', 'soitem', 'so item', 'part', 'part number', 'part no', 'pn', 'item']),
    revenue: findCol(cols, ['so_line_total', 'solinetotal', 'so line total', 'line total', 'total_value_eur', 'totalvalueeur', 'total value eur', 'value eur', 'value_eur', 'tl €', 'tl eur', 'tl', 'total €', 'total eur', 'revenue', 'order value', 'po value', 'amount', 'eur', 'euro', 'total_value', 'total value', 'total', 'value']),
    status: findCol(cols, ['so_line_status', 'solinestatus', 'so line status', 'line_status', 'line status', 'po_status', 'postatus', 'po status', 'order_status', 'order status', 'status', 'state']),
    commodity: findCol(cols, ['commodity', 'category', 'type', 'product family', 'process']),
    date: findCol(cols, ['so_date', 'sodate', 'so date', 'date', 'order date', 'received', 'date received', 'po date', 'received date']),
    npi: findCol(cols, ['npi?', 'npi', 'is_npi', 'isnpi']),
  };
  return {
    hasNpiCol: !!colMap.npi,
    rows: rows.map(r => ({
      customer: colMap.customer ? toStr(r[colMap.customer]) : '',
      po: colMap.po ? toStr(r[colMap.po]) : '',
      part: colMap.part ? toStr(r[colMap.part]) : '',
      revenue: colMap.revenue ? toNum(r[colMap.revenue]) : 0,
      status: colMap.status ? toStr(r[colMap.status]) : '',
      commodity: colMap.commodity ? toStr(r[colMap.commodity]) : '',
      date: colMap.date ? excelDateToJS(r[colMap.date]) : null,
      isNpi: colMap.npi ? isYes(r[colMap.npi]) : true,
    })),
  };
};

export type SiteDataset = {
  site: string;
  fileName: string;
  rows: NormRow[];
  hasNpiCol: boolean;
  source: 'database' | 'local' | 'none';
};

const localData = (site: string): { rows: Row[]; fileName: string } => {
  try {
    const raw = localStorage.getItem(`npi-oi-data:${site}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return {
      rows: Array.isArray(parsed) ? parsed : [],
      fileName: localStorage.getItem(`npi-oi-filename:${site}`) || '',
    };
  } catch {
    return { rows: [], fileName: '' };
  }
};

export const loadSiteDataset = async (site: string): Promise<SiteDataset> => {
  let raw: Row[] = [];
  let fileName = '';
  let source: SiteDataset['source'] = 'none';

  const { data } = await supabase
    .from('npi_order_dashboard_data')
    .select('data, file_name, revenue_targets')
    .eq('site', site)
    .maybeSingle();

  if (data && Array.isArray(data.data) && data.data.length) {
    raw = data.data as Row[];
    fileName = data.file_name || '';
    source = 'database';
  } else {
    const local = localData(site);
    if (local.rows.length) {
      raw = local.rows;
      fileName = local.fileName;
      source = 'local';
    }
  }

  // Cache the shared revenue targets so getSiteRevenueTarget works for sites
  // this browser has never opened.
  if (data?.revenue_targets && typeof data.revenue_targets === 'object') {
    Object.entries(data.revenue_targets as Record<string, number>).forEach(([k, v]) => {
      const key = k === 'all'
        ? `npi-oi-total-company-revenue:${site}`
        : `npi-oi-total-company-revenue:${site}:${k}`;
      try { localStorage.setItem(key, String(v || 0)); } catch {}
    });
  }

  const { rows, hasNpiCol } = normaliseRows(raw);
  return { site, fileName, rows, hasNpiCol, source };
};

export const getSiteRevenueTarget = (site: string, year: string): number => {
  const keys = year === 'all'
    ? [`npi-oi-total-company-revenue:${site}`]
    : [`npi-oi-total-company-revenue:${site}:${year}`, `npi-oi-total-company-revenue:${site}`];
  for (const k of keys) {
    const v = parseFloat(localStorage.getItem(k) || '0') || 0;
    if (v > 0) return v;
  }
  return 0;
};


export type SiteStats = {
  site: string;
  label: string;
  fileName: string;
  lines: number;
  orders: number;
  customers: number;
  parts: number;
  revenue: number;
  openLines: number;
  openRevenue: number;
  closedLines: number;
  closedRevenue: number;
  avgOrder: number;
  companyRevenue: number;
  npvi: number | null;
  topCustomers: { name: string; revenue: number; lines: number }[];
  topParts: { name: string; revenue: number; lines: number }[];
  monthly: number[];
  monthlyOrders: number[];
};

export const computeSiteStats = (
  ds: SiteDataset,
  label: string,
  year: string,
  npiOnly: boolean
): SiteStats => {
  let rows = ds.rows;
  if (npiOnly && ds.hasNpiCol) rows = rows.filter(r => r.isNpi);
  if (year !== 'all') rows = rows.filter(r => r.date && String(r.date.getFullYear()) === year);

  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const open = rows.filter(r => isOpenStatus(r.status));
  const closed = rows.filter(r => !isOpenStatus(r.status));
  const orders = new Set(rows.map(r => r.po).filter(Boolean)).size;

  const agg = (key: (r: NormRow) => string) => {
    const m: Record<string, { revenue: number; lines: number }> = {};
    rows.forEach(r => {
      const k = key(r) || 'Unknown';
      if (!m[k]) m[k] = { revenue: 0, lines: 0 };
      m[k].revenue += r.revenue;
      m[k].lines += 1;
    });
    return Object.entries(m)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  const monthly = Array(12).fill(0) as number[];
  const monthlyOrders = Array(12).fill(0) as number[];
  rows.forEach(r => {
    if (!r.date) return;
    monthly[r.date.getMonth()] += r.revenue;
    monthlyOrders[r.date.getMonth()] += 1;
  });

  const companyRevenue = getSiteRevenueTarget(ds.site, year);

  return {
    site: ds.site,
    label,
    fileName: ds.fileName,
    lines: rows.length,
    orders,
    customers: new Set(rows.map(r => r.customer).filter(Boolean)).size,
    parts: new Set(rows.map(r => r.part).filter(Boolean)).size,
    revenue,
    openLines: open.length,
    openRevenue: open.reduce((s, r) => s + r.revenue, 0),
    closedLines: closed.length,
    closedRevenue: closed.reduce((s, r) => s + r.revenue, 0),
    avgOrder: orders > 0 ? revenue / orders : 0,
    companyRevenue,
    npvi: companyRevenue > 0 ? (revenue / companyRevenue) * 100 : null,
    topCustomers: agg(r => r.customer).slice(0, 5),
    topParts: agg(r => r.part).slice(0, 5),
    monthly,
    monthlyOrders,
  };
};

export const availableYears = (datasets: SiteDataset[]): string[] => {
  const set = new Set<string>();
  datasets.forEach(ds => ds.rows.forEach(r => { if (r.date) set.add(String(r.date.getFullYear())); }));
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
};
