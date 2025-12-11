import { NPIJobWithRelations } from '@/types/npi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Wrench,
  Package
} from 'lucide-react';

export type QuickFilterType = 
  | { type: 'all' }
  | { type: 'ready' }
  | { type: 'released' }
  | { type: 'overdue' }
  | { type: 'status'; value: string }
  | { type: 'mcCell'; value: string }
  | { type: 'customer'; value: string };

interface NPIDashboardProps {
  jobs: NPIJobWithRelations[];
  stats: {
    totalJobs: number;
    byStatus: Record<string, number>;
    byCustomer: Record<string, number>;
    byMcCell: Record<string, number>;
    readyForMC: number;
    fullyReleased: number;
  };
  onQuickFilter?: (filter: QuickFilterType) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'hsl(var(--destructive))',
  'In-Process': 'hsl(var(--primary))',
  'QA': 'hsl(45, 93%, 47%)',
  'DB': 'hsl(280, 73%, 55%)',
  'Complete': 'hsl(142, 76%, 36%)',
  'On Hold': 'hsl(var(--muted-foreground))',
  'Unknown': 'hsl(var(--muted-foreground))'
};

const MC_CELL_COLORS: Record<string, string> = {
  'SLH': 'hsl(var(--primary))',
  'MT': 'hsl(142, 76%, 36%)',
  'LASER': 'hsl(0, 84%, 60%)',
  'MILL': 'hsl(45, 93%, 47%)',
  'TURN': 'hsl(280, 73%, 55%)',
  'Unknown': 'hsl(var(--muted-foreground))'
};

export function NPIDashboard({ jobs, stats, onQuickFilter }: NPIDashboardProps) {
  // Prepare chart data
  const statusData = Object.entries(stats.byStatus)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const customerData = Object.entries(stats.byCustomer)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const mcCellData = Object.entries(stats.byMcCell)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Calculate additional metrics
  const activeJobs = jobs.filter(j => 
    j.status && !['Complete', 'Cancelled'].includes(j.status)
  ).length;

  const overdueJobs = jobs.filter(j => {
    if (!j.gate_commit_date) return false;
    if (j.status?.toLowerCase() === 'complete') return false;
    return new Date(j.gate_commit_date) < new Date();
  }).length;

  const handleCardClick = (filter: QuickFilterType) => {
    onQuickFilter?.(filter);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => handleCardClick({ type: 'all' })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total NPI Jobs
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeJobs} active • Click to view all
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-green-500/50"
          onClick={() => handleCardClick({ type: 'ready' })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready for Machining
            </CardTitle>
            <Wrench className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.readyForMC}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All prerequisites complete • Click to filter
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
          onClick={() => handleCardClick({ type: 'released' })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fully Released
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.fullyReleased}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Post-MC activities complete • Click to filter
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md hover:border-destructive/50"
          onClick={() => handleCardClick({ type: 'overdue' })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Jobs
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Past gate commit date • Click to filter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fontSize: 12, cursor: 'pointer' }}
                    onClick={(e: any) => {
                      if (e?.value) handleCardClick({ type: 'status', value: e.value });
                    }}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data?.name) handleCardClick({ type: 'status', value: data.name });
                    }}
                  >
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.name] || STATUS_COLORS['Unknown']} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Jobs by MC Cell</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mcCellData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={60}
                    tick={{ fontSize: 12, cursor: 'pointer' }}
                    onClick={(e: any) => {
                      if (e?.value) handleCardClick({ type: 'mcCell', value: e.value });
                    }}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data?.name) handleCardClick({ type: 'mcCell', value: data.name });
                    }}
                  >
                    {mcCellData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={MC_CELL_COLORS[entry.name] || MC_CELL_COLORS['Unknown']} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fontSize: 10, cursor: 'pointer' }}
                    onClick={(e: any) => {
                      if (e?.value) handleCardClick({ type: 'customer', value: e.value });
                    }}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data?.name) handleCardClick({ type: 'customer', value: data.name });
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status badges summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Overview (click to filter)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {statusData.map(({ name, value }) => (
              <Badge 
                key={name}
                variant="outline"
                className="text-sm py-1 px-3 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ 
                  borderColor: STATUS_COLORS[name] || STATUS_COLORS['Unknown'],
                  color: STATUS_COLORS[name] || STATUS_COLORS['Unknown']
                }}
                onClick={() => handleCardClick({ type: 'status', value: name })}
              >
                {name}: {value}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
