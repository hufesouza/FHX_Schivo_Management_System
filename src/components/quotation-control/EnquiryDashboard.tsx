import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnquiryLog } from '@/types/enquiryLog';
import { 
  FileText, 
  CheckCircle, 
  Trophy, 
  XCircle, 
  PauseCircle, 
  Euro,
  Clock,
  Users,
  Building,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

export interface DashboardFilters {
  yearMonths?: string[]; // Format: "YYYY-MM" e.g. "2025-11" for Dec 2025
  customer?: string;
}

interface EnquiryDashboardProps {
  enquiries: EnquiryLog[];
  onFilterByStatus?: (status: string) => void;
  onFilterByCustomer?: (customer: string) => void;
  onFilterByOwner?: (owner: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'OPEN': '#3b82f6',
  'QUOTED': '#14b8a6',
  'WON': '#22c55e',
  'LOST': '#ef4444',
  'ON HOLD': '#f59e0b',
  'CANCELLED': '#6b7280',
  'Not converted': '#8b5cf6',
};

const CUSTOMER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function EnquiryDashboard({ enquiries, onFilterByStatus, onFilterByCustomer, onFilterByOwner }: EnquiryDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique filter options - year-month combinations
  const filterOptions = useMemo(() => {
    const yearMonthSet = new Set<string>();
    const yearsSet = new Set<string>();
    
    enquiries.forEach(e => {
      if (!e.date_received) return;
      try {
        const date = new Date(e.date_received);
        const year = date.getFullYear().toString();
        const month = date.getMonth();
        yearsSet.add(year);
        yearMonthSet.add(`${year}-${month}`);
      } catch {
        // ignore
      }
    });

    const years = [...yearsSet].sort().reverse();
    const customers = [...new Set(enquiries.map(e => e.customer).filter(Boolean))].sort() as string[];

    return { years, customers };
  }, [enquiries]);

  // Apply filters to enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e => {
      // Year-Month filter (multi-select)
      if (filters.yearMonths && filters.yearMonths.length > 0) {
        if (!e.date_received) return false;
        try {
          const date = new Date(e.date_received);
          const yearMonth = `${date.getFullYear()}-${date.getMonth()}`;
          if (!filters.yearMonths.includes(yearMonth)) return false;
        } catch {
          return false;
        }
      }

      // Customer filter
      if (filters.customer && e.customer !== filters.customer) return false;

      return true;
    });
  }, [enquiries, filters]);

  // Calculate stats from filtered enquiries
  const stats = useMemo(() => {
    const data = filteredEnquiries;

    const hasCustomerName = (e: EnquiryLog) => Boolean((e.customer || '').trim());
    const coerceTurnaroundDays = (e: EnquiryLog): number | null => {
      const v: unknown = (e as any).turnaround_days;
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      return Number.isFinite(n) ? n : null;
    };
    
    const base = data.filter(hasCustomerName);

    // Count based on actual status values in the enquiry log
    const openStatuses = ['OPEN', 'WIP'];
    const wonStatuses = ['WON', 'PO RAISED'];
    const lostStatuses = ['LOST', 'NOT CONVERTED', 'DECLINED', 'CANCELLED'];
    const holdStatuses = ['ON HOLD'];
    
    // Count unique customers
    const uniqueCustomers = new Set(base.map(e => e.customer).filter(Boolean)).size;
    
    // Calculate turnaround stats
    const enquiriesWithTurnaround = base.filter(e => {
      const t = coerceTurnaroundDays(e);
      return t !== null && t > 0;
    });
    const avgTurnaround = enquiriesWithTurnaround.length > 0
      ? enquiriesWithTurnaround.reduce((sum, e) => sum + (coerceTurnaroundDays(e) || 0), 0) / enquiriesWithTurnaround.length
      : 0;
    const minTurnaround = enquiriesWithTurnaround.length > 0
      ? Math.min(...enquiriesWithTurnaround.map(e => coerceTurnaroundDays(e) || 0))
      : 0;
    const maxTurnaround = enquiriesWithTurnaround.length > 0
      ? Math.max(...enquiriesWithTurnaround.map(e => coerceTurnaroundDays(e) || 0))
      : 0;
    
    return {
      // Per your requirement: count enquiries by rows that have a Customer Name.
      total: base.length,
      uniqueCustomers,
      // Open: anything NOT Quoted, Declined, or Cancelled
      open: base.filter(e => {
        const status = (e.status || '').toUpperCase().trim();
        const closedStatuses = ['QUOTED', 'DECLINED', 'CANCELLED'];
        return !closedStatuses.includes(status);
      }).length,
      // Quoted: is_quoted flag is true
      quoted: base.filter(e => e.is_quoted === true).length,
      // Won: po_received is true OR status is WON/PO RAISED
      won: base.filter(e => {
        const status = (e.status || '').toUpperCase();
        return e.po_received === true || wonStatuses.includes(status);
      }).length,
      // Lost: status is LOST, NOT CONVERTED, DECLINED, or CANCELLED
      lost: base.filter(e => {
        const status = (e.status || '').toUpperCase();
        return lostStatuses.includes(status);
      }).length,
      // On Hold: status is ON HOLD or priority contains 'hold'
      onHold: base.filter(e => {
        const status = (e.status || '').toUpperCase();
        const priority = (e.priority || '').toLowerCase();
        return holdStatuses.includes(status) || priority.includes('hold');
      }).length,
      totalQuotedValue: base.reduce((sum, e) => sum + (e.quoted_price_euro || 0), 0),
      totalPOValue: base.reduce((sum, e) => sum + (e.po_value_euro || 0), 0),
      avgTurnaround,
      minTurnaround,
      maxTurnaround,
      enquiriesWithTurnaroundCount: enquiriesWithTurnaround.length,
      byCustomer: Object.entries(
        base.reduce((acc, e) => {
          const customer = e.customer || 'Unknown';
          acc[customer] = (acc[customer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([customer, count], index) => ({ 
          customer, 
          count,
          fill: CUSTOMER_COLORS[index % CUSTOMER_COLORS.length]
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byOwner: Object.entries(
        base.reduce((acc, e) => {
          const owner = e.npi_owner || 'Unassigned';
          acc[owner] = (acc[owner] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([owner, count]) => ({ owner, count }))
        .sort((a, b) => b.count - a.count),
      byStatus: Object.entries(
        base.reduce((acc, e) => {
          const status = e.status || 'OPEN';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      turnaroundByMonth: (() => {
        const byMonth: Record<string, { total: number; count: number }> = {};
        base.forEach(e => {
          const t = coerceTurnaroundDays(e);
          if (e.date_received && t !== null && t > 0) {
            const date = new Date(e.date_received);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[key]) byMonth[key] = { total: 0, count: 0 };
            byMonth[key].total += t;
            byMonth[key].count += 1;
          }
        });
        return Object.entries(byMonth)
          .map(([month, { total, count }]) => ({
            month,
            avgTurnaround: Math.round(total / count * 10) / 10
          }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12);
      })(),
    };
  }, [filteredEnquiries]);

  // Calculate working days between two dates (excludes weekends and holiday period)
  const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    // Holiday period to exclude: 23/12/2025 to 01/01/2026
    const holidayStart = new Date(2025, 11, 23); // Dec 23, 2025
    const holidayEnd = new Date(2026, 0, 1);     // Jan 1, 2026
    
    let workingDays = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    while (current < end) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
      const isHoliday = current >= holidayStart && current <= holidayEnd;
      
      if (!isWeekend && !isHoliday) {
        workingDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  };

  // Calculate aging for open enquiries
  const openEnquiriesWithAging = useMemo(() => {
    // Closed statuses - everything else is considered "Open"
    const closedStatuses = ['QUOTED', 'DECLINED', 'CANCELLED'];
    const today = new Date();
    
    return filteredEnquiries
      .filter(e => {
        const status = (e.status || '').toUpperCase().trim();
        // Open = anything NOT in closedStatuses
        return !closedStatuses.includes(status) && e.customer;
      })
      .map(e => {
        let agingDays: number | null = null;
        if (e.date_received) {
          try {
            const receivedDate = new Date(e.date_received);
            if (receivedDate <= today) {
              agingDays = calculateWorkingDays(receivedDate, today);
            }
          } catch {
            agingDays = null;
          }
        }
        return { ...e, agingDays };
      })
      .sort((a, b) => {
        if (a.agingDays === null && b.agingDays === null) return 0;
        if (a.agingDays === null) return 1;
        if (b.agingDays === null) return -1;
        return b.agingDays - a.agingDays;
      });
  }, [filteredEnquiries]);

  const getAgingBadgeVariant = (days: number | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (days === null) return 'outline';
    if (days <= 7) return 'secondary';
    if (days <= 14) return 'default';
    return 'destructive';
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );

  const clearFilters = () => setFilters({});

  const toggleYearMonth = (year: string, month: number) => {
    const key = `${year}-${month}`;
    setFilters(prev => {
      const current = prev.yearMonths || [];
      if (current.includes(key)) {
        return { ...prev, yearMonths: current.filter(ym => ym !== key) };
      }
      return { ...prev, yearMonths: [...current, key] };
    });
  };

  const isYearMonthSelected = (year: string, month: number) => {
    return (filters.yearMonths || []).includes(`${year}-${month}`);
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const kpiCards = [
    {
      title: 'Total Enquiries',
      value: stats.total,
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      borderColor: '#6366f1',
    },
    {
      title: 'Unique Customers',
      value: stats.uniqueCustomers,
      icon: Building,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100',
      borderColor: '#8b5cf6',
    },
    {
      title: 'Open',
      value: stats.open,
      icon: Clock,
      color: 'text-sky-600',
      bgColor: 'bg-sky-100',
      borderColor: '#0ea5e9',
      onClick: () => onFilterByStatus?.('OPEN'),
    },
    {
      title: 'Quoted',
      value: stats.quoted,
      icon: CheckCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      borderColor: '#14b8a6',
    },
    {
      title: 'Won (PO Received)',
      value: stats.won,
      icon: Trophy,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      borderColor: '#10b981',
      onClick: () => onFilterByStatus?.('WON'),
    },
    {
      title: 'Lost',
      value: stats.lost,
      icon: XCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
      borderColor: '#f43f5e',
      onClick: () => onFilterByStatus?.('LOST'),
    },
  ];

  const valueCards = [
    {
      title: 'Total Quoted Value',
      value: formatCurrency(stats.totalQuotedValue),
      icon: Euro,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      borderColor: '#06b6d4',
    },
    {
      title: 'Total PO Value',
      value: formatCurrency(stats.totalPOValue),
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: '#22c55e',
    },
    {
      title: 'Avg Turnaround',
      value: `${stats.avgTurnaround.toFixed(1)} days`,
      subtitle: stats.enquiriesWithTurnaroundCount > 0 
        ? `Min: ${stats.minTurnaround} / Max: ${stats.maxTurnaround} days`
        : undefined,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      borderColor: '#f97316',
    },
    {
      title: 'Win Rate',
      value: stats.quoted > 0 ? `${((stats.won / stats.quoted) * 100).toFixed(1)}%` : 'N/A',
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      borderColor: '#a855f7',
    },
  ];

  const pieData = stats.byStatus.map(item => ({
    name: item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] || 'hsl(var(--muted))',
  }));

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? 'bg-primary/10 border-primary' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {(filters.yearMonths?.length || 0) + (filters.customer ? 1 : 0)}
                </Badge>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}

            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Showing {filteredEnquiries.length} of {enquiries.length} enquiries
              </div>
            )}
          </div>

          {showFilters && (
            <div className="space-y-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Período (clique para selecionar meses específicos)
                </label>
                <div className="space-y-3">
                  {filterOptions.years.map(year => (
                    <div key={year} className="space-y-1">
                      <div className="text-sm font-medium">{year}</div>
                      <div className="flex flex-wrap gap-1">
                        {MONTH_LABELS.map((label, monthIndex) => (
                          <Badge
                            key={`${year}-${monthIndex}`}
                            variant={isYearMonthSelected(year, monthIndex) ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/80 transition-colors text-xs px-2 py-0.5"
                            onClick={() => toggleYearMonth(year, monthIndex)}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-w-xs">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer</label>
                <Select
                  value={filters.customer || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, customer: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {filterOptions.customers.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => (
          <div 
            key={card.title}
            className={`rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden ${card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={card.onClick}
          >
            <div 
              className="h-1 w-full" 
              style={{ backgroundColor: card.borderColor }}
            />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Value Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {valueCards.map((card) => (
          <div 
            key={card.title}
            className="rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden"
          >
            <div 
              className="h-1 w-full" 
              style={{ backgroundColor: card.borderColor }}
            />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  {'subtitle' in card && card.subtitle && (
                    <p className="text-[10px] text-muted-foreground/70">{card.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution - Horizontal Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byStatus} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.byStatus.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers - with colors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byCustomer.slice(0, 5)} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="customer" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.byCustomer.slice(0, 5).map((entry, index) => (
                      <Cell key={index} fill={CUSTOMER_COLORS[index % CUSTOMER_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Turnaround Trend Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Turnaround Trend (days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {stats.turnaroundByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.turnaroundByMonth}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="avgTurnaround" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ fill: '#f97316', strokeWidth: 2 }}
                      name="Avg Days"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No turnaround data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By Owner */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              By NPI Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byOwner.slice(0, 6).map((item) => (
                <div 
                  key={item.owner}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => onFilterByOwner?.(item.owner)}
                >
                  <span className="text-sm">{item.owner}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="font-semibold">
                  {stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quote Rate</span>
                <span className="font-semibold">
                  {stats.total > 0 ? ((stats.quoted / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Quote Value</span>
                <span className="font-semibold">
                  {stats.quoted > 0 ? formatCurrency(stats.totalQuotedValue / stats.quoted) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg PO Value</span>
                <span className="font-semibold">
                  {stats.won > 0 ? formatCurrency(stats.totalPOValue / stats.won) : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Enquiries with Aging */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-sky-600" />
            Open Enquiries
            <Badge variant="secondary" className="ml-2">{openEnquiriesWithAging.length}</Badge>
          </CardTitle>
          <CardDescription>
            Enquiries that are open or in progress, sorted by aging (oldest first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openEnquiriesWithAging.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No open enquiries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Enquiry No</TableHead>
                    <TableHead className="w-[150px]">Customer</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[120px]">NPI Owner</TableHead>
                    <TableHead className="w-[100px]">Date Received</TableHead>
                    <TableHead className="w-[80px] text-right">Aging</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openEnquiriesWithAging.map((enquiry) => (
                    <TableRow key={enquiry.id}>
                      <TableCell className="font-medium">{enquiry.enquiry_no}</TableCell>
                      <TableCell className="text-muted-foreground">{enquiry.customer || '-'}</TableCell>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-1">{enquiry.details || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {enquiry.npi_owner ? (
                          <Badge variant="outline" className="font-normal">
                            {enquiry.npi_owner}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {enquiry.date_received 
                          ? new Date(enquiry.date_received).toLocaleDateString('en-GB')
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getAgingBadgeVariant(enquiry.agingDays)}>
                          <Clock className="h-3 w-3 mr-1" />
                          {enquiry.agingDays !== null ? `${enquiry.agingDays}d` : '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
