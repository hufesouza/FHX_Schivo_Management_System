import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MachineSchedule, CleanedJob } from '@/types/capacity';
import { format, differenceInHours, addHours, differenceInDays, startOfDay, endOfDay, addDays, addWeeks, addMonths, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Clock, Calendar, AlertTriangle, TrendingUp, Info, Search, CheckCircle2, XCircle, ChevronLeft, ChevronRight, PieChart, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useMemo } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const HOURS_PER_DAY = 24; // 24 hours per machine per day

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

function findAllSlotsForJob(machine: MachineSchedule, requiredHours: number): IdleWindow[] {
  const windows = calculateIdleWindows(machine);
  return windows.filter(w => w.durationHours >= requiredHours);
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
  const [openUtilPopover, setOpenUtilPopover] = useState<string | null>(null);
  const [openDeptPopover, setOpenDeptPopover] = useState<string | null>(null);
  const [searchHours, setSearchHours] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, IdleWindow[]>>({});
  const [currentSlotIndex, setCurrentSlotIndex] = useState<Record<string, number>>({});
  
  // Date range filtering - default to current month
  const now = new Date();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(now));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(now));
  const [activePreset, setActivePreset] = useState<string | null>('month');

  const handlePreset = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    setActivePreset(preset);
    
    switch (preset) {
      case 'today':
        setDateFrom(startOfDay(now));
        setDateTo(endOfDay(now));
        break;
      case 'week':
        setDateFrom(startOfWeek(now, { weekStartsOn: 1 }));
        setDateTo(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'month':
        setDateFrom(startOfMonth(now));
        setDateTo(endOfMonth(now));
        break;
    }
  };

  // Calculate the date range period (consistent for all machines)
  const dateRangeDays = useMemo(() => {
    if (dateFrom && dateTo) {
      return Math.max(1, differenceInDays(dateTo, dateFrom) + 1);
    }
    return 0;
  }, [dateFrom, dateTo]);
  
  const dateRangeAvailableHours = dateRangeDays * HOURS_PER_DAY;

  // Filter machines and jobs based on date range - use SAME available hours for all machines
  const filteredMachines = useMemo(() => {
    if (!dateFrom || !dateTo) {
      // No filter = show all but can't calculate meaningful utilization
      return machines.map(machine => ({
        ...machine,
        totalScheduledHours: machine.jobs.reduce((sum, job) => 
          sum + differenceInHours(new Date(job.End_DateTime), new Date(job.Start_DateTime)), 0
        ),
        utilization: 0,
      }));
    }
    
    return machines.map(machine => {
      // Filter jobs that overlap with the date range
      const filteredJobs = machine.jobs.filter(job => {
        const jobStart = new Date(job.Start_DateTime);
        const jobEnd = new Date(job.End_DateTime);
        return jobStart <= dateTo && jobEnd >= dateFrom;
      });
      
      // Calculate total scheduled hours (clip to date range)
      const totalScheduledHours = filteredJobs.reduce((sum, job) => {
        const jobStart = new Date(job.Start_DateTime);
        const jobEnd = new Date(job.End_DateTime);
        const effectiveStart = jobStart < dateFrom ? dateFrom : jobStart;
        const effectiveEnd = jobEnd > dateTo ? dateTo : jobEnd;
        return sum + Math.max(0, differenceInHours(effectiveEnd, effectiveStart));
      }, 0);
      
      // Use the SAME available hours for all machines (based on date filter)
      const utilization = dateRangeAvailableHours > 0 
        ? (totalScheduledHours / dateRangeAvailableHours) * 100 
        : 0;
      
      return {
        ...machine,
        jobs: filteredJobs,
        totalScheduledHours,
        utilization: Math.min(100, utilization),
      };
    });
  }, [machines, dateFrom, dateTo, dateRangeAvailableHours]);
  
  // Calculate department-level capacity metrics using the date filter range
  const departmentMetrics = useMemo(() => {
    if (!dateFrom || !dateTo) {
      return {
        totalMachines: machines.length,
        totalDays: 0,
        totalAvailableHours: 0,
        totalBookedHours: 0,
        totalFreeHours: 0,
        overallUtilization: 0,
        earliestStart: null,
        latestEnd: null,
      };
    }
    
    const totalDays = dateRangeDays;
    const totalAvailableHours = machines.length * dateRangeAvailableHours;
    const totalBookedHours = filteredMachines.reduce((sum, m) => sum + m.totalScheduledHours, 0);
    const totalFreeHours = Math.max(0, totalAvailableHours - totalBookedHours);
    const overallUtilization = totalAvailableHours > 0 ? (totalBookedHours / totalAvailableHours) * 100 : 0;
    
    return {
      totalMachines: machines.length,
      totalDays,
      totalAvailableHours,
      totalBookedHours,
      totalFreeHours,
      overallUtilization,
      earliestStart: dateFrom,
      latestEnd: dateTo,
    };
  }, [machines.length, dateFrom, dateTo, dateRangeDays, dateRangeAvailableHours, filteredMachines]);
  
  const totalHours = filteredMachines.reduce((sum, m) => sum + m.totalScheduledHours, 0);
  const avgUtilization = filteredMachines.length > 0 
    ? filteredMachines.reduce((sum, m) => sum + m.utilization, 0) / filteredMachines.length 
    : 0;
  
  const bottlenecks = filteredMachines
    .filter(m => m.utilization > 90 || filteredMachines.indexOf(m) < 3)
    .slice(0, 3);

  const handleFindSlot = (machine: MachineSchedule) => {
    const hours = parseFloat(searchHours[machine.machine] || '0');
    if (hours <= 0) return;
    
    const slots = findAllSlotsForJob(machine, hours);
    setSearchResults(prev => ({ ...prev, [machine.machine]: slots }));
    setCurrentSlotIndex(prev => ({ ...prev, [machine.machine]: 0 }));
  };

  const handleNextSlot = (machineName: string) => {
    const slots = searchResults[machineName] || [];
    const currentIndex = currentSlotIndex[machineName] || 0;
    if (currentIndex < slots.length - 1) {
      setCurrentSlotIndex(prev => ({ ...prev, [machineName]: currentIndex + 1 }));
    }
  };

  const handlePrevSlot = (machineName: string) => {
    const currentIndex = currentSlotIndex[machineName] || 0;
    if (currentIndex > 0) {
      setCurrentSlotIndex(prev => ({ ...prev, [machineName]: currentIndex - 1 }));
    }
  };
  
  // Calculate utilization breakdown for a machine using the date range
  const getUtilizationBreakdown = (machine: MachineSchedule) => {
    if (!dateFrom || !dateTo) {
      return {
        schedulePeriodDays: 0,
        availableHours: 0,
        bookedHours: 0,
        freeHours: 0,
        utilizationPercent: 0,
        dateFrom: null,
        dateTo: null,
      };
    }
    
    const availableHours = dateRangeAvailableHours;
    const bookedHours = machine.totalScheduledHours;
    const freeHours = Math.max(0, availableHours - bookedHours);
    const utilizationPercent = availableHours > 0 ? (bookedHours / availableHours) * 100 : 0;
    
    return {
      schedulePeriodDays: dateRangeDays,
      availableHours,
      bookedHours,
      freeHours,
      utilizationPercent,
      dateFrom,
      dateTo,
    };
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Presets */}
            <div className="flex gap-2">
              <Button 
                variant={activePreset === 'today' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handlePreset('today')}
              >
                Today
              </Button>
              <Button 
                variant={activePreset === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handlePreset('week')}
              >
                This Week
              </Button>
              <Button 
                variant={activePreset === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => handlePreset('month')}
              >
                This Month
              </Button>
            </div>
            
            <div className="h-6 w-px bg-border" />
            
            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date ? startOfDay(date) : undefined);
                      setActivePreset(null);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-muted-foreground">→</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date ? endOfDay(date) : undefined);
                      setActivePreset(null);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              {(dateFrom || dateTo) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                    setActivePreset(null);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
            
            {/* Active filter indicator */}
            {(dateFrom || dateTo) && (
              <Badge variant="secondary" className="ml-auto">
                Showing: {dateFrom ? format(dateFrom, "MMM d") : "Start"} - {dateTo ? format(dateTo, "MMM d, yyyy") : "End"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Department Capacity Summary */}
      {departmentMetrics && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Department Capacity Overview
            </CardTitle>
            <CardDescription>
              {departmentMetrics.totalMachines} machines × {HOURS_PER_DAY}h/day × {departmentMetrics.totalDays} days
              {departmentMetrics.earliestStart && departmentMetrics.latestEnd && (
                <span className="ml-2">
                  ({format(departmentMetrics.earliestStart, 'MMM d')} - {format(departmentMetrics.latestEnd, 'MMM d, yyyy')})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {/* Total Available */}
              <Popover open={openDeptPopover === 'available'} onOpenChange={(open) => setOpenDeptPopover(open ? 'available' : null)}>
                <PopoverTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/80 cursor-pointer hover:bg-background/90 transition-colors">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Total Available <Info className="h-3 w-3" />
                    </p>
                    <p className="text-xl font-bold">{departmentMetrics.totalAvailableHours.toLocaleString()}h</p>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Total Available Hours</h4>
                    <p className="text-xs text-muted-foreground">
                      Maximum theoretical capacity if all machines run 24/7 during the schedule period.
                    </p>
                    <div className="p-2 bg-muted rounded-md text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Machines:</span>
                        <span className="font-medium">{departmentMetrics.totalMachines}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hours per day:</span>
                        <span className="font-medium">{HOURS_PER_DAY}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Days in schedule:</span>
                        <span className="font-medium">{departmentMetrics.totalDays}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t font-semibold">
                        <span>Total:</span>
                        <span>{departmentMetrics.totalMachines} × {HOURS_PER_DAY} × {departmentMetrics.totalDays} = {departmentMetrics.totalAvailableHours.toLocaleString()}h</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Booked Hours */}
              <Popover open={openDeptPopover === 'booked'} onOpenChange={(open) => setOpenDeptPopover(open ? 'booked' : null)}>
                <PopoverTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/80 cursor-pointer hover:bg-background/90 transition-colors">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Booked Hours <Info className="h-3 w-3" />
                    </p>
                    <p className="text-xl font-bold text-amber-600">{departmentMetrics.totalBookedHours.toFixed(0)}h</p>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Booked Hours</h4>
                    <p className="text-xs text-muted-foreground">
                      Total hours allocated to jobs across all {departmentMetrics.totalMachines} machines.
                    </p>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total job hours:</span>
                        <span className="font-medium text-amber-600">{departmentMetrics.totalBookedHours.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg per machine:</span>
                        <span className="font-medium">{(departmentMetrics.totalBookedHours / departmentMetrics.totalMachines).toFixed(1)}h</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is the sum of all job durations scheduled on machines in this department.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Free Hours */}
              <Popover open={openDeptPopover === 'free'} onOpenChange={(open) => setOpenDeptPopover(open ? 'free' : null)}>
                <PopoverTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/80 cursor-pointer hover:bg-background/90 transition-colors">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Free Hours <Info className="h-3 w-3" />
                    </p>
                    <p className="text-xl font-bold text-green-600">{departmentMetrics.totalFreeHours.toFixed(0)}h</p>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Free Hours</h4>
                    <p className="text-xs text-muted-foreground">
                      Remaining capacity available for new jobs during the schedule period.
                    </p>
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-md text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available:</span>
                        <span className="font-medium">{departmentMetrics.totalAvailableHours.toLocaleString()}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Booked:</span>
                        <span className="font-medium text-amber-600">- {departmentMetrics.totalBookedHours.toFixed(0)}h</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t font-semibold">
                        <span>Free:</span>
                        <span className="text-green-600">{departmentMetrics.totalFreeHours.toFixed(0)}h</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Free hours may not be contiguous - use "Find Slot" on individual machines to see available windows.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Overall Utilization */}
              <Popover open={openDeptPopover === 'utilization'} onOpenChange={(open) => setOpenDeptPopover(open ? 'utilization' : null)}>
                <PopoverTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/80 cursor-pointer hover:bg-background/90 transition-colors">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Overall Utilization <Info className="h-3 w-3" />
                    </p>
                    <p className="text-xl font-bold">{departmentMetrics.overallUtilization.toFixed(1)}%</p>
                    <Progress value={departmentMetrics.overallUtilization} className="mt-1 h-2" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Overall Utilization</h4>
                    <p className="text-xs text-muted-foreground">
                      Percentage of total available capacity that is booked with jobs.
                    </p>
                    <div className="p-2 bg-primary/10 rounded-md text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Formula:</span>
                        <span className="font-medium">Booked ÷ Available × 100</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span className="text-muted-foreground">Calculation:</span>
                        <span className="font-medium">{departmentMetrics.totalBookedHours.toFixed(0)}h ÷ {departmentMetrics.totalAvailableHours.toLocaleString()}h</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Result:</span>
                        <span>{departmentMetrics.overallUtilization.toFixed(1)}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {departmentMetrics.overallUtilization < 50 
                        ? "Low utilization indicates significant spare capacity for new work."
                        : departmentMetrics.overallUtilization < 80
                        ? "Moderate utilization - healthy balance of work and flexibility."
                        : "High utilization - limited capacity for additional work."
                      }
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

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
              Across {filteredMachines.length} machines
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
            <div className="text-2xl font-bold">{filteredMachines.length}</div>
            <p className="text-xs text-muted-foreground">
              {dateFrom || dateTo ? 'With jobs in range' : 'Active in schedule'}
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
            {filteredMachines.map((machine) => {
              const isBottleneck = machine.utilization > 90;
              const isSelected = selectedMachine === machine.machine;
              const { totalIdleHours, windowCount } = getNextAvailability(machine);
              const allWindows = calculateIdleWindows(machine);
              const finiteWindows = allWindows.filter(w => w.beforeJob !== null);
              const searchResult = searchResults[machine.machine];
              const utilBreakdown = getUtilizationBreakdown(machine);
              
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
                      <span className="text-muted-foreground">Booked / Available</span>
                      <span className="font-medium">
                        <span className="text-amber-600">{machine.totalScheduledHours.toFixed(0)}h</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-green-600">{utilBreakdown.availableHours.toFixed(0)}h</span>
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Utilization</span>
                      <Popover open={openUtilPopover === machine.machine} onOpenChange={(open) => setOpenUtilPopover(open ? machine.machine : null)}>
                        <PopoverTrigger asChild>
                          <button 
                            className={`font-medium flex items-center gap-1 hover:underline ${machine.utilization > 90 ? 'text-amber-600' : machine.utilization > 70 ? 'text-green-600' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenUtilPopover(openUtilPopover === machine.machine ? null : machine.machine);
                            }}
                          >
                            {machine.utilization.toFixed(1)}%
                            <Info className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Utilization Breakdown</h4>
                            <p className="text-xs text-muted-foreground">
                              How {machine.utilization.toFixed(1)}% utilization is calculated:
                            </p>
                            
                            <div className="space-y-2 text-sm">
                              <div className="p-2 bg-muted rounded-md space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Schedule Period:</span>
                                  <span className="font-medium">{utilBreakdown.schedulePeriodDays} days</span>
                                </div>
                                {utilBreakdown.dateFrom && utilBreakdown.dateTo && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(utilBreakdown.dateFrom, 'MMM d')} → {format(utilBreakdown.dateTo, 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                              
                              <div className="p-2 bg-muted rounded-md space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Available Hours:</span>
                                  <span className="font-medium">{utilBreakdown.availableHours.toFixed(0)}h</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {utilBreakdown.schedulePeriodDays} days × {HOURS_PER_DAY}h/day
                                </p>
                              </div>
                              
                              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Booked Hours:</span>
                                  <span className="font-medium text-amber-600">{utilBreakdown.bookedHours.toFixed(1)}h</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Sum of all job durations
                                </p>
                              </div>
                              
                              <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-md space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Free Hours:</span>
                                  <span className="font-medium text-green-600">{utilBreakdown.freeHours.toFixed(1)}h</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Available - Booked
                                </p>
                              </div>
                              
                              <div className="p-2 bg-primary/10 rounded-md">
                                <div className="flex justify-between font-semibold">
                                  <span>Utilization:</span>
                                  <span>{utilBreakdown.utilizationPercent.toFixed(1)}%</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {utilBreakdown.bookedHours.toFixed(0)}h ÷ {utilBreakdown.availableHours.toFixed(0)}h × 100
                                </p>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
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
                          setCurrentSlotIndex(prev => ({ ...prev, [machine.machine]: 0 }));
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
                              {searchResult && searchResult.length > 0 && (
                                <div className="p-2 rounded-md text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                                  {(() => {
                                    const slotIndex = currentSlotIndex[machine.machine] || 0;
                                    const currentSlot = searchResult[slotIndex];
                                    const totalSlots = searchResult.length;
                                    
                                    return (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Slot {slotIndex + 1} of {totalSlots}
                                          </p>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() => handlePrevSlot(machine.machine)}
                                              disabled={slotIndex === 0}
                                            >
                                              <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() => handleNextSlot(machine.machine)}
                                              disabled={slotIndex >= totalSlots - 1}
                                            >
                                              <ChevronRight className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-muted-foreground">
                                            <span className="font-medium">Start:</span> {format(currentSlot.start, 'MMM d, yyyy HH:mm')}
                                          </p>
                                          <p className="text-muted-foreground">
                                            <span className="font-medium">Available:</span> {currentSlot.durationHours >= 8760 
                                              ? 'Open-ended (after last job)' 
                                              : `${currentSlot.durationHours}h window`
                                            }
                                          </p>
                                          {currentSlot.afterJob && (
                                            <p className="text-muted-foreground pt-1 border-t border-green-200 dark:border-green-800">
                                              After: {currentSlot.afterJob.Item_Name || currentSlot.afterJob.Process_Order}
                                            </p>
                                          )}
                                          {currentSlot.beforeJob && (
                                            <p className="text-muted-foreground">
                                              Before: {currentSlot.beforeJob.Item_Name || currentSlot.beforeJob.Process_Order}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                              
                              {searchResult && searchResult.length === 0 && (
                                <div className="p-2 rounded-md text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                  <p className="text-red-700 dark:text-red-400 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    No slot large enough found. Job must wait until: {format(machine.nextFreeDate, 'MMM d, yyyy')}
                                  </p>
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
