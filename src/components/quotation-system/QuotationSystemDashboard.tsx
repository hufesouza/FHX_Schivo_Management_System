import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  TrendingDown,
  ThumbsUp,
  Send,
  Calculator,
  Euro,
  Percent,
  BarChart3
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { QuotationEnquiry, EnquiryStatus } from '@/hooks/useQuotationEnquiries';
import { SystemQuotation } from '@/hooks/useQuotationSystem';

interface QuotationSystemDashboardProps {
  enquiries: QuotationEnquiry[];
  quotations: SystemQuotation[];
}

const statusConfig: Record<EnquiryStatus, { label: string; color: string; chartColor: string }> = {
  open: { label: 'Open', color: 'bg-slate-500', chartColor: '#64748b' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500', chartColor: '#f59e0b' },
  submitted_for_review: { label: 'For Review', color: 'bg-blue-500', chartColor: '#3b82f6' },
  approved: { label: 'Approved', color: 'bg-emerald-500', chartColor: '#10b981' },
  declined: { label: 'Declined', color: 'bg-red-500', chartColor: '#ef4444' },
  submitted: { label: 'Submitted', color: 'bg-violet-500', chartColor: '#8b5cf6' },
  won: { label: 'Won', color: 'bg-green-600', chartColor: '#16a34a' },
  lost: { label: 'Lost', color: 'bg-gray-500', chartColor: '#6b7280' },
};

export function QuotationSystemDashboard({ enquiries, quotations }: QuotationSystemDashboardProps) {
  // Enquiry stats
  const enquiryStats = useMemo(() => {
    const byStatus: Record<EnquiryStatus, number> = {
      open: 0,
      in_progress: 0,
      submitted_for_review: 0,
      approved: 0,
      declined: 0,
      submitted: 0,
      won: 0,
      lost: 0,
    };

    enquiries.forEach((e) => {
      byStatus[e.status]++;
    });

    return byStatus;
  }, [enquiries]);

  // Pie chart data for enquiry status
  const enquiryPieData = useMemo(() => {
    return Object.entries(enquiryStats)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: statusConfig[status as EnquiryStatus].label,
        value: count,
        color: statusConfig[status as EnquiryStatus].chartColor,
      }));
  }, [enquiryStats]);

  // Quotation stats
  const quotationStats = useMemo(() => {
    const total = quotations.length;
    const draft = quotations.filter((q) => q.status === 'draft').length;
    const completed = quotations.filter((q) => q.status === 'completed').length;
    const won = quotations.filter((q) => q.won_volume !== null).length;

    return { total, draft, completed, won };
  }, [quotations]);

  // Value metrics
  const valueMetrics = useMemo(() => {
    const enquiriesWithValue = enquiries.filter((e) => e.total_quoted_value);
    const totalQuotedValue = enquiriesWithValue.reduce(
      (sum, e) => sum + (e.total_quoted_value || 0),
      0
    );

    const enquiriesWithMargin = enquiries.filter(
      (e) => e.average_margin !== null && e.average_margin !== undefined
    );
    const avgMargin =
      enquiriesWithMargin.length > 0
        ? enquiriesWithMargin.reduce((sum, e) => sum + (e.average_margin || 0), 0) /
          enquiriesWithMargin.length
        : 0;

    const wonEnquiries = enquiries.filter((e) => e.status === 'won' && e.total_quoted_value);
    const wonValue = wonEnquiries.reduce((sum, e) => sum + (e.total_quoted_value || 0), 0);

    const conversionRate =
      enquiries.length > 0
        ? (enquiryStats.won / enquiries.filter((e) => ['won', 'lost'].includes(e.status)).length) *
          100
        : 0;

    return { totalQuotedValue, avgMargin, wonValue, conversionRate };
  }, [enquiries, enquiryStats]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { enquiries: number; quotations: number; won: number }> = {};

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = { enquiries: 0, quotations: 0, won: 0 };
    }

    enquiries.forEach((e) => {
      const date = new Date(e.created_at);
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (months[key]) {
        months[key].enquiries++;
        if (e.status === 'won') months[key].won++;
      }
    });

    quotations.forEach((q) => {
      const date = new Date(q.created_at);
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (months[key]) {
        months[key].quotations++;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    }));
  }, [enquiries, quotations]);

  // Top customers by value
  const topCustomers = useMemo(() => {
    const customerMap: Record<string, { count: number; value: number }> = {};

    enquiries.forEach((e) => {
      if (!customerMap[e.customer_name]) {
        customerMap[e.customer_name] = { count: 0, value: 0 };
      }
      customerMap[e.customer_name].count++;
      customerMap[e.customer_name].value += e.total_quoted_value || 0;
    });

    return Object.entries(customerMap)
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  }, [enquiries]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enquiries.length}</div>
            <p className="text-xs text-muted-foreground">
              {enquiryStats.open} open, {enquiryStats.in_progress} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotationStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {quotationStats.completed} completed, {quotationStats.draft} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quoted Value</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valueMetrics.totalQuotedValue)}</div>
            <p className="text-xs text-muted-foreground">
              Won: {formatCurrency(valueMetrics.wonValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isNaN(valueMetrics.conversionRate) ? 'N/A' : `${valueMetrics.conversionRate.toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {enquiryStats.won} won, {enquiryStats.lost} lost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        {Object.entries(statusConfig).map(([status, config]) => (
          <Card key={status} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{config.label}</span>
                <Badge
                  className={`${config.color} text-white text-xs px-2 py-0.5`}
                  variant="secondary"
                >
                  {enquiryStats[status as EnquiryStatus]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Enquiry Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enquiry Status Distribution</CardTitle>
            <CardDescription>Current status breakdown of all enquiries</CardDescription>
          </CardHeader>
          <CardContent>
            {enquiryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={enquiryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {enquiryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Activity</CardTitle>
            <CardDescription>Enquiries and quotations over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="enquiries" name="Enquiries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quotations" name="Quotations" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="won" name="Won" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Customers by Quoted Value</CardTitle>
          <CardDescription>Customers with highest total quoted value</CardDescription>
        </CardHeader>
        <CardContent>
          {topCustomers.length > 0 ? (
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div key={customer.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.count} enquiries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(customer.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No customer data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
