import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MachineSchedule, GanttJob } from '@/types/capacity';
import { format, differenceInDays, startOfDay, addDays } from 'date-fns';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

interface MachineTimelineProps {
  machine: MachineSchedule;
  ganttJobs: GanttJob[];
  onJobClick?: (jobId: string) => void;
  selectedJobId?: string | null;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'hsl(0, 84%, 60%)',    // Red - highest priority
  2: 'hsl(25, 95%, 53%)',   // Orange
  3: 'hsl(48, 96%, 53%)',   // Yellow
  4: 'hsl(142, 71%, 45%)',  // Green
  5: 'hsl(217, 91%, 60%)',  // Blue - lowest priority
};

export function MachineTimeline({ machine, ganttJobs, onJobClick, selectedJobId }: MachineTimelineProps) {
  // Convert date strings to Date objects (they come as strings from localStorage)
  const machineJobs = useMemo(() => 
    ganttJobs
      .filter(job => job.machine === machine.machine)
      .map(job => ({
        ...job,
        startDateTime: new Date(job.startDateTime),
        endDateTime: new Date(job.endDateTime),
      }))
      .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime()),
    [ganttJobs, machine.machine]
  );

  // Build daily utilization data
  const dailyUtilization = useMemo(() => {
    const days: Record<string, number> = {};
    
    machineJobs.forEach(job => {
      const dayKey = format(job.startDateTime, 'yyyy-MM-dd');
      days[dayKey] = (days[dayKey] || 0) + job.durationHours;
    });
    
    // Fill in missing days
    if (machineJobs.length > 0) {
      const startDate = startOfDay(machineJobs[0].startDateTime);
      const endDate = startOfDay(machineJobs[machineJobs.length - 1].endDateTime);
      const dayCount = differenceInDays(endDate, startDate) + 1;
      
      for (let i = 0; i < dayCount; i++) {
        const day = addDays(startDate, i);
        const dayKey = format(day, 'yyyy-MM-dd');
        if (!(dayKey in days)) {
          days[dayKey] = 0;
        }
      }
    }
    
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, hours]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        hours,
        utilization: Math.min((hours / 8) * 100, 100),
      }));
  }, [machineJobs]);

  // Gantt chart data
  const ganttData = useMemo(() => {
    if (machineJobs.length === 0) return [];
    
    const startDate = machineJobs[0].startDateTime;
    
    return machineJobs.map(job => ({
      ...job,
      startOffset: differenceInDays(job.startDateTime, startDate),
      durationDays: job.durationHours / 24,
    }));
  }, [machineJobs]);

  const chartConfig = {
    hours: {
      label: 'Hours',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="space-y-6">
      {/* Machine Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{machine.machine}</CardTitle>
              <CardDescription>
                Machine Timeline & Job Schedule
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{machine.totalScheduledHours.toFixed(1)}h</div>
              <p className="text-sm text-muted-foreground">Total Scheduled</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Jobs Scheduled</p>
              <p className="text-xl font-semibold">{machine.jobs.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Utilization</p>
              <p className="text-xl font-semibold">{machine.utilization.toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Next Free</p>
              <p className="text-xl font-semibold">{format(machine.nextFreeDate, 'MMM d, HH:mm')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Job Timeline</CardTitle>
          <CardDescription>Visual schedule of all jobs on this machine</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {ganttData.map((job) => {
              const color = PRIORITY_COLORS[job.priority] || PRIORITY_COLORS[3];
              const isSelected = selectedJobId === job.id;
              
              return (
                <div 
                  key={job.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onJobClick?.(job.id)}
                >
                  <div className="w-32 flex-shrink-0 truncate text-sm font-medium">
                    {job.processOrder}
                  </div>
                  <div className="flex-1 h-8 bg-muted rounded relative overflow-hidden">
                    <div 
                      className="absolute h-full rounded flex items-center px-2"
                      style={{
                        left: `${(job.startOffset / Math.max(1, ganttData.length)) * 100}%`,
                        width: `${Math.max(5, (job.durationDays / Math.max(1, ganttData.length)) * 100)}%`,
                        backgroundColor: color,
                      }}
                    >
                      <span className="text-xs text-white font-medium truncate">
                        {job.durationHours.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                  <div className="w-24 flex-shrink-0 text-right text-sm text-muted-foreground">
                    {format(job.startDateTime, 'MMM d')}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="text-muted-foreground">Priority:</span>
            {[1, 2, 3, 4, 5].map(p => (
              <div key={p} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: PRIORITY_COLORS[p] }}
                />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Utilization Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Utilization</CardTitle>
          <CardDescription>Hours scheduled per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyUtilization}>
                <XAxis 
                  dataKey="displayDate" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}h`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-2 text-sm">
                          <p className="font-medium">{data.date}</p>
                          <p className="text-muted-foreground">{data.hours.toFixed(1)} hours</p>
                          <p className="text-muted-foreground">{data.utilization.toFixed(0)}% utilization</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {dailyUtilization.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.utilization > 100 ? 'hsl(0, 84%, 60%)' : 'hsl(var(--primary))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Job List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
          <CardDescription>Complete list of jobs scheduled on this machine</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process Order</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineJobs.map((job) => (
                  <TableRow 
                    key={job.id}
                    className={`cursor-pointer ${selectedJobId === job.id ? 'bg-primary/5' : ''}`}
                    onClick={() => onJobClick?.(job.id)}
                  >
                    <TableCell className="font-medium">{job.processOrder}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{job.endProduct}</TableCell>
                    <TableCell>{format(job.startDateTime, 'MMM d, HH:mm')}</TableCell>
                    <TableCell className="text-right">{job.durationHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{job.qty}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: PRIORITY_COLORS[job.priority] || PRIORITY_COLORS[3],
                          color: PRIORITY_COLORS[job.priority] || PRIORITY_COLORS[3],
                        }}
                      >
                        {job.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
