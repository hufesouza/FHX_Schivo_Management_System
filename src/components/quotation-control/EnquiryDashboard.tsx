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
  AlertTriangle,
  CalendarDays,
  TrendingUp,
  Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export interface DashboardFilters {
  year?: string;
  quarter?: string;
  customer?: string;
  quickFilter?: string;
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

// Quick filter definitions
const QUICK_FILTERS = [
  { id: 'this-month', label: 'This Month', icon: CalendarDays },
  { id: 'this-quarter', label: 'This Quarter', icon: TrendingUp },
  { id: 'needs-quote', label: 'Needs Quote', icon: Zap },
  { id: 'aging-7', label: 'Aging > 7 days', icon: Clock },
  { id: 'aging-14', label: 'Aging > 14 days', icon: Clock },
  { id: 'aging-30', label: 'Aging > 30 days', icon: AlertTriangle },
  { id: 'high-value', label: 'High Value (>€10k)', icon: Euro },
  { id: 'overdue', label: 'Overdue ECD', icon: AlertTriangle },
];

export function EnquiryDashboard({ enquiries, onFilterByStatus, onFilterByCustomer, onFilterByOwner }: EnquiryDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const years = [...new Set(enquiries.map(e => {
      if (!e.date_received) return null;
      try {
        return new Date(e.date_received).getFullYear().toString();
      } catch {
        return null;
      }
    }).filter(Boolean))].sort().reverse() as string[];

    const customers = [...new Set(enquiries.map(e => e.customer).filter(Boolean))].sort() as string[];

    return { years, customers };
  }, [enquiries]);

  // Apply quick filter logic
  const applyQuickFilter = (enquiry: EnquiryLog, quickFilter: string): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (quickFilter) {
      case 'this-month': {
        if (!enquiry.date_received) return false;
        const received = new Date(enquiry.date_received);
        return received.getMonth() === now.getMonth() && received.getFullYear() === now.getFullYear();
      }
      case 'this-quarter': {
        if (!enquiry.date_received) return false;
        const received = new Date(enquiry.date_received);
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const enquiryQuarter = Math.floor(received.getMonth() / 3);
        return enquiryQuarter === currentQuarter && received.getFullYear() === now.getFullYear();
      }
      case 'needs-quote': {
        return !enquiry.is_quoted && enquiry.status?.toUpperCase() !== 'CANCELLED' && enquiry.status?.toUpperCase() !== 'LOST';
      }
      case 'aging-7': {
        return (enquiry.aging || 0) > 7;
      }
      case 'aging-14': {
        return (enquiry.aging || 0) > 14;
      }
      case 'aging-30': {
        return (enquiry.aging || 0) > 30;
      }
      case 'high-value': {
        return (enquiry.quoted_price_euro || 0) > 10000;
      }
      case 'overdue': {
        if (!enquiry.ecd_quote_submission) return false;
        const ecd = new Date(enquiry.ecd_quote_submission);
        return ecd < today && !enquiry.is_quoted;
      }
      default:
        return true;
    }
  };

  // Apply filters to enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(e => {
      // Quick filter
      if (filters.quickFilter && !applyQuickFilter(e, filters.quickFilter)) {
        return false;
      }

      // Year filter
      if (filters.year && e.date_received) {
        try {
          const year = new Date(e.date_received).getFullYear().toString();
          if (year !== filters.year) return false;
        } catch {
          return false;
        }
      } else if (filters.year && !e.date_received) {
        return false;
      }

      // Quarter filter
      if (filters.quarter && e.date_received) {
        try {
          const month = new Date(e.date_received).getMonth();
          const quarter = Math.floor(month / 3) + 1;
          if (quarter.toString() !== filters.quarter) return false;
        } catch {
          return false;
        }
      } else if (filters.quarter && !e.date_received) {
        return false;
      }

      // Customer filter
      if (filters.customer && e.customer !== filters.customer) return false;

      return true;
    });
  }, [enquiries, filters]);

  // Calculate quick filter counts
  const quickFilterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    QUICK_FILTERS.forEach(qf => {
      counts[qf.id] = enquiries.filter(e => applyQuickFilter(e, qf.id)).length;
    });
    return counts;
  }, [enquiries]);

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

  const hasActiveFilters = Object.values(filters).some(v => v);

  const clearFilters = () => setFilters({});

  const toggleQuickFilter = (id: string) => {
    setFilters(prev => ({
      ...prev,
      quickFilter: prev.quickFilter === id ? undefined : id,
    }));
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
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Open',
      value: stats.open,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      onClick: () => onFilterByStatus?.('OPEN'),
    },
    {
      title: 'Quoted',
      value: stats.quoted,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Won (PO Received)',
      value: stats.won,
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      onClick: () => onFilterByStatus?.('WON'),
    },
    {
      title: 'Lost',
      value: stats.lost,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
      onClick: () => onFilterByStatus?.('LOST'),
    },
    {
      title: 'On Hold',
      value: stats.onHold,
      icon: PauseCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  const valueCards = [
    {
      title: 'Total Quoted Value',
      value: formatCurrency(stats.totalQuotedValue),
      icon: Euro,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Total PO Value',
      value: formatCurrency(stats.totalPOValue),
      icon: Trophy,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Avg Turnaround',
      value: `${stats.avgTurnaround.toFixed(1)} days`,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Win Rate',
      value: stats.quoted > 0 ? `${((stats.won / stats.quoted) * 100).toFixed(1)}%` : 'N/A',
      icon: Trophy,
      color: 'text-violet-600',
      bgColor: 'bg-violet-500/10',
    },
  ];

  const pieData = stats.byStatus.map(item => ({
    name: item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] || 'hsl(var(--muted))',
  }));

  return (
    <div className="space-y-6">
      {/* Quick Filter Chips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Filters
          </CardTitle>
          <CardDescription>Click to filter enquiries by common criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((qf) => {
              const Icon = qf.icon;
              const isActive = filters.quickFilter === qf.id;
              const count = quickFilterCounts[qf.id];
              return (
                <Button
                  key={qf.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleQuickFilter(qf.id)}
                  className={`gap-2 ${isActive ? '' : 'hover:bg-muted'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {qf.label}
                  <Badge 
                    variant={isActive ? 'secondary' : 'outline'} 
                    className={`ml-1 ${count === 0 ? 'opacity-50' : ''}`}
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary/10' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">Active</Badge>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Year</label>
                <Select
                  value={filters.year || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, year: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {filterOptions.years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Quarter</label>
                <Select
                  value={filters.quarter || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, quarter: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All quarters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All quarters</SelectItem>
                    <SelectItem value="1">Q1 (Jan-Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr-Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul-Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
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
            className={`${card.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
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
          <Card key={card.title}>
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
