import { useState, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import { Upload, Download, FileSpreadsheet, TrendingUp, Package, CheckCircle2, Clock, Euro, Search, FileDown } from 'lucide-react';
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
    revenue: findCol(cols, ['tl €', 'tl eur', 'tl euro', 'tl(€)', 'tl', 'total €', 'total eur', 'revenue €', 'revenue', 'value', 'amount', 'order value', 'po value', 'eur', 'euro', 'total']),
    status: findCol(cols, ['status', 'state', 'order status']),
    commodity: findCol(cols, ['commodity', 'category', 'type', 'product family', 'process']),
    date: findCol(cols, ['date', 'order date', 'received', 'date received', 'po date', 'received date']),
  }), [cols]);

  const [revenueColOverride, setRevenueColOverride] = useState<string>('');
  const [statusColOverride, setStatusColOverride] = useState<string>('');
  const colMap = useMemo(() => ({
    ...autoColMap,
    revenue: revenueColOverride || autoColMap.revenue,
    status: statusColOverride || autoColMap.status,
  }), [autoColMap, revenueColOverride, statusColOverride]);

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
  const npviStatus = npvi >= 30 ? 'green' : npvi >= 15 ? 'yellow' : 'red';
  const npviColor = npviStatus === 'green' ? '#10b981' : npviStatus === 'yellow' ? '#f59e0b' : '#ef4444';

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
    if (!dashRef.current) return;
    toast.info('Generating PDF...');
    try {
      const canvas = await html2canvas(dashRef.current, { scale: 1.2, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const iw = pw - 10;
      const ih = (canvas.height * iw) / canvas.width;
      let h = ih;
      let y = 5;
      if (ih <= ph - 10) {
        pdf.addImage(img, 'PNG', 5, y, iw, ih);
      } else {
        // paginate
        let remaining = ih;
        let offset = 0;
        const pageImgH = ph - 10;
        const sliceH = (pageImgH / ih) * canvas.height;
        while (remaining > 0) {
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(sliceH, canvas.height - offset);
          const ctx = pageCanvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, offset, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
          const slice = pageCanvas.toDataURL('image/png');
          const sh = (pageCanvas.height * iw) / canvas.width;
          pdf.addImage(slice, 'PNG', 5, 5, iw, sh);
          offset += pageCanvas.height;
          remaining -= pageCanvas.height;
          if (remaining > 0) pdf.addPage();
        }
        h = ih;
      }
      pdf.save('npi-order-intelligence.pdf');
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />New Product Vitality Index (NPVI)</CardTitle>
                <CardDescription>NPVI = (Revenue from New Products / Total Company Revenue) × 100</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="totalRev">Total Company Revenue (€)</Label>
                      <Input
                        id="totalRev"
                        type="number"
                        placeholder="e.g. 5000000"
                        value={totalCompanyRevenue || ''}
                        onChange={(e) => saveTotalRev(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Stored locally on this device.</p>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Revenue from New Products</span><span className="font-medium">{fmtEur(kpis.totalRev)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total Company Revenue</span><span className="font-medium">{fmtEur(totalCompanyRevenue)}</span></div>
                      <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">NPVI</span><span className="font-semibold" style={{ color: npviColor }}>{npvi.toFixed(1)}%</span></div>
                    </div>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer>
                      <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: 'NPVI', value: Math.min(npvi, 100), fill: npviColor }]} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar background dataKey="value" cornerRadius={10} />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 28, fontWeight: 700 }}>
                          {npvi.toFixed(1)}%
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    <Badge style={{ backgroundColor: npviColor, color: 'white' }} className="text-base px-3 py-1">
                      {npviStatus === 'green' ? 'Healthy' : npviStatus === 'yellow' ? 'Watch' : 'Critical'}
                    </Badge>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> NPVI &gt; 30% — Healthy</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> 15–30% — Watch</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> &lt; 15% — Critical</div>
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
