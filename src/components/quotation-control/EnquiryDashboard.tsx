import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  'OPEN': 'hsl(var(--primary))',
  'QUOTED': 'hsl(142, 76%, 36%)',
  'WON': 'hsl(142, 76%, 36%)',
  'LOST': 'hsl(0, 84%, 60%)',
  'ON HOLD': 'hsl(45, 93%, 47%)',
  'CANCELLED': 'hsl(0, 0%, 50%)',
};

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
    return {
      total: data.length,
      open: data.filter(e => e.status?.toUpperCase() === 'OPEN' || !e.status).length,
      quoted: data.filter(e => e.is_quoted).length,
      won: data.filter(e => e.po_received || e.status?.toUpperCase() === 'WON').length,
      lost: data.filter(e => e.status?.toUpperCase() === 'LOST').length,
      onHold: data.filter(e => e.status?.toUpperCase() === 'ON HOLD' || e.priority?.toLowerCase() === 'hold').length,
      totalQuotedValue: data.reduce((sum, e) => sum + (e.quoted_price_euro || 0), 0),
      totalPOValue: data.reduce((sum, e) => sum + (e.po_value_euro || 0), 0),
      avgTurnaround: data.filter(e => e.turnaround_days).length > 0
        ? data.filter(e => e.turnaround_days).reduce((sum, e) => sum + (e.turnaround_days || 0), 0) / 
          data.filter(e => e.turnaround_days).length
        : 0,
      byCustomer: Object.entries(
        data.reduce((acc, e) => {
          const customer = e.customer || 'Unknown';
          acc[customer] = (acc[customer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([customer, count]) => ({ customer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byOwner: Object.entries(
        data.reduce((acc, e) => {
          const owner = e.npi_owner || 'Unassigned';
          acc[owner] = (acc[owner] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([owner, count]) => ({ owner, count }))
        .sort((a, b) => b.count - a.count),
      byStatus: Object.entries(
        data.reduce((acc, e) => {
          const status = e.status || 'OPEN';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [filteredEnquiries]);

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
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-l-indigo-500',
    },
    {
      title: 'Open',
      value: stats.open,
      icon: Clock,
      color: 'text-sky-600',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-l-sky-500',
      onClick: () => onFilterByStatus?.('OPEN'),
    },
    {
      title: 'Quoted',
      value: stats.quoted,
      icon: CheckCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-l-teal-500',
    },
    {
      title: 'Won (PO Received)',
      value: stats.won,
      icon: Trophy,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-l-emerald-500',
      onClick: () => onFilterByStatus?.('WON'),
    },
    {
      title: 'Lost',
      value: stats.lost,
      icon: XCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-l-rose-500',
      onClick: () => onFilterByStatus?.('LOST'),
    },
    {
      title: 'On Hold',
      value: stats.onHold,
      icon: PauseCircle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-l-amber-500',
    },
  ];

  const valueCards = [
    {
      title: 'Total Quoted Value',
      value: formatCurrency(stats.totalQuotedValue),
      icon: Euro,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-l-cyan-500',
    },
    {
      title: 'Total PO Value',
      value: formatCurrency(stats.totalPOValue),
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-l-green-500',
    },
    {
      title: 'Avg Turnaround',
      value: `${stats.avgTurnaround.toFixed(1)} days`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-l-orange-500',
    },
    {
      title: 'Win Rate',
      value: stats.quoted > 0 ? `${((stats.won / stats.quoted) * 100).toFixed(1)}%` : 'N/A',
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-l-purple-500',
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
          <Card 
            key={card.title} 
            className={`border-l-4 ${card.borderColor} ${card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={card.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Value Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {valueCards.map((card) => (
          <Card key={card.title} className={`border-l-4 ${card.borderColor}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
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
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
    </div>
  );
}
