import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnquiryStats } from '@/hooks/useEnquiryLog';
import { 
  FileText, 
  CheckCircle, 
  Trophy, 
  XCircle, 
  PauseCircle, 
  Euro,
  Clock,
  Users,
  Building
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EnquiryDashboardProps {
  stats: EnquiryStats;
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

export function EnquiryDashboard({ stats, onFilterByStatus, onFilterByCustomer, onFilterByOwner }: EnquiryDashboardProps) {
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
