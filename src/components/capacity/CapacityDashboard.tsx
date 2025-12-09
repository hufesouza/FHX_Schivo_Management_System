import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MachineSchedule, CleanedJob } from '@/types/capacity';
import { format, differenceInHours } from 'date-fns';
import { Clock, Calendar, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

interface CapacityDashboardProps {
  machines: MachineSchedule[];
  onSelectMachine: (machine: string) => void;
  selectedMachine: string | null;
}

interface IdleWindow {
  start: Date;
  end: Date;
  durationHours: number;
  afterJob: CleanedJob | null;
  beforeJob: CleanedJob | null;
}

function calculateIdleWindows(machine: MachineSchedule): IdleWindow[] {
  const now = new Date();
  const windows: IdleWindow[] = [];
  
  if (machine.jobs.length === 0) {
    return [];
  }
  
  // Sort jobs by start date
  const sortedJobs = [...machine.jobs].sort((a, b) => 
    new Date(a.Start_DateTime).getTime() - new Date(b.Start_DateTime).getTime()
  );
  
  // Check for gap before first job (from now)
  const firstJob = sortedJobs[0];
  const firstJobStart = new Date(firstJob.Start_DateTime);
  if (firstJobStart > now) {
    const durationHours = differenceInHours(firstJobStart, now);
    if (durationHours >= 1) { // Only show gaps of 1+ hours
      windows.push({
        start: now,
        end: firstJobStart,
        durationHours,
        afterJob: null,
        beforeJob: firstJob
      });
    }
  }
  
  // Find gaps between consecutive jobs
  for (let i = 0; i < sortedJobs.length - 1; i++) {
    const currentJob = sortedJobs[i];
    const nextJob = sortedJobs[i + 1];
    
    const currentEnd = new Date(currentJob.End_DateTime);
    const nextStart = new Date(nextJob.Start_DateTime);
    
    const gapHours = differenceInHours(nextStart, currentEnd);
    
    // Only show gaps of 8+ hours (at least one working day)
    if (gapHours >= 8) {
      windows.push({
        start: currentEnd,
        end: nextStart,
        durationHours: gapHours,
        afterJob: currentJob,
        beforeJob: nextJob
      });
    }
  }
  
  return windows;
}

function getNextAvailability(machine: MachineSchedule): { 
  nextWindow: IdleWindow | null; 
  totalIdleHours: number;
  windowCount: number;
} {
  const windows = calculateIdleWindows(machine);
  const totalIdleHours = windows.reduce((sum, w) => sum + w.durationHours, 0);
  
  // Find first window that starts from now or in the future
  const now = new Date();
  const nextWindow = windows.find(w => w.start >= now) || windows[0] || null;
  
  return { nextWindow, totalIdleHours, windowCount: windows.length };
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
              const { nextWindow, totalIdleHours, windowCount } = getNextAvailability(machine);
              const allWindows = calculateIdleWindows(machine);
              
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
                      <span className="text-muted-foreground">Availability</span>
                      <Popover open={openPopover === machine.machine} onOpenChange={(open) => setOpenPopover(open ? machine.machine : null)}>
                        <PopoverTrigger asChild>
                          <button 
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenPopover(openPopover === machine.machine ? null : machine.machine);
                            }}
                          >
                            {windowCount > 0 ? (
                              <span className="text-green-600">{windowCount} gap{windowCount > 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-amber-600">Fully booked</span>
                            )}
                            <Info className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-sm">Machine Availability Windows</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {windowCount > 0 
                                  ? `${windowCount} idle window${windowCount > 1 ? 's' : ''} totaling ${totalIdleHours.toFixed(0)}h available`
                                  : 'No significant gaps between scheduled jobs'
                                }
                              </p>
                            </div>
                            
                            {allWindows.length > 0 ? (
                              <ScrollArea className="h-64">
                                <div className="space-y-2 pr-3">
                                  {allWindows.map((window, idx) => (
                                    <div key={idx} className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md text-xs space-y-1">
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold text-green-700 dark:text-green-400">
                                          Gap {idx + 1}
                                        </span>
                                        <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                          {window.durationHours >= 24 
                                            ? `${Math.floor(window.durationHours / 24)}d ${window.durationHours % 24}h`
                                            : `${window.durationHours}h`
                                          }
                                        </Badge>
                                      </div>
                                      <p className="text-muted-foreground">
                                        <span className="font-medium">From:</span> {format(window.start, 'MMM d, yyyy HH:mm')}
                                      </p>
                                      <p className="text-muted-foreground">
                                        <span className="font-medium">Until:</span> {format(window.end, 'MMM d, yyyy HH:mm')}
                                      </p>
                                      {window.afterJob && (
                                        <p className="text-muted-foreground pt-1 border-t border-green-200 dark:border-green-800">
                                          After: {window.afterJob.Item_Name || window.afterJob.Process_Order}
                                        </p>
                                      )}
                                      {window.beforeJob && (
                                        <p className="text-muted-foreground">
                                          Before: {window.beforeJob.Item_Name || window.beforeJob.Process_Order}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            ) : (
                              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                  No gaps of 8+ hours found between jobs. Machine is continuously scheduled.
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Next available after all jobs: {format(machine.nextFreeDate, 'MMM d, yyyy HH:mm')}
                                </p>
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
