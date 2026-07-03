import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import {
  Upload, Download, FileSpreadsheet, Package, CheckCircle2, Clock, Euro,
  Search, FileDown, Info, TrendingUp, TrendingDown, Minus, GitCompare,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Tooltip as ShadcnTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type Row = Record<string, any>;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

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

const toNum = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v).replace(/[€$£\s]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '');
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

/** C = Closed/Invoiced, O = Open/To-be-invoiced. Any other value falls back to keyword logic. */
const isOpenStatus = (s: string): boolean => {
  const raw = String(s || '').trim();
  if (!raw) return false;
  const upper = raw.toUpperCase();
  if (upper === 'O' || upper === 'OPEN') return true;
  if (upper === 'C' || upper === 'CLOSED') return false;
  const n = norm(raw);
  if (n.includes('close') || n.includes('complete') || n.includes('done') || n.includes('deliver') || n.includes('ship') || n.includes('cancel') || n.includes('invoiced')) return false;
  return true;
};

const statusLabel = (s: string): string => {
  const u = String(s || '').trim().toUpperCase();
  if (u === 'C') return 'Closed (Invoiced)';
  if (u === 'O') return 'Open (To Invoice)';
  return s || '—';
};

const isYes = (v: any): boolean => {
  const u = String(v ?? '').trim().toUpperCase();
  return u === 'YES' || u === 'Y' || u === 'TRUE' || u === '1';
};

const fmtEur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat('en-IE').format(n || 0);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STORAGE_KEY_REV = 'npi-oi-total-company-revenue';
const STORAGE_KEY_REV_YEAR = (y: number) => `npi-oi-total-company-revenue:${y}`;
const STORAGE_KEY_DATA = 'npi-oi-data';

type NormRow = {
  raw: Row;
  customer: string;
  po: string;
  part: string;
  revenue: number;
  status: string;
  commodity: string;
  date: Date | null;
  isNpi: boolean;
};

