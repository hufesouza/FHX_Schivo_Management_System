import { useState, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { Upload, Download, FileSpreadsheet, Package, CheckCircle2, Clock, Euro, Search, FileDown, Info } from 'lucide-react';
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
import { Tooltip as ShadcnTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type Row = Record<string, any>;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// fuzzy column finder
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
  // Detect European format: if both '.' and ',' present, the rightmost is the decimal separator.
  // If only ',' present and it looks like a decimal (e.g. "1234,56"), treat as decimal.
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // European: dots = thousands, comma = decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US: commas = thousands, dot = decimal
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only commas. If exactly one comma followed by 1-2 digits => decimal, else thousands.
    const after = s.length - lastComma - 1;
    if (s.split(',').length === 2 && after > 0 && after <= 2) {
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
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

const isOpenStatus = (s: string): boolean => {
  const n = norm(s);
  if (!n) return false;
  if (n.includes('close') || n.includes('complete') || n.includes('done') || n.includes('deliver') || n.includes('ship') || n.includes('cancel')) return false;
  return true;
};

const fmtEur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat('en-IE').format(n || 0);

const STORAGE_KEY_REV = 'npi-oi-total-company-revenue';
const STORAGE_KEY_DATA = 'npi-oi-data';

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

  // filters
  const [fCustomer, setFCustomer] = useState<string>('all');
  const [fCommodity, setFCommodity] = useState<string>('all');
  const [fStatus, setFStatus] = useState<string>('all');
  const [fFrom, setFFrom] = useState<string>('');
  const [fTo, setFTo] = useState<string>('');
  const [openSearch, setOpenSearch] = useState<string>('');

  const dashRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const chartRefs = {
    revByCustomer: useRef<HTMLDivElement>(null),
    ordByCustomer: useRef<HTMLDivElement>(null),
    revByCommodity: useRef<HTMLDivElement>(null),
    ordByCommodity: useRef<HTMLDivElement>(null),
    ordByMonth: useRef<HTMLDivElement>(null),
    revByMonth: useRef<HTMLDivElement>(null),
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

  // detect columns
  const cols = useMemo(() => rows.length ? Object.keys(rows[0]) : [], [rows]);
  const autoColMap = useMemo(() => ({
    customer: findCol(cols, ['customer', 'client', 'customer name', 'account']),
    po: findCol(cols, ['po', 'po number', 'po no', 'purchase order', 'order no', 'order number']),
    part: findCol(cols, ['part', 'part number', 'part no', 'pn', 'item']),
    revenue: findCol(cols, ['total_value_eur', 'totalvalueeur', 'total value eur', 'value eur', 'value_eur', 'tl €', 'tl eur', 'tl euro', 'tl(€)', 'tl', 'total €', 'total eur', 'revenue €', 'revenue', 'order value', 'po value', 'amount', 'eur', 'euro', 'total_value', 'total value', 'total', 'value']),
    status: findCol(cols, ['po_status', 'postatus', 'po status', 'order_status', 'order status', 'status', 'state']),
    commodity: findCol(cols, ['commodity', 'category', 'type', 'product family', 'process']),
    date: findCol(cols, ['date', 'order date', 'received', 'date received', 'po date', 'received date']),
  }), [cols]);

  const [revenueColOverride, setRevenueColOverride] = useState<string>('');
  const colMap = useMemo(() => ({
    ...autoColMap,
    revenue: revenueColOverride || autoColMap.revenue,
  }), [autoColMap, revenueColOverride]);

  // normalised dataset
  const normalised = useMemo(() => rows.map(r => {
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
    };
  }), [rows, colMap]);

  const customers = useMemo(() => Array.from(new Set(normalised.map(r => r.customer).filter(Boolean))).sort(), [normalised]);
  const commodities = useMemo(() => Array.from(new Set(normalised.map(r => r.commodity).filter(Boolean))).sort(), [normalised]);
  const statuses = useMemo(() => Array.from(new Set(normalised.map(r => r.status).filter(Boolean))).sort(), [normalised]);

  const filtered = useMemo(() => {
    const fromD = fFrom ? new Date(fFrom) : null;
    const toD = fTo ? new Date(fTo) : null;
    return normalised.filter(r => {
      if (fCustomer !== 'all' && r.customer !== fCustomer) return false;
      if (fCommodity !== 'all' && r.commodity !== fCommodity) return false;
      if (fStatus !== 'all' && r.status !== fStatus) return false;
      if (fromD && (!r.date || r.date < fromD)) return false;
      if (toD && (!r.date || r.date > toD)) return false;
      return true;
    });
  }, [normalised, fCustomer, fCommodity, fStatus, fFrom, fTo]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const open = filtered.filter(r => isOpenStatus(r.status));
    const closed = filtered.filter(r => !isOpenStatus(r.status) && r.status);
    const totalRev = filtered.reduce((s, r) => s + r.revenue, 0);
    const openRev = open.reduce((s, r) => s + r.revenue, 0);
    const closedRev = closed.reduce((s, r) => s + r.revenue, 0);
    return { total, open: open.length, closed: closed.length, totalRev, openRev, closedRev };
  }, [filtered]);

  // NPVI
  const npvi = totalCompanyRevenue > 0 ? (kpis.totalRev / totalCompanyRevenue) * 100 : 0;

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

  // Commodity analysis
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

  // Monthly trends
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

  // Top orders
  const topOrders = useMemo(() =>
    [...filtered].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [filtered]);

  // Open orders
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

  // Data completeness
  const completeness = useMemo(() => {
    if (!rows.length) return [];
    return cols.map(c => {
      const populated = rows.filter(r => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== '').length;
      return { field: c, pct: (populated / rows.length) * 100, populated, total: rows.length };
    }).sort((a, b) => b.pct - a.pct);
  }, [rows, cols]);

  const saveTotalRev = (v: string) => {
    const n = parseFloat(v) || 0;
    setTotalCompanyRevenue(n);
    localStorage.setItem(STORAGE_KEY_REV, String(n));
  };

  const exportTopOrdersXlsx = () => {
    const data = topOrders.map(r => ({
      Customer: r.customer, 'PO Number': r.po, 'Part Number': r.part,
      'Revenue €': r.revenue, Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Orders');
    XLSX.writeFile(wb, 'top-orders.xlsx');
  };

  const exportOpenOrdersXlsx = () => {
    const data = openOrders.map(r => ({
      Customer: r.customer, 'PO Number': r.po, 'Part Number': r.part,
      'Revenue €': r.revenue, Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Open Orders');
    XLSX.writeFile(wb, 'open-orders.xlsx');
  };

  const exportPdf = async () => {
    try {
      toast.info('Generating PDF report...');
      // Wait for offscreen charts to settle
      await new Promise(r => setTimeout(r, 300));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      // Header band
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pw, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('NPI Order Intelligence', margin, 9);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text(`Schivo Waterford  •  ${dateStr} ${timeStr}`, margin, 15);

      pdf.setTextColor(15, 23, 42);
      let y = 26;

      // Filters chip
      const filterBits: string[] = [];
      if (fCustomer !== 'all') filterBits.push(`Customer: ${fCustomer}`);
      if (fCommodity !== 'all') filterBits.push(`Commodity: ${fCommodity}`);
      if (fStatus !== 'all') filterBits.push(`Status: ${fStatus}`);
      if (fFrom) filterBits.push(`From: ${fFrom}`);
      if (fTo) filterBits.push(`To: ${fTo}`);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Filters: ${filterBits.length ? filterBits.join('  •  ') : 'None'}`, margin, y);
      y += 5;

      // KPI cards 3x2
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
        // accent stripe
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

      // NPVI banner
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
      pdf.text(`NPI ${fmtEur(kpis.totalRev)}  •  Company ${fmtEur(totalCompanyRevenue)}`, pw - margin - 4, y + 15, { align: 'right' });
      y += 22;

      // Capture chart helper
      const capture = async (el: HTMLElement | null): Promise<string | null> => {
        if (!el) return null;
        const c = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false });
        return c.toDataURL('image/png');
      };

      const sectionTitle = (title: string) => {
        if (y > ph - 25) { pdf.addPage(); y = margin + 4; }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(title, margin, y);
        y += 1.5;
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.6);
        pdf.line(margin, y, margin + 24, y);
        pdf.setLineWidth(0.2);
        y += 3.5;
      };

      // Place charts in 2-col rows
      const placeChartRow = async (
        left: { title: string; ref: HTMLElement | null },
        right: { title: string; ref: HTMLElement | null } | null,
      ) => {
        const colW = right ? (pw - margin * 2 - 4) / 2 : pw - margin * 2;
        const rowH = 62;
        if (y + rowH > ph - 15) { pdf.addPage(); y = margin + 4; }
        const items = right ? [left, right] : [left];
        for (let i = 0; i < items.length; i++) {
          const x = margin + i * (colW + 4);
          pdf.setDrawColor(226, 232, 240);
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(x, y, colW, rowH, 1.5, 1.5, 'FD');
          pdf.setFontSize(8.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(15, 23, 42);
          pdf.text(items[i].title, x + 3, y + 5);
          const img = await capture(items[i].ref);
          if (img) {
            pdf.addImage(img, 'PNG', x + 2, y + 7, colW - 4, rowH - 9);
          }
        }
        y += rowH + 4;
      };

      sectionTitle('Customer Performance');
      await placeChartRow(
        { title: 'Revenue by Customer (Top 15)', ref: chartRefs.revByCustomer.current },
        { title: 'Orders by Customer (Top 15)', ref: chartRefs.ordByCustomer.current },
      );

      sectionTitle('Commodity Mix');
      await placeChartRow(
        { title: 'Revenue by Commodity', ref: chartRefs.revByCommodity.current },
        { title: 'Orders by Commodity', ref: chartRefs.ordByCommodity.current },
      );

      sectionTitle('Monthly Trend');
      await placeChartRow(
        { title: 'Orders by Month', ref: chartRefs.ordByMonth.current },
        { title: 'Revenue by Month', ref: chartRefs.revByMonth.current },
      );

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text('Schivo Medical • FHX Engineering — Confidential', margin, ph - 4);
        pdf.text(`Page ${i} of ${pageCount}`, pw - margin, ph - 4, { align: 'right' });
      }

      pdf.save(`npi-order-intelligence-${now.toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF report generated');
    } catch (e: any) {
      toast.error('PDF export failed: ' + e.message);
    }
  };

      pdf.save(`npi-order-intelligence-${now.toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF report generated');
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
                <CardDescription>Excel (.xlsx / .xlsm). Columns are auto-detected. Missing data won't break the dashboard.</CardDescription>
              </div>
              <div className="flex gap-2">
                {!empty && <Button variant="outline" size="sm" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />Export PDF</Button>}
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
          <div ref={dashRef} className="space-y-6">
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={fStatus} onValueChange={setFStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard label="Total Orders" value={fmtNum(kpis.total)} icon={Package} />
              <KpiCard label="Open Orders" value={fmtNum(kpis.open)} icon={Clock} tone="amber" />
              <KpiCard label="Closed Orders" value={fmtNum(kpis.closed)} icon={CheckCircle2} tone="green" />
              <KpiCard label="Total NPI Revenue" value={fmtEur(kpis.totalRev)} icon={Euro} tone="primary" />
              <KpiCard label="Open Order Value" value={fmtEur(kpis.openRev)} icon={Euro} tone="amber" />
              <KpiCard label="Closed Order Value" value={fmtEur(kpis.closedRev)} icon={Euro} tone="green" />
            </div>

            {/* NPVI */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                  {/* Left: Title & description */}
                  <div className="md:w-1/3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold tracking-tight text-foreground">New Product Vitality Index</h2>
                      <TooltipProvider>
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs max-w-[240px]">Calculated as NPI Revenue ÷ Total Company Revenue × 100</p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">NPI share of total company revenue</p>
                  </div>

                  {/* Center: Percentage + bar */}
                  <div className="md:w-1/3 flex flex-col justify-center">
                    <div className="text-3xl font-bold tracking-tight text-foreground">{npvi.toFixed(1)}%</div>
                    <div className="mt-2">
                      <Progress value={Math.min(npvi, 100)} className="h-1.5" />
                    </div>
                  </div>

                  {/* Right: Revenue figures + input */}
                  <div className="md:w-1/3 flex flex-col gap-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">NPI Revenue</div>
                        <div className="font-semibold text-foreground tabular-nums">{fmtEur(kpis.totalRev)}</div>
                      </div>
                      <div className="h-6 w-px bg-border" />
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Company Revenue</div>
                        <div className="font-semibold text-foreground tabular-nums">{fmtEur(totalCompanyRevenue)}</div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="totalRev" className="text-[11px] text-muted-foreground">Total Company Revenue (€)</Label>
                      <Input
                        id="totalRev"
                        type="number"
                        placeholder="e.g. 5000000"
                        value={totalCompanyRevenue || ''}
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
                <TabsTrigger value="commodity">Commodities</TabsTrigger>
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
                    <CardTitle className="text-base">Open Order Book ({openOrders.length})</CardTitle>
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
        )}
      </main>
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
            <TableHead>PO Number</TableHead>
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
              <TableCell><Badge variant="outline">{r.status || '—'}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
