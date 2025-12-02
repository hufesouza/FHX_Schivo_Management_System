import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  openCount: number;
  completedCount: number;
  avgTurnaround: number;
  oldestOpenDays: number;
}

export function DashboardStats({ openCount, completedCount, avgTurnaround, oldestOpenDays }: DashboardStatsProps) {
  const total = openCount + completedCount;
  const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Reviews</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{openCount}</div>
          <p className="text-xs text-muted-foreground">Currently in progress</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <p className="text-xs text-muted-foreground">{completionRate}% completion rate</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-accent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Turnaround</CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgTurnaround.toFixed(1)} <span className="text-sm font-normal">days</span></div>
          <p className="text-xs text-muted-foreground">For completed reviews</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Oldest Open</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{oldestOpenDays} <span className="text-sm font-normal">days</span></div>
          <p className="text-xs text-muted-foreground">Needs attention</p>
        </CardContent>
      </Card>
    </div>
  );
}
