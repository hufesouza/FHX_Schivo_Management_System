import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MachineSchedule, CleanedJob } from '@/types/capacity';
import { format, differenceInHours, addHours } from 'date-fns';
import { Clock, Calendar, AlertTriangle, TrendingUp, Info, Search, CheckCircle2, XCircle } from 'lucide-react';
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
    // If no jobs, the machine is completely free from now
    return [{
      start: now,
      end: addHours(now, 8760), // 1 year ahead as "infinite"
      durationHours: 8760,
      afterJob: null,
      beforeJob: null
    }];
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
    if (durationHours >= 1) {
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
  
  // Add window after last job (machine free after all jobs)
  const lastJob = sortedJobs[sortedJobs.length - 1];
  const lastJobEnd = new Date(lastJob.End_DateTime);
  windows.push({
    start: lastJobEnd,
    end: addHours(lastJobEnd, 8760),
    durationHours: 8760,
    afterJob: lastJob,
    beforeJob: null
  });
  
  return windows;
}

function findSlotForJob(machine: MachineSchedule, requiredHours: number): IdleWindow | null {
  const windows = calculateIdleWindows(machine);
  return windows.find(w => w.durationHours >= requiredHours) || null;
}

function getNextAvailability(machine: MachineSchedule): { 
  totalIdleHours: number;
  windowCount: number;
} {
  const windows = calculateIdleWindows(machine);
  // Don't count the "infinite" window after last job
  const finiteWindows = windows.filter(w => w.beforeJob !== null);
  const totalIdleHours = finiteWindows.reduce((sum, w) => sum + w.durationHours, 0);
  
  return { totalIdleHours, windowCount: finiteWindows.length };
}

export function CapacityDashboard({ machines, onSelectMachine, selectedMachine }: CapacityDashboardProps) {
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [searchHours, setSearchHours] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, IdleWindow | null | 'searching'>>({});
  
  const totalHours = machines.reduce((sum, m) => sum + m.totalScheduledHours, 0);
  const avgUtilization = machines.length > 0 
    ? machines.reduce((sum, m) => sum + m.utilization, 0) / machines.length 
    : 0;
  
  const bottlenecks = machines
    .filter(m => m.utilization > 90 || machines.indexOf(m) < 3)
    .slice(0, 3);

  const handleFindSlot = (machine: MachineSchedule) => {
    const hours = parseFloat(searchHours[machine.machine] || '0');
    if (hours <= 0) return;
    
    const slot = findSlotForJob(machine, hours);
    setSearchResults(prev => ({ ...prev, [machine.machine]: slot }));
  };

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
              const { totalIdleHours, windowCount } = getNextAvailability(machine);
              const allWindows = calculateIdleWindows(machine);
              const finiteWindows = allWindows.filter(w => w.beforeJob !== null);
              const searchResult = searchResults[machine.machine];
              
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
                      <Popover open={openPopover === machine.machine} onOpenChange={(open) => {
                        setOpenPopover(open ? machine.machine : null);
                        if (!open) {
                          // Clear search when closing
                          setSearchResults(prev => ({ ...prev, [machine.machine]: undefined }));
                        }
                      }}>
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
                            {/* Find Slot Search */}
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                              <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                Find Slot for New Job
                              </h4>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="Hours needed"
                                  className="h-8 text-sm"
                                  value={searchHours[machine.machine] || ''}
                                  onChange={(e) => setSearchHours(prev => ({ 
                                    ...prev, 
                                    [machine.machine]: e.target.value 
                                  }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleFindSlot(machine);
                                  }}
                                />
                                <Button 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => handleFindSlot(machine)}
                                >
                                  Find
                                </Button>
                              </div>
                              
                              {/* Search Result */}
                              {searchResult !== undefined && searchResult !== 'searching' && (
                                <div className={`p-2 rounded-md text-xs ${
                                  searchResult 
                                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                                }`}>
                                  {searchResult ? (
                                    <div className="space-y-1">
                                      <p className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Slot Found!
                                      </p>
                                      <p className="text-muted-foreground">
                                        <span className="font-medium">Start:</span> {format(searchResult.start, 'MMM d, yyyy HH:mm')}
                                      </p>
                                      <p className="text-muted-foreground">
                                        <span className="font-medium">Available:</span> {searchResult.durationHours >= 8760 
                                          ? 'Open-ended (after last job)' 
                                          : `${searchResult.durationHours}h window`
                                        }
                                      </p>
                                      {searchResult.afterJob && (
                                        <p className="text-muted-foreground pt-1 border-t border-green-200 dark:border-green-800">
                                          After: {searchResult.afterJob.Item_Name || searchResult.afterJob.Process_Order}
                                        </p>
                                      )}
                                      {searchResult.beforeJob && (
                                        <p className="text-muted-foreground">
                                          Before: {searchResult.beforeJob.Item_Name || searchResult.beforeJob.Process_Order}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-red-700 dark:text-red-400 flex items-center gap-1">
                                      <XCircle className="h-3 w-3" />
                                      No slot large enough found. Job must wait until: {format(machine.nextFreeDate, 'MMM d, yyyy')}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-sm">Available Windows</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {windowCount > 0 
                                  ? `${windowCount} gap${windowCount > 1 ? 's' : ''} between jobs (${totalIdleHours.toFixed(0)}h total)`
                                  : 'No gaps between scheduled jobs'
                                }
                              </p>
                            </div>
                            
                            {finiteWindows.length > 0 ? (
                              <ScrollArea className="h-48">
                                <div className="space-y-2 pr-3">
                                  {finiteWindows.map((window, idx) => (
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
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            ) : (
                              <div className="p-2 bg-muted rounded-md text-xs">
                                <p className="text-muted-foreground">
                                  No gaps between jobs. Next available after all jobs complete: {format(machine.nextFreeDate, 'MMM d, yyyy HH:mm')}
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