export default function NPIOrderIntelligence() {
  const [rows, setRows] = useState<Row[]>(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY_DATA);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [fileName, setFileName] = useState<string>('');
  const [totalCompanyRevenue, setTotalCompanyRevenue] = useState<number>(() => {
    return parseFloat(localStorage.getItem(STORAGE_KEY_REV) || '0') || 0;
  });
  // per-year override in single mode
  const [yearRevenue, setYearRevenue] = useState<number>(0);

  // View mode
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  // filters
  const [fCustomer, setFCustomer] = useState<string>('all');
  const [fCommodity, setFCommodity] = useState<string>('all');
  const [fStatus, setFStatus] = useState<string>('all');
  const [fYear, setFYear] = useState<string>('all');
  const [fFrom, setFFrom] = useState<string>('');
  const [fTo, setFTo] = useState<string>('');
  const [npiOnly, setNpiOnly] = useState<boolean>(true);
  const [openSearch, setOpenSearch] = useState<string>('');

  // compare selects
  const [yearA, setYearA] = useState<string>('');
  const [yearB, setYearB] = useState<string>('');

  const dashRef = useRef<HTMLDivElement>(null);
  const chartRefs = {
    revByCustomer: useRef<HTMLDivElement>(null),
    ordByCustomer: useRef<HTMLDivElement>(null),
    revByCommodity: useRef<HTMLDivElement>(null),
    ordByCommodity: useRef<HTMLDivElement>(null),
    revByPart: useRef<HTMLDivElement>(null),
    ordByPart: useRef<HTMLDivElement>(null),
    ordByMonth: useRef<HTMLDivElement>(null),
    revByMonth: useRef<HTMLDivElement>(null),
    cmpRevByMonth: useRef<HTMLDivElement>(null),
    cmpOrdByMonth: useRef<HTMLDivElement>(null),
    cmpTopCustomers: useRef<HTMLDivElement>(null),
    cmpKpiPanel: useRef<HTMLDivElement>(null),
    cmpKpiExport: useRef<HTMLDivElement>(null),
  };

  const handleFile = useCallback(async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Row>(ws, { defval: null });
      setRows(data);
      setFileName(file.name);
      try { sessionStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data)); } catch {}
      toast.success(`Loaded ${data.length} rows from ${file.name}`);
    } catch (e: any) {
      toast.error('Failed to read file: ' + e.message);
    }
  }, []);

  const cols = useMemo(() => rows.length ? Object.keys(rows[0]) : [], [rows]);
  const autoColMap = useMemo(() => ({
    customer: findCol(cols, ['customer_name', 'customername', 'customer name', 'customer', 'client', 'account']),
    po: findCol(cols, ['so_number', 'sonumber', 'so number', 'so no', 'po', 'po number', 'po no', 'purchase order', 'order no', 'order number']),
    part: findCol(cols, ['so_item', 'soitem', 'so item', 'part', 'part number', 'part no', 'pn', 'item']),
    revenue: findCol(cols, ['so_line_total', 'solinetotal', 'so line total', 'line total', 'total_value_eur', 'totalvalueeur', 'total value eur', 'value eur', 'value_eur', 'tl €', 'tl eur', 'tl', 'total €', 'total eur', 'revenue', 'order value', 'po value', 'amount', 'eur', 'euro', 'total_value', 'total value', 'total', 'value']),
    status: findCol(cols, ['so_line_status', 'solinestatus', 'so line status', 'line_status', 'line status', 'po_status', 'postatus', 'po status', 'order_status', 'order status', 'status', 'state']),
    commodity: findCol(cols, ['commodity', 'category', 'type', 'product family', 'process']),
    date: findCol(cols, ['so_date', 'sodate', 'so date', 'date', 'order date', 'received', 'date received', 'po date', 'received date']),
    npi: findCol(cols, ['npi?', 'npi', 'is_npi', 'isnpi']),
  }), [cols]);

  const [revenueColOverride, setRevenueColOverride] = useState<string>('');
  const colMap = useMemo(() => ({
    ...autoColMap,
    revenue: revenueColOverride || autoColMap.revenue,
  }), [autoColMap, revenueColOverride]);

  const hasNpiCol = !!colMap.npi;

  const normalised: NormRow[] = useMemo(() => rows.map(r => {
    const date = colMap.date ? excelDateToJS(r[colMap.date]) : null;
    return {
      raw: r,
      customer: colMap.customer ? toStr(r[colMap.customer]) : '',
      po: colMap.po ? toStr(r[colMap.po]) : '',
      part: colMap.part ? toStr(r[colMap.part]) : '',
      revenue: colMap.revenue ? toNum(r[colMap.revenue]) : 0,
      status: colMap.status ? toStr(r[colMap.status]) : '',
      commodity: colMap.commodity ? toStr(r[colMap.commodity]) : '',
      date,
      isNpi: colMap.npi ? isYes(r[colMap.npi]) : true,
    };
  }), [rows, colMap]);

  // Base dataset after NPI toggle (applies to everything).
  const base = useMemo(
    () => hasNpiCol && npiOnly ? normalised.filter(r => r.isNpi) : normalised,
    [normalised, hasNpiCol, npiOnly],
  );

  const years = useMemo(() => {
    const set = new Set<number>();
    base.forEach(r => { if (r.date) set.add(r.date.getFullYear()); });
    return Array.from(set).sort((a, b) => b - a);
  }, [base]);

  // default compare years to two most recent
  useEffect(() => {
    if (years.length && !yearA && !yearB) {
      setYearA(String(years[0]));
      setYearB(years[1] ? String(years[1]) : String(years[0]));
    }
  }, [years, yearA, yearB]);

  const customers = useMemo(() => Array.from(new Set(base.map(r => r.customer).filter(Boolean))).sort(), [base]);
  const commodities = useMemo(() => Array.from(new Set(base.map(r => r.commodity).filter(Boolean))).sort(), [base]);
  const statuses = useMemo(() => Array.from(new Set(base.map(r => r.status).filter(Boolean))).sort(), [base]);

  const applyCommonFilters = useCallback((list: NormRow[]) => {
    const fromD = fFrom ? new Date(fFrom) : null;
    const toD = fTo ? new Date(fTo) : null;
    return list.filter(r => {
      if (fCustomer !== 'all' && r.customer !== fCustomer) return false;
      if (fCommodity !== 'all' && r.commodity !== fCommodity) return false;
      if (fStatus !== 'all' && r.status !== fStatus) return false;
      if (fromD && (!r.date || r.date < fromD)) return false;
      if (toD && (!r.date || r.date > toD)) return false;
      return true;
    });
  }, [fCustomer, fCommodity, fStatus, fFrom, fTo]);

  const filtered = useMemo(() => {
    let list = applyCommonFilters(base);
    if (fYear !== 'all') {
      const y = parseInt(fYear, 10);
      list = list.filter(r => r.date && r.date.getFullYear() === y);
    }
    return list;
  }, [base, applyCommonFilters, fYear]);

  const computeKpis = (list: NormRow[]) => {
    const total = list.length;
    const open = list.filter(r => isOpenStatus(r.status));
    const closed = list.filter(r => !isOpenStatus(r.status) && r.status);
    const totalRev = list.reduce((s, r) => s + r.revenue, 0);
    const openRev = open.reduce((s, r) => s + r.revenue, 0);
    const closedRev = closed.reduce((s, r) => s + r.revenue, 0);
    return { total, open: open.length, closed: closed.length, totalRev, openRev, closedRev };
  };

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const effectiveCompanyRev = fYear !== 'all' ? yearRevenue : totalCompanyRevenue;
  const npvi = effectiveCompanyRev > 0 ? (kpis.totalRev / effectiveCompanyRev) * 100 : 0;

  // Customer analysis
  const byCustomer = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    filtered.forEach(r => {
      if (!r.customer) return;
      const cur = map.get(r.customer) || { revenue: 0, orders: 0 };
      cur.revenue += r.revenue;
      cur.orders += 1;
      map.set(r.customer, cur);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [filtered]);

  const customerByRevenue = useMemo(() =>
    [...byCustomer].sort((a, b) => b.revenue - a.revenue).slice(0, 15), [byCustomer]);
  const customerByOrders = useMemo(() =>
    [...byCustomer].sort((a, b) => b.orders - a.orders).slice(0, 15), [byCustomer]);

  const byCommodity = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    filtered.forEach(r => {
      const key = r.commodity || 'Unspecified';
      const cur = map.get(key) || { revenue: 0, orders: 0 };
      cur.revenue += r.revenue;
      cur.orders += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [filtered]);

  const byPart = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    filtered.forEach(r => {
      if (!r.part) return;
      const cur = map.get(r.part) || { revenue: 0, orders: 0 };
      cur.revenue += r.revenue;
      cur.orders += 1;
      map.set(r.part, cur);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [filtered]);

  const partByRevenue = useMemo(() =>
    [...byPart].sort((a, b) => b.revenue - a.revenue).slice(0, 15), [byPart]);
  const partByOrders = useMemo(() =>
    [...byPart].sort((a, b) => b.orders - a.orders).slice(0, 15), [byPart]);

  const hasCommodityData = useMemo(
    () => byCommodity.length > 1 || (byCommodity[0] && byCommodity[0].name !== 'Unspecified'),
    [byCommodity]
  );

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; orders: number; revenue: number; sortKey: string }>();
    filtered.forEach(r => {
      if (!r.date) return;
      const sortKey = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
      const month = r.date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      const cur = map.get(sortKey) || { month, orders: 0, revenue: 0, sortKey };
      cur.orders += 1;
      cur.revenue += r.revenue;
      map.set(sortKey, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filtered]);

  const topOrders = useMemo(() =>
    [...filtered].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [filtered]);

  const openOrders = useMemo(() => {
    const list = filtered.filter(r => isOpenStatus(r.status));
    if (!openSearch.trim()) return list;
    const q = openSearch.toLowerCase();
    return list.filter(r =>
      r.customer.toLowerCase().includes(q) ||
      r.po.toLowerCase().includes(q) ||
      r.part.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  }, [filtered, openSearch]);

  const completeness = useMemo(() => {
    if (!rows.length) return [];
    return cols.map(c => {
      const populated = rows.filter(r => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== '').length;
      return { field: c, pct: (populated / rows.length) * 100, populated, total: rows.length };
    }).sort((a, b) => b.pct - a.pct);
  }, [rows, cols]);

  // Load per-year revenue when single-mode year changes
  useEffect(() => {
    if (fYear !== 'all') {
      const y = parseInt(fYear, 10);
      setYearRevenue(parseFloat(localStorage.getItem(STORAGE_KEY_REV_YEAR(y)) || '0') || 0);
    }
  }, [fYear]);

  const saveTotalRev = (v: string) => {
    const n = parseFloat(v) || 0;
    if (fYear !== 'all') {
      const y = parseInt(fYear, 10);
      setYearRevenue(n);
      localStorage.setItem(STORAGE_KEY_REV_YEAR(y), String(n));
      // keep compare-mode in sync if applicable
      if (String(y) === yearA) setCompanyRevA(n);
      if (String(y) === yearB) setCompanyRevB(n);
    } else {
      setTotalCompanyRevenue(n);
      localStorage.setItem(STORAGE_KEY_REV, String(n));
    }
  };

  // ===== COMPARE =====
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);

  const [companyRevA, setCompanyRevA] = useState<number>(0);
  const [companyRevB, setCompanyRevB] = useState<number>(0);

  // load per-year revenues whenever selection changes
  useEffect(() => {
    if (yearA) setCompanyRevA(parseFloat(localStorage.getItem(STORAGE_KEY_REV_YEAR(yA)) || '0') || 0);
  }, [yearA, yA]);
  useEffect(() => {
    if (yearB) setCompanyRevB(parseFloat(localStorage.getItem(STORAGE_KEY_REV_YEAR(yB)) || '0') || 0);
  }, [yearB, yB]);

  const saveYearRev = (year: number, v: string, side: 'A' | 'B') => {
    const n = parseFloat(v) || 0;
    localStorage.setItem(STORAGE_KEY_REV_YEAR(year), String(n));
    if (side === 'A') setCompanyRevA(n); else setCompanyRevB(n);
  };

  const filteredForYear = useCallback((year: number) => {
    return applyCommonFilters(base).filter(r => r.date && r.date.getFullYear() === year);
  }, [applyCommonFilters, base]);

  const dataA = useMemo(() => yearA ? filteredForYear(yA) : [], [yearA, yA, filteredForYear]);
  const dataB = useMemo(() => yearB ? filteredForYear(yB) : [], [yearB, yB, filteredForYear]);

  const kpisA = useMemo(() => computeKpis(dataA), [dataA]);
  const kpisB = useMemo(() => computeKpis(dataB), [dataB]);
  const npviA = companyRevA > 0 ? (kpisA.totalRev / companyRevA) * 100 : 0;
  const npviB = companyRevB > 0 ? (kpisB.totalRev / companyRevB) * 100 : 0;

  const monthByMonth = useMemo(() => {
    const buildMap = (list: NormRow[]) => {
      const m = new Array(12).fill(0).map(() => ({ orders: 0, revenue: 0 }));
      list.forEach(r => {
        if (!r.date) return;
        const mi = r.date.getMonth();
        m[mi].orders += 1;
        m[mi].revenue += r.revenue;
      });
      return m;
    };
    const a = buildMap(dataA);
    const b = buildMap(dataB);
    return MONTHS.map((month, i) => ({
      month,
      [`revenue_${yearA || 'A'}`]: a[i].revenue,
      [`revenue_${yearB || 'B'}`]: b[i].revenue,
      [`orders_${yearA || 'A'}`]: a[i].orders,
      [`orders_${yearB || 'B'}`]: b[i].orders,
    }));
  }, [dataA, dataB, yearA, yearB]);

  const compareCustomers = useMemo(() => {
    const build = (list: NormRow[]) => {
      const m = new Map<string, number>();
      list.forEach(r => { if (r.customer) m.set(r.customer, (m.get(r.customer) || 0) + r.revenue); });
      return m;
    };
    const a = build(dataA);
    const b = build(dataB);
    const top = new Map<string, number>();
    Array.from(a.entries()).sort((x, y) => y[1] - x[1]).slice(0, 10).forEach(([k]) => top.set(k, 0));
    Array.from(b.entries()).sort((x, y) => y[1] - x[1]).slice(0, 10).forEach(([k]) => top.set(k, 0));
    return Array.from(top.keys()).map(name => ({
      name,
      [`rev_${yearA || 'A'}`]: a.get(name) || 0,
      [`rev_${yearB || 'B'}`]: b.get(name) || 0,
    })).sort((x, y) => {
      const sumY = (y[`rev_${yearA || 'A'}`] as number) + (y[`rev_${yearB || 'B'}`] as number);
      const sumX = (x[`rev_${yearA || 'A'}`] as number) + (x[`rev_${yearB || 'B'}`] as number);
      return sumY - sumX;
    });
  }, [dataA, dataB, yearA, yearB]);

  // ===== EXPORTS =====
  const exportTopOrdersXlsx = () => {
    const data = topOrders.map(r => ({
      Customer: r.customer, 'Order No': r.po, 'Part Number': r.part,
      'Revenue €': r.revenue, Status: statusLabel(r.status),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Orders');
    XLSX.writeFile(wb, 'top-orders.xlsx');
  };

  const exportOpenOrdersXlsx = () => {
    const data = openOrders.map(r => ({
      Customer: r.customer, 'Order No': r.po, 'Part Number': r.part,
      'Revenue €': r.revenue, Status: statusLabel(r.status),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Open Orders');
    XLSX.writeFile(wb, 'open-orders.xlsx');
  };

  const capture = async (el: HTMLElement | null): Promise<string | null> => {
    if (!el) return null;
    const c = await html2canvas(el, { scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true });
    return c.toDataURL('image/png');
  };

  const pdfHeader = (pdf: jsPDF, title: string) => {
    const pw = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pw, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(title, margin, 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(`Schivo Waterford  |  ${dateStr} ${timeStr}`, margin, 15);
    pdf.setTextColor(15, 23, 42);
  };

  const pdfFooter = (pdf: jsPDF) => {
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Schivo Medical - Confidential', margin, ph - 4);
      pdf.text(`Page ${i} of ${pageCount}`, pw - margin, ph - 4, { align: 'right' });
    }
  };

  const exportPdf = async () => {
    try {
      toast.info('Generating PDF report...');
      await new Promise(r => setTimeout(r, 300));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 10;

      const yearTitle = fYear !== 'all' ? ` - ${fYear}` : '';
      pdfHeader(pdf, `NPI Order Intelligence${yearTitle}`);
      let y = 26;

      const filterBits: string[] = [];
      if (fYear !== 'all') filterBits.push(`Year: ${fYear}`);
      if (fCustomer !== 'all') filterBits.push(`Customer: ${fCustomer}`);
      if (fCommodity !== 'all') filterBits.push(`Commodity: ${fCommodity}`);
      if (fStatus !== 'all') filterBits.push(`Status: ${fStatus}`);
      if (fFrom) filterBits.push(`From: ${fFrom}`);
      if (fTo) filterBits.push(`To: ${fTo}`);
      if (hasNpiCol) filterBits.push(`NPI only: ${npiOnly ? 'Yes' : 'No'}`);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Filters: ${filterBits.length ? filterBits.join('   |   ') : 'None'}`, margin, y);
      y += 5;

      const kpiData = [
        { label: 'Total Orders', value: fmtNum(kpis.total), accent: [59, 130, 246] },
        { label: 'Open Orders', value: fmtNum(kpis.open), accent: [245, 158, 11] },
        { label: 'Closed Orders', value: fmtNum(kpis.closed), accent: [16, 185, 129] },
        { label: 'Total NPI Revenue', value: fmtEur(kpis.totalRev), accent: [59, 130, 246] },
        { label: 'Open Order Value', value: fmtEur(kpis.openRev), accent: [245, 158, 11] },
        { label: 'Closed Order Value', value: fmtEur(kpis.closedRev), accent: [16, 185, 129] },
      ];
      const gap = 3;
      const cardW = (pw - margin * 2 - gap * 2) / 3;
      const cardH = 20;
      kpiData.forEach((k, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = margin + col * (cardW + gap);
        const cy = y + row * (cardH + gap);
        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, cy, cardW, cardH, 1.5, 1.5, 'FD');
        pdf.setFillColor(k.accent[0], k.accent[1], k.accent[2]);
        pdf.rect(x, cy, 1.2, cardH, 'F');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.text(k.label.toUpperCase(), x + 4, cy + 6);
        pdf.setFontSize(13);
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.text(k.value, x + 4, cy + 14);
      });
      y += cardH * 2 + gap + 5;

      // NPVI
      pdf.setFillColor(239, 246, 255);
      pdf.setDrawColor(191, 219, 254);
      pdf.roundedRect(margin, y, pw - margin * 2, 18, 1.5, 1.5, 'FD');
      pdf.setFontSize(9.5);
      pdf.setTextColor(30, 64, 175);
      pdf.setFont('helvetica', 'bold');
      pdf.text('New Product Vitality Index', margin + 4, y + 7);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text('NPI share of total company revenue', margin + 4, y + 13);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(30, 64, 175);
      pdf.text(`${npvi.toFixed(1)}%`, pw - margin - 4, y + 10, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`NPI ${fmtEur(kpis.totalRev)}   |   Company ${fmtEur(effectiveCompanyRev)}`, pw - margin - 4, y + 15, { align: 'right' });
      y += 22;

      const colW = (pw - margin * 2 - 4) / 2;
      const chartImgH = (colW - 4) / (900 / 513);
      const titleH = 7;
      const cellH = titleH + chartImgH + 4;
      const sectionGap = 8;
      const sectionTitleH = 7;

      const renderSection = async (
        title: string,
        left: { title: string; ref: HTMLElement | null },
        right: { title: string; ref: HTMLElement | null },
      ) => {
        const needed = sectionTitleH + cellH + sectionGap;
        if (y + needed > ph - 12) { pdf.addPage(); y = margin + 4; }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, margin, y);
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.6);
        pdf.line(margin, y + 1.5, margin + 24, y + 1.5);
        pdf.setLineWidth(0.2);
        y += sectionTitleH;

        const items = [left, right];
        for (let i = 0; i < items.length; i++) {
          const x = margin + i * (colW + 4);
          pdf.setDrawColor(226, 232, 240);
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(x, y, colW, cellH, 1.5, 1.5, 'FD');
          pdf.setFontSize(8.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(15, 23, 42);
          pdf.text(items[i].title, x + 3, y + 5);
          const img = await capture(items[i].ref);
          if (img) pdf.addImage(img, 'PNG', x + 2, y + titleH, colW - 4, chartImgH, undefined, 'NONE');
        }
        y += cellH + sectionGap;
      };

      await renderSection(
        'Customer Performance',
        { title: 'Revenue by Customer (Top 15)', ref: chartRefs.revByCustomer.current },
        { title: 'Orders by Customer (Top 15)', ref: chartRefs.ordByCustomer.current },
      );
      await renderSection(
        'Top Parts',
        { title: 'Revenue by Part (Top 15)', ref: chartRefs.revByPart.current },
        { title: 'Orders by Part (Top 15)', ref: chartRefs.ordByPart.current },
      );
      if (hasCommodityData) {
        await renderSection(
          'Commodity Mix',
          { title: 'Revenue by Commodity', ref: chartRefs.revByCommodity.current },
          { title: 'Orders by Commodity', ref: chartRefs.ordByCommodity.current },
        );
      }
      await renderSection(
        'Monthly Trend',
        { title: 'Orders by Month', ref: chartRefs.ordByMonth.current },
        { title: 'Revenue by Month', ref: chartRefs.revByMonth.current },
      );

      pdfFooter(pdf);
      const now = new Date();
      pdf.save(`npi-order-intelligence${fYear !== 'all' ? '-' + fYear : ''}-${now.toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF report generated');
    } catch (e: any) {
      toast.error('PDF export failed: ' + e.message);
    }
  };

  const exportComparePdf = async () => {
    try {
      if (!yearA || !yearB) { toast.error('Pick both years first'); return; }
      toast.info('Generating comparison PDF...');
      await new Promise(r => setTimeout(r, 400));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 10;

      pdfHeader(pdf, `NPI Order Intelligence - ${yearA} vs ${yearB}`);
      let y = 26;

      const filterBits: string[] = [`Years: ${yearA} vs ${yearB}`];
      if (fCustomer !== 'all') filterBits.push(`Customer: ${fCustomer}`);
      if (fCommodity !== 'all') filterBits.push(`Commodity: ${fCommodity}`);
      if (fStatus !== 'all') filterBits.push(`Status: ${fStatus}`);
      if (hasNpiCol) filterBits.push(`NPI only: ${npiOnly ? 'Yes' : 'No'}`);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Filters: ${filterBits.join('   |   ')}`, margin, y);
      y += 6;

      // Capture the KPI comparison panel (dedicated offscreen render with safe colors)
      const kpiEl = chartRefs.cmpKpiExport.current || chartRefs.cmpKpiPanel.current;
      if (kpiEl) {
        const kpiImg = await capture(kpiEl);
        if (kpiImg) {
          const imgW = pw - margin * 2;
          const imgH = imgW * (kpiEl.offsetHeight / kpiEl.offsetWidth);
          if (y + imgH > ph - 12) { pdf.addPage(); y = margin + 4; }
          pdf.addImage(kpiImg, 'PNG', margin, y, imgW, imgH);
          y += imgH + 6;
        }
      }

      // Charts
      const colW = (pw - margin * 2 - 4) / 2;
      const chartImgH = (colW - 4) / (900 / 513);
      const titleH = 7;
      const cellH = titleH + chartImgH + 4;

      const drawChart = async (x: number, title: string, ref: HTMLElement | null) => {
        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, colW, cellH, 1.5, 1.5, 'FD');
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, x + 3, y + 5);
        const img = await capture(ref);
        if (img) pdf.addImage(img, 'PNG', x + 2, y + titleH, colW - 4, chartImgH, undefined, 'NONE');
      };

      if (y + cellH > ph - 12) { pdf.addPage(); y = margin + 4; }
      await drawChart(margin, `Revenue by Month`, chartRefs.cmpRevByMonth.current);
      await drawChart(margin + colW + 4, `Orders by Month`, chartRefs.cmpOrdByMonth.current);
      y += cellH + 6;

      if (y + cellH > ph - 12) { pdf.addPage(); y = margin + 4; }
      await drawChart(margin, `Top Customers Revenue`, chartRefs.cmpTopCustomers.current);
      y += cellH + 6;

      pdfFooter(pdf);
      pdf.save(`npi-order-comparison-${yearA}-vs-${yearB}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Comparison PDF generated');
    } catch (e: any) {
      toast.error('PDF export failed: ' + e.message);
    }
  };

  const empty = rows.length === 0;

  return (
    <AppLayout title="NPI Order Intelligence" subtitle="Executive dashboard for NPI orders" showBackButton backTo="/npi">
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Upload NPI Order Spreadsheet</CardTitle>
                <CardDescription>Excel (.xlsx / .xlsm). Reads <code>SO_Line_Total</code>, <code>SO_Line_Status</code> (C=Closed/Invoiced, O=Open/To-be-invoiced), <code>SO_Date</code>, <code>Customer_Name</code>, <code>SO_Item</code>, <code>NPI?</code>. Columns auto-detected.</CardDescription>
              </div>
              <div className="flex gap-2">
                {!empty && viewMode === 'single' && <Button variant="outline" size="sm" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />Export PDF</Button>}
                {!empty && viewMode === 'compare' && <Button variant="outline" size="sm" onClick={exportComparePdf}><FileDown className="h-4 w-4 mr-1" />Export Comparison PDF</Button>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-md cursor-pointer hover:bg-accent transition">
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Choose file</span>
                <input
                  type="file"
                  accept=".xlsx,.xlsm,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </label>
              {fileName && <span className="text-sm text-muted-foreground">{fileName} — {rows.length} rows</span>}
              {!empty && (
                <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileName(''); sessionStorage.removeItem(STORAGE_KEY_DATA); }}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {empty ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Upload an NPI order spreadsheet to see KPIs, charts and insights.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'single' | 'compare')}>
                <TabsList>
                  <TabsTrigger value="single">Single Year</TabsTrigger>
                  <TabsTrigger value="compare" className="gap-1"><GitCompare className="h-3.5 w-3.5" />Compare Years</TabsTrigger>
                </TabsList>
              </Tabs>
              {hasNpiCol && (
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="npi-only" className="text-xs">NPI parts only</Label>
                  <Switch id="npi-only" checked={npiOnly} onCheckedChange={setNpiOnly} />
                </div>
              )}
            </div>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="text-muted-foreground">Revenue column:</span>
                  <Select value={revenueColOverride || '__auto__'} onValueChange={(v) => setRevenueColOverride(v === '__auto__' ? '' : v)}>
                    <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Auto-detect ({autoColMap.revenue || 'none'})</SelectItem>
                      {cols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">Using: <span className="font-medium text-foreground">{colMap.revenue || '—'}</span></span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {viewMode === 'single' && (
                    <div>
                      <Label className="text-xs">Year</Label>
                      <Select value={fYear} onValueChange={setFYear}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Years</SelectItem>
                          {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Customer</Label>
                    <Select value={fCustomer} onValueChange={setFCustomer}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {customers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {commodities.length > 0 && (
                    <div>
                      <Label className="text-xs">Commodity</Label>
                      <Select value={fCommodity} onValueChange={setFCommodity}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {commodities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={fStatus} onValueChange={setFStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {statuses.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {viewMode === 'single' && (
                    <>
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {viewMode === 'single' ? (
              <div ref={dashRef} className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KpiCard label="Total Orders" value={fmtNum(kpis.total)} icon={Package} />
                  <KpiCard label="Open Orders" value={fmtNum(kpis.open)} icon={Clock} tone="amber" />
                  <KpiCard label="Closed Orders" value={fmtNum(kpis.closed)} icon={CheckCircle2} tone="green" />
                  <KpiCard label="Total NPI Revenue" value={fmtEur(kpis.totalRev)} icon={Euro} tone="primary" />
                  <KpiCard label="Open Value (To Invoice)" value={fmtEur(kpis.openRev)} icon={Euro} tone="amber" />
                  <KpiCard label="Closed Value (Invoiced)" value={fmtEur(kpis.closedRev)} icon={Euro} tone="green" />
                </div>

                {/* NPVI */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-5">
                      <div className="md:w-1/3">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold tracking-tight text-foreground">New Product Vitality Index</h2>
                          <TooltipProvider>
                            <ShadcnTooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors rounded-sm">
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs max-w-[240px]">NPI Revenue ÷ Total Company Revenue × 100</p>
                              </TooltipContent>
                            </ShadcnTooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">NPI share of total company revenue{fYear !== 'all' ? ` (${fYear})` : ''}</p>
                      </div>
                      <div className="md:w-1/3 flex flex-col justify-center">
                        <div className="text-3xl font-bold tracking-tight text-foreground">{npvi.toFixed(1)}%</div>
                        <div className="mt-2"><Progress value={Math.min(npvi, 100)} className="h-1.5" /></div>
                      </div>
                      <div className="md:w-1/3 flex flex-col gap-3">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">NPI Revenue</div>
                            <div className="font-semibold text-foreground tabular-nums">{fmtEur(kpis.totalRev)}</div>
                          </div>
                          <div className="h-6 w-px bg-border" />
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Company Revenue{fYear !== 'all' ? ` (${fYear})` : ' (All)'}
                            </div>
                            <div className="font-semibold text-foreground tabular-nums">{fmtEur(effectiveCompanyRev)}</div>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="totalRev" className="text-[11px] text-muted-foreground">
                            {fYear !== 'all' ? `Total Company Revenue for ${fYear} (€)` : 'Total Company Revenue — All Years (€)'}
                          </Label>
                          <Input
                            id="totalRev"
                            type="number"
                            placeholder="e.g. 5000000"
                            value={effectiveCompanyRev || ''}
                            onChange={(e) => saveTotalRev(e.target.value)}
                            className="h-8 mt-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Charts Tabs */}
                <Tabs defaultValue="customer">
                  <TabsList>
                    <TabsTrigger value="customer">Customers</TabsTrigger>
                    <TabsTrigger value="part">Top Parts</TabsTrigger>
                    {hasCommodityData && <TabsTrigger value="commodity">Commodities</TabsTrigger>}
                    <TabsTrigger value="trend">Monthly Trends</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                    <TabsTrigger value="quality">Data Quality</TabsTrigger>
                  </TabsList>

                  <TabsContent value="customer" className="grid md:grid-cols-2 gap-4 mt-4">
                    <ChartCard title="Revenue by Customer">
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={customerByRevenue} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => fmtEur(v as number)} />
                          <Bar dataKey="revenue" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Orders by Customer">
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={customerByOrders} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="orders" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </TabsContent>

                  <TabsContent value="part" className="grid md:grid-cols-2 gap-4 mt-4">
                    <ChartCard title="Revenue by Part (Top 15)">
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={partByRevenue} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => fmtEur(v as number)} />
                          <Bar dataKey="revenue" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Orders by Part (Top 15)">
                      <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={partByOrders} layout="vertical" margin={{ left: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="orders" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </TabsContent>

                  <TabsContent value="commodity" className="grid md:grid-cols-2 gap-4 mt-4">
                    <ChartCard title="Revenue by Commodity">
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie data={byCommodity} dataKey="revenue" nameKey="name" outerRadius={110} label={(d: any) => d.name}>
                            {byCommodity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => fmtEur(v as number)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Orders by Commodity">
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie data={byCommodity} dataKey="orders" nameKey="name" outerRadius={110} label={(d: any) => d.name}>
                            {byCommodity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </TabsContent>

                  <TabsContent value="trend" className="grid md:grid-cols-2 gap-4 mt-4">
                    <ChartCard title="Orders Received by Month">
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={monthly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Revenue Received by Month">
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={monthly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: any) => fmtEur(v as number)} />
                          <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </TabsContent>

                  <TabsContent value="orders" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Top 10 Highest Value Orders</CardTitle>
                        <Button size="sm" variant="outline" onClick={exportTopOrdersXlsx}><Download className="h-4 w-4 mr-1" />Excel</Button>
                      </CardHeader>
                      <CardContent>
                        <OrdersTable rows={topOrders} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-base">Open Order Book — To Invoice ({openOrders.length})</CardTitle>
                        <div className="flex gap-2 items-center">
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-8 h-9 w-56" placeholder="Search..." value={openSearch} onChange={(e) => setOpenSearch(e.target.value)} />
                          </div>
                          <Button size="sm" variant="outline" onClick={exportOpenOrdersXlsx}><Download className="h-4 w-4 mr-1" />Excel</Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <OrdersTable rows={openOrders} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="quality" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Data Completeness</CardTitle>
                        <CardDescription>Identify missing data and tracker discipline issues.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {completeness.map(c => (
                            <div key={c.field} className="grid grid-cols-12 items-center gap-3 text-sm">
                              <div className="col-span-4 truncate font-medium">{c.field}</div>
                              <div className="col-span-6"><Progress value={c.pct} /></div>
                              <div className="col-span-2 text-right text-muted-foreground tabular-nums">
                                {c.pct.toFixed(0)}% <span className="text-xs">({c.populated}/{c.total})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              // ================= COMPARE MODE =================
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Compare Years</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {(['A', 'B'] as const).map((side) => {
                        const val = side === 'A' ? yearA : yearB;
                        const set = side === 'A' ? setYearA : setYearB;
                        const comp = side === 'A' ? companyRevA : companyRevB;
                        const yr = side === 'A' ? yA : yB;
                        return (
                          <div key={side} className="space-y-3 p-3 rounded-md border bg-muted/30">
                            <div className="flex items-center gap-3">
                              <Badge>Year {side}</Badge>
                              <Select value={val} onValueChange={set}>
                                <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[11px] text-muted-foreground">Total Company Revenue for {val || '—'} (€)</Label>
                              <Input
                                type="number"
                                className="h-8 mt-1 text-sm"
                                placeholder="e.g. 5000000"
                                value={comp || ''}
                                onChange={(e) => val && saveYearRev(yr, e.target.value, side)}
                                disabled={!val}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* KPI comparison grid */}
                <div ref={chartRefs.cmpKpiPanel} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-background p-2 rounded-lg">
                  <CompareCard label="Total Orders" a={kpisA.total} b={kpisB.total} yearA={yearA} yearB={yearB} />
                  <CompareCard label="Open Orders" a={kpisA.open} b={kpisB.open} yearA={yearA} yearB={yearB} />
                  <CompareCard label="Closed Orders" a={kpisA.closed} b={kpisB.closed} yearA={yearA} yearB={yearB} />
                  <CompareCard label="Total NPI Revenue" a={kpisA.totalRev} b={kpisB.totalRev} yearA={yearA} yearB={yearB} currency />
                  <CompareCard label="Open Value (To Invoice)" a={kpisA.openRev} b={kpisB.openRev} yearA={yearA} yearB={yearB} currency />
                  <CompareCard label="Closed Value (Invoiced)" a={kpisA.closedRev} b={kpisB.closedRev} yearA={yearA} yearB={yearB} currency />
                  <NpviCompareCard yearA={yearA} yearB={yearB} npviA={npviA} npviB={npviB} />
                </div>

                {/* Monthly comparison charts */}
                <div className="grid md:grid-cols-2 gap-4">
                  <ChartCard title="Revenue by Month">
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={monthByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: any) => fmtEur(v as number)} />
                        <Legend />
                        <Bar dataKey={`revenue_${yearA || 'A'}`} name={yearA} fill="#3b82f6" />
                        <Bar dataKey={`revenue_${yearB || 'B'}`} name={yearB} fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                  <ChartCard title="Orders by Month">
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={monthByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey={`orders_${yearA || 'A'}`} name={yearA} fill="#3b82f6" />
                        <Bar dataKey={`orders_${yearB || 'B'}`} name={yearB} fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <ChartCard title="Top Customers Revenue — Comparison">
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={compareCustomers} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => fmtEur(v as number)} />
                      <Legend />
                      <Bar dataKey={`rev_${yearA || 'A'}`} name={yearA} fill="#3b82f6" />
                      <Bar dataKey={`rev_${yearB || 'B'}`} name={yearB} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}
          </>
        )}
      </main>

      {/* Off-screen render container for PDF export */}
      {!empty && (
        <div
          aria-hidden
          style={{ position: 'fixed', left: -10000, top: 0, width: 1800, pointerEvents: 'none', background: '#fff' }}
        >
          <div ref={chartRefs.revByCustomer} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerByRevenue} layout="vertical" margin={{ left: 100, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.ordByCustomer} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerByOrders} layout="vertical" margin={{ left: 100, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Bar dataKey="orders" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.revByCommodity} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCommodity} dataKey="revenue" nameKey="name" outerRadius={140} label={(d: any) => d.name}>
                  {byCommodity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.ordByCommodity} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCommodity} dataKey="orders" nameKey="name" outerRadius={140} label={(d: any) => d.name}>
                  {byCommodity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.revByPart} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partByRevenue} layout="vertical" margin={{ left: 140, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Bar dataKey="revenue" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.ordByPart} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partByOrders} layout="vertical" margin={{ left: 140, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Bar dataKey="orders" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.ordByMonth} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.revByMonth} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Compare offscreen charts */}
          <div ref={chartRefs.cmpRevByMonth} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthByMonth} margin={{ left: 40, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Legend />
                <Bar dataKey={`revenue_${yearA || 'A'}`} name={yearA} fill="#3b82f6" />
                <Bar dataKey={`revenue_${yearB || 'B'}`} name={yearB} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.cmpOrdByMonth} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthByMonth} margin={{ left: 40, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Legend />
                <Bar dataKey={`orders_${yearA || 'A'}`} name={yearA} fill="#3b82f6" />
                <Bar dataKey={`orders_${yearB || 'B'}`} name={yearB} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div ref={chartRefs.cmpTopCustomers} style={{ width: 1800, height: 1026, background: '#fff' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareCustomers} layout="vertical" margin={{ left: 140, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Legend />
                <Bar dataKey={`rev_${yearA || 'A'}`} name={yearA} fill="#3b82f6" />
                <Bar dataKey={`rev_${yearB || 'B'}`} name={yearB} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Offscreen KPI comparison panel for PDF export (inline styles = html2canvas safe) */}
          <div ref={chartRefs.cmpKpiExport} style={{ width: 1600, background: '#ffffff', padding: 16, fontFamily: 'Arial, Helvetica, sans-serif', color: '#0f172a' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <CompareCardExport label="Total Orders" a={kpisA.total} b={kpisB.total} yearA={yearA} yearB={yearB} />
              <CompareCardExport label="Open Orders" a={kpisA.open} b={kpisB.open} yearA={yearA} yearB={yearB} />
              <CompareCardExport label="Closed Orders" a={kpisA.closed} b={kpisB.closed} yearA={yearA} yearB={yearB} />
              <CompareCardExport label="Total NPI Revenue" a={kpisA.totalRev} b={kpisB.totalRev} yearA={yearA} yearB={yearB} currency />
              <CompareCardExport label="Open Value (To Invoice)" a={kpisA.openRev} b={kpisB.openRev} yearA={yearA} yearB={yearB} currency />
              <CompareCardExport label="Closed Value (Invoiced)" a={kpisA.closedRev} b={kpisB.closedRev} yearA={yearA} yearB={yearB} currency />
              <CompareCardExport label="NPVI (Vitality Index)" a={npviA} b={npviB} yearA={yearA} yearB={yearB} suffix="%" highlight />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function KpiCard({ label, value, icon: Icon, tone = 'default' }: { label: string; value: string; icon: any; tone?: 'default' | 'primary' | 'green' | 'amber' }) {
  const toneClass = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-600',
    amber: 'bg-amber-500/10 text-amber-600',
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">{label}</div>
            <div className="text-xl font-semibold mt-1 truncate">{value}</div>
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${toneClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaBadge({ delta, pct, unit = '%' }: { delta: number; pct: number; unit?: '%' | 'pp' | 'abs' }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const cls = delta > 0 ? 'text-green-600 bg-green-500/10' : delta < 0 ? 'text-red-600 bg-red-500/10' : 'text-muted-foreground bg-muted';
  let label = '—';
  if (unit === 'abs') {
    if (isFinite(delta)) label = `${delta >= 0 ? '+' : ''}${fmtNum(delta)}`;
  } else if (isFinite(pct)) {
    label = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}${unit === 'pp' ? ' pp' : '%'}`;
  }
  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

function CompareCard({ label, a, b, yearA, yearB, currency }: {
  label: string; a: number; b: number; yearA: string; yearB: string; currency?: boolean;
}) {
  const fmt = currency ? fmtEur : fmtNum;
  const aIsNewer = Number(yearA) >= Number(yearB);
  const newer = aIsNewer ? a : b;
  const older = aIsNewer ? b : a;
  const delta = newer - older;
  const pct = older !== 0 ? (delta / Math.abs(older)) * 100 : 0;
  // For count metrics with a very small baseline, % becomes misleading — show absolute delta instead
  const useAbs = !currency && Math.abs(older) < 10;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{yearA || 'A'}</div>
            <div className="text-base font-semibold tabular-nums truncate">{fmt(a)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{yearB || 'B'}</div>
            <div className="text-base font-semibold tabular-nums truncate">{fmt(b)}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Δ {fmt(Math.abs(delta))}</span>
          <DeltaBadge delta={delta} pct={pct} unit={useAbs ? 'abs' : '%'} />
        </div>
      </CardContent>
    </Card>
  );
}

function NpviCompareCard({ yearA, yearB, npviA, npviB }: {
  yearA: string; yearB: string; npviA: number; npviB: number;
}) {
  const aIsNewer = Number(yearA) >= Number(yearB);
  const newer = aIsNewer ? npviA : npviB;
  const older = aIsNewer ? npviB : npviA;
  const delta = newer - older;
  return (
    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
      <CardContent className="p-4">
        <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold truncate">NPVI (Vitality Index)</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{yearA || 'A'}</div>
            <div className="text-base font-semibold tabular-nums">{npviA.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{yearB || 'B'}</div>
            <div className="text-base font-semibold tabular-nums">{npviB.toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Δ {Math.abs(delta).toFixed(1)} pp</span>
          <DeltaBadge delta={delta} pct={delta} unit="pp" />
        </div>
      </CardContent>
    </Card>

  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OrdersTable({ rows }: { rows: Array<{ customer: string; po: string; part: string; revenue: number; status: string }> }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-6 text-center">No orders.</p>;
  return (
    <div className="overflow-auto max-h-[500px] border rounded-md">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Order No</TableHead>
            <TableHead>Part Number</TableHead>
            <TableHead className="text-right">Revenue €</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{r.customer || '—'}</TableCell>
              <TableCell>{r.po || '—'}</TableCell>
              <TableCell>{r.part || '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtEur(r.revenue)}</TableCell>
              <TableCell><Badge variant="outline">{statusLabel(r.status)}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CompareCardExport({ label, a, b, yearA, yearB, currency, suffix, highlight }: {
  label: string; a: number; b: number; yearA: string; yearB: string;
  currency?: boolean; suffix?: string; highlight?: boolean;
}) {
  const fmt = (v: number) => {
    if (currency) return fmtEur(v);
    if (suffix === '%') return `${v.toFixed(1)}%`;
    return fmtNum(v);
  };
  const aIsNewer = Number(yearA) >= Number(yearB);
  const newer = aIsNewer ? a : b;
  const older = aIsNewer ? b : a;
  const delta = newer - older;
  const pct = older !== 0 ? (delta / Math.abs(older)) * 100 : 0;
  const up = delta >= 0;
  const arrow = up ? '▲' : '▼';
  const arrowColor = up ? '#16a34a' : '#dc2626';
  const badgeBg = up ? '#dcfce7' : '#fee2e2';
  const badgeFg = up ? '#166534' : '#991b1b';

  const border = highlight ? '#bfdbfe' : '#e2e8f0';
  const bg = highlight ? '#eff6ff' : '#ffffff';
  const labelColor = highlight ? '#1d4ed8' : '#64748b';

  return (
    <div style={{ border: `1px solid ${border}`, background: bg, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 12, color: labelColor, fontWeight: highlight ? 700 : 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>{yearA || 'A'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{fmt(a)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>{yearB || 'B'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{fmt(b)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          Δ <span style={{ color: arrowColor, fontWeight: 700 }}>{arrow}</span> {suffix === '%' ? `${Math.abs(delta).toFixed(1)} pp` : fmt(Math.abs(delta))}
        </span>
        <span style={{ background: badgeBg, color: badgeFg, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
          {arrow} {suffix === '%'
            ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp`
            : (!currency && Math.abs(older) < 10)
              ? `${delta >= 0 ? '+' : ''}${fmtNum(delta)}`
              : (isFinite(pct) ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—')}
        </span>
      </div>

    </div>
  );
}
