import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MachineSchedule, CleanedJob } from '@/types/capacity';
import { format } from 'date-fns';
import { Clock, Calendar, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

interface CapacityDashboardProps {
  machines: MachineSchedule[];
  onSelectMachine: (machine: string) => void;
  selectedMachine: string | null;
}

function getNextFreeReason(machine: MachineSchedule): { reason: string; lastJob: CleanedJob | null } {
  if (machine.jobs.length === 0) {
    return { reason: 'No jobs scheduled - machine is available immediately.', lastJob: null };
  }
  
  // Find the last job that ends before or at the nextFreeDate
  const sortedJobs = [...machine.jobs].sort((a, b) => 
    new Date(b.End_DateTime).getTime() - new Date(a.End_DateTime).getTime()
  );
  
  const lastJob = sortedJobs[0];
  
  if (!lastJob) {
    return { reason: 'No jobs found - machine is available.', lastJob: null };
  }
  
  return {
    reason: `Machine becomes free after job "${lastJob.Item_Name || lastJob.End_Product || lastJob.Process_Order}" completes.`,
    lastJob
  };
}

export function CapacityDashboard({ machines, onSelectMachine, selectedMachine }: CapacityDashboardProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  
  const totalHours = machines.reduce((sum, m) => sum + m.totalScheduledHours, 0);
  const avgUtilization = machines.length > 0 
    ? machines.reduce((sum, m) => sum + m.utilization, 0) / machines.length 
    : 0;
  
  // Identify bottleneck machines (top 3 by hours or >90% utilization)
  const bottlenecks = machines
    .filter(m => m.utilization > 90 || machines.indexOf(m) < 3)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Total Scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Across {machines.length} machines
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Avg Utilization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization.toFixed(1)}%</div>
            <Progress value={avgUtilization} className="mt-2 h-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Machines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
            <p className="text-xs text-muted-foreground">
              Active in schedule
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Bottlenecks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{bottlenecks.length}</div>
            <p className="text-xs text-muted-foreground">
              High utilization machines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Machine List */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Overview</CardTitle>
          <CardDescription>
            Click a machine to view its detailed timeline and job schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {machines.map((machine) => {
              const isBottleneck = machine.utilization > 90;
              const isSelected = selectedMachine === machine.machine;
              const { reason, lastJob } = getNextFreeReason(machine);
              
              return (
                <div
                  key={machine.machine}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'hover:border-primary/50 hover:bg-muted/50'
                  } ${isBottleneck ? 'border-amber-500/50' : ''}`}
                  onClick={() => onSelectMachine(machine.machine)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{machine.machine}</h4>
                      <p className="text-sm text-muted-foreground">
                        {machine.jobs.length} jobs
                      </p>
                    </div>
                    {isBottleneck && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                        High Load
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Hours</span>
                      <span className="font-medium">{machine.totalScheduledHours.toFixed(1)}h</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className={`font-medium ${machine.utilization > 90 ? 'text-amber-600' : machine.utilization > 70 ? 'text-green-600' : ''}`}>
                        {machine.utilization.toFixed(1)}%
                      </span>
                    </div>
                    
                    <Progress 
                      value={machine.utilization} 
                      className={`h-2 ${machine.utilization > 90 ? '[&>div]:bg-amber-500' : ''}`}
                    />
                    
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Next Free</span>
                      <Popover open={openPopover === machine.machine} onOpenChange={(open) => setOpenPopover(open ? machine.machine : null)}>
                        <PopoverTrigger asChild>
                          <button 
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenPopover(openPopover === machine.machine ? null : machine.machine);
                            }}
                          >
                            {format(machine.nextFreeDate, 'MMM d, HH:mm')}
                            <Info className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Why is this machine free on {format(machine.nextFreeDate, 'MMM d, yyyy')} at {format(machine.nextFreeDate, 'HH:mm')}?</h4>
                            <p className="text-sm text-muted-foreground">{reason}</p>
                            {lastJob && (
                              <div className="mt-3 p-2 bg-muted rounded-md text-xs space-y-1">
                                <p><span className="font-medium">Last Job:</span> {lastJob.Item_Name || lastJob.End_Product || 'N/A'}</p>
                                <p><span className="font-medium">Process Order:</span> {lastJob.Process_Order}</p>
                                <p><span className="font-medium">Ends:</span> {format(new Date(lastJob.End_DateTime), 'MMM d, yyyy HH:mm')}</p>
                                <p><span className="font-medium">Duration:</span> {lastJob.Duration_Hours.toFixed(1)}h</p>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
