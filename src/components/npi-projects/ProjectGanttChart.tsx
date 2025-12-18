import { useMemo, useState } from 'react';
import { format, differenceInDays, addDays, startOfDay, min, max, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Diamond, Calendar, ZoomIn, ZoomOut } from 'lucide-react';
import type { NPIDesignTransferItem, NPIProjectMilestone, NPIProject } from '@/types/npiProject';

interface ProjectGanttChartProps {
  project: NPIProject;
  designTransferItems: NPIDesignTransferItem[];
  milestones: NPIProjectMilestone[];
  onItemClick?: (item: NPIDesignTransferItem) => void;
  onMilestoneClick?: (milestone: NPIProjectMilestone) => void;
}

const PHASE_COLORS = {
  planning: { bg: 'bg-blue-500', light: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
  execution: { bg: 'bg-amber-500', light: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-700' },
  process_qualification: { bg: 'bg-purple-500', light: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700' },
};

const STATUS_COLORS = {
  not_started: 'bg-gray-300',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  not_applicable: 'bg-gray-400',
  pending: 'bg-gray-300',
  delayed: 'bg-red-500',
};

export function ProjectGanttChart({ 
  project, 
  designTransferItems, 
  milestones,
  onItemClick,
  onMilestoneClick 
}: ProjectGanttChartProps) {
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('week');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');

  // Calculate date range
  const { startDate, endDate, totalDays } = useMemo(() => {
    const dates: Date[] = [];
    
    // Add project dates
    if (project.start_date) {
      const d = parseISO(project.start_date);
      if (isValid(d)) dates.push(d);
    }
    if (project.target_completion_date) {
      const d = parseISO(project.target_completion_date);
      if (isValid(d)) dates.push(d);
    }
    
    // Add item due dates and completed dates
    designTransferItems.forEach(item => {
      if (item.due_date) {
        const d = parseISO(item.due_date);
        if (isValid(d)) dates.push(d);
      }
      if (item.completed_date) {
        const d = parseISO(item.completed_date);
        if (isValid(d)) dates.push(d);
      }
    });
    
    // Add milestone dates
    milestones.forEach(m => {
      if (m.target_date) {
        const d = parseISO(m.target_date);
        if (isValid(d)) dates.push(d);
      }
      if (m.actual_date) {
        const d = parseISO(m.actual_date);
        if (isValid(d)) dates.push(d);
      }
    });
    
    // Default to today + 90 days if no dates
    const today = startOfDay(new Date());
    if (dates.length === 0) {
      return {
        startDate: today,
        endDate: addDays(today, 90),
        totalDays: 90
      };
    }
    
    const minDate = min(dates);
    const maxDate = max(dates);
    
    // Add padding
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 14);
    
    return {
      startDate: start,
      endDate: end,
      totalDays: differenceInDays(end, start) + 1
    };
  }, [project, designTransferItems, milestones]);

  // Generate date columns based on zoom level
  const dateColumns = useMemo(() => {
    const columns: { date: Date; label: string; isMonday: boolean; isFirstOfMonth: boolean }[] = [];
    let currentDate = startDate;
    
    for (let i = 0; i < totalDays; i++) {
      columns.push({
        date: currentDate,
        label: format(currentDate, zoomLevel === 'day' ? 'dd' : 'd'),
        isMonday: currentDate.getDay() === 1,
        isFirstOfMonth: currentDate.getDate() === 1,
      });
      currentDate = addDays(currentDate, 1);
    }
    
    return columns;
  }, [startDate, totalDays, zoomLevel]);

  // Column width based on zoom
  const colWidth = zoomLevel === 'day' ? 40 : zoomLevel === 'week' ? 24 : 16;
  const rowHeight = 36;

  // Filter items by phase
  const filteredItems = selectedPhase === 'all' 
    ? designTransferItems 
    : designTransferItems.filter(item => item.phase === selectedPhase);

  const filteredMilestones = selectedPhase === 'all'
    ? milestones
    : milestones.filter(m => m.phase === selectedPhase);

  // Group items by phase for display
  const itemsByPhase = useMemo(() => {
    const groups: Record<string, NPIDesignTransferItem[]> = {
      planning: [],
      execution: [],
      process_qualification: [],
    };
    filteredItems.forEach(item => {
      if (groups[item.phase]) {
        groups[item.phase].push(item);
      }
    });
    return groups;
  }, [filteredItems]);

  // Calculate bar position for an item
  const getBarPosition = (item: NPIDesignTransferItem) => {
    const dueDate = item.due_date ? parseISO(item.due_date) : null;
    const completedDate = item.completed_date ? parseISO(item.completed_date) : null;
    const duration = item.estimated_duration_days || 5; // Default 5 days if not set
    
    if (!dueDate || !isValid(dueDate)) return null;
    
    // Calculate start date from due date and duration
    const startDateCalc = addDays(dueDate, -(duration - 1));
    
    // Use completed date if item is done, otherwise use due date as end
    const endDateDisplay = (item.status === 'completed' && completedDate && isValid(completedDate)) 
      ? completedDate 
      : dueDate;
    
    const startDay = differenceInDays(startDateCalc, startDate);
    const endDay = differenceInDays(endDateDisplay, startDate);
    
    // Bar width spans from start to end
    const width = Math.max(1, endDay - startDay + 1);
    const left = startDay;
    
    return { left, width, dueDate, completedDate, startDateCalc, duration };
  };

  // Calculate milestone position
  const getMilestonePosition = (milestone: NPIProjectMilestone) => {
    const targetDate = milestone.target_date ? parseISO(milestone.target_date) : null;
    const actualDate = milestone.actual_date ? parseISO(milestone.actual_date) : null;
    
    const displayDate = actualDate || targetDate;
    if (!displayDate || !isValid(displayDate)) return null;
    
    const dayOffset = differenceInDays(displayDate, startDate);
    return { left: dayOffset, date: displayDate, isActual: !!actualDate };
  };

  // Get today's position
  const todayPosition = differenceInDays(new Date(), startDate);

  // Generate month headers
  const monthHeaders = useMemo(() => {
    const headers: { month: string; startCol: number; span: number }[] = [];
    let currentMonth = '';
    let startCol = 0;
    let span = 0;

    dateColumns.forEach((col, idx) => {
      const monthYear = format(col.date, 'MMM yyyy');
      if (monthYear !== currentMonth) {
        if (currentMonth) {
          headers.push({ month: currentMonth, startCol, span });
        }
        currentMonth = monthYear;
        startCol = idx;
        span = 1;
      } else {
        span++;
      }
    });
    
    if (currentMonth) {
      headers.push({ month: currentMonth, startCol, span });
    }
    
    return headers;
  }, [dateColumns]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Timeline
            </CardTitle>
            <CardDescription>
              Gantt chart view of design transfer items and milestones
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="execution">Execution</SelectItem>
                <SelectItem value="process_qualification">Process Qualification</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setZoomLevel('month')}
                disabled={zoomLevel === 'month'}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs text-muted-foreground capitalize">{zoomLevel}</span>
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={() => setZoomLevel('day')}
                disabled={zoomLevel === 'day'}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Month Headers */}
            <div className="flex border-b bg-muted/30">
              <div className="w-[280px] shrink-0 px-3 py-1 border-r font-medium text-sm">
                Task
              </div>
              <div className="flex">
                {monthHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className="text-center text-xs font-medium py-1 border-r border-muted"
                    style={{ width: header.span * colWidth }}
                  >
                    {header.month}
                  </div>
                ))}
              </div>
            </div>

            {/* Date Headers */}
            <div className="flex border-b bg-muted/20">
              <div className="w-[280px] shrink-0 px-3 py-1 border-r text-xs text-muted-foreground">
                Owner / Due Date
              </div>
              <div className="flex relative">
                {dateColumns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`text-center text-xs py-1 border-r border-muted/50 ${
                      col.isMonday ? 'bg-muted/30 font-medium' : ''
                    } ${col.isFirstOfMonth ? 'border-l-2 border-l-muted-foreground/30' : ''}`}
                    style={{ width: colWidth }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="relative">
              {/* Today line */}
              {todayPosition >= 0 && todayPosition < totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ left: 280 + todayPosition * colWidth + colWidth / 2 }}
                >
                  <div className="absolute -top-6 -left-[22px] text-[10px] text-red-500 font-medium whitespace-nowrap">
                    Today
                  </div>
                </div>
              )}

              {/* Phase groups and items */}
              {Object.entries(itemsByPhase).map(([phase, items]) => {
                if (items.length === 0 && selectedPhase !== 'all') return null;
                const phaseColors = PHASE_COLORS[phase as keyof typeof PHASE_COLORS];
                const phaseMilestones = filteredMilestones.filter(m => m.phase === phase);
                
                return (
                  <div key={phase}>
                    {/* Phase header */}
                    <div className="flex border-b bg-muted/10">
                      <div className={`w-[280px] shrink-0 px-3 py-2 border-r font-medium text-sm flex items-center gap-2 ${phaseColors.text}`}>
                        <div className={`w-2 h-2 rounded-full ${phaseColors.bg}`} />
                        {phase === 'process_qualification' ? 'Process Qualification' : phase.charAt(0).toUpperCase() + phase.slice(1)}
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {items.length} items
                        </Badge>
                      </div>
                      <div className="flex-1" style={{ width: totalDays * colWidth }} />
                    </div>

                    {/* Items */}
                    {items.map((item, idx) => {
                      const barPos = getBarPosition(item);
                      const isLate = item.due_date && 
                        item.status !== 'completed' && 
                        item.status !== 'not_applicable' &&
                        new Date(item.due_date) < new Date();
                      
                      return (
                        <div
                          key={item.id}
                          className={`flex border-b hover:bg-muted/20 cursor-pointer transition-colors ${
                            idx % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                          }`}
                          style={{ height: rowHeight }}
                          onClick={() => onItemClick?.(item)}
                        >
                          <div className="w-[280px] shrink-0 px-3 py-1 border-r flex items-center gap-2 overflow-hidden">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs truncate font-medium">
                                      {item.item_name}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {item.owner_name || 'Unassigned'} • {item.estimated_duration_days || 5}d • {item.due_date ? format(parseISO(item.due_date), 'MMM d') : 'No date'}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="font-medium">{item.item_name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{item.description || 'No description'}</p>
                                  <div className="text-xs mt-2 space-y-1">
                                    <p>Owner: {item.owner_name || 'Unassigned'}</p>
                                    <p>Duration: {item.estimated_duration_days || 5} days</p>
                                    <p>Due: {item.due_date ? format(parseISO(item.due_date), 'MMM d, yyyy') : 'Not set'}</p>
                                    <p>Status: {item.status.replace('_', ' ')}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Badge 
                              variant={item.status === 'completed' ? 'default' : 
                                item.status === 'in_progress' ? 'secondary' : 'outline'}
                              className="text-[10px] shrink-0"
                            >
                              {item.status === 'not_started' ? 'Todo' : 
                                item.status === 'in_progress' ? 'WIP' :
                                item.status === 'completed' ? 'Done' : 'N/A'}
                            </Badge>
                          </div>
                          <div 
                            className="relative flex-1"
                            style={{ width: totalDays * colWidth }}
                          >
                            {/* Grid lines */}
                            {dateColumns.map((col, colIdx) => (
                              <div
                                key={colIdx}
                                className={`absolute top-0 bottom-0 border-r border-muted/30 ${
                                  col.isMonday ? 'border-muted/50' : ''
                                }`}
                                style={{ left: colIdx * colWidth, width: colWidth }}
                              />
                            ))}
                            
                            {/* Bar */}
                            {barPos && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-sm transition-all ${
                                        STATUS_COLORS[item.status as keyof typeof STATUS_COLORS]
                                      } ${isLate ? 'ring-2 ring-red-500 ring-offset-1' : ''}`}
                                      style={{
                                        left: barPos.left * colWidth + 2,
                                        width: Math.max(barPos.width * colWidth - 4, 8),
                                      }}
                                    >
                                      {barPos.width > 2 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-medium truncate px-1">
                                          {barPos.duration}d
                                        </span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">{item.item_name}</p>
                                    <p className="text-xs">Start: {format(barPos.startDateCalc, 'MMM d, yyyy')}</p>
                                    <p className="text-xs">Due: {format(barPos.dueDate, 'MMM d, yyyy')}</p>
                                    <p className="text-xs text-muted-foreground">Duration: {barPos.duration} days</p>
                                    {barPos.completedDate && (
                                      <p className="text-xs text-green-500">
                                        Completed: {format(barPos.completedDate, 'MMM d, yyyy')}
                                      </p>
                                    )}
                                    {isLate && (
                                      <p className="text-xs text-red-500 mt-1">⚠️ Overdue</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Milestones for this phase */}
                    {phaseMilestones.map((milestone) => {
                      const pos = getMilestonePosition(milestone);
                      
                      return (
                        <div
                          key={milestone.id}
                          className="flex border-b bg-muted/5 hover:bg-muted/20 cursor-pointer"
                          style={{ height: rowHeight }}
                          onClick={() => onMilestoneClick?.(milestone)}
                        >
                          <div className="w-[280px] shrink-0 px-3 py-1 border-r flex items-center gap-2 overflow-hidden">
                            <Diamond className="h-3 w-3 text-amber-500 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs truncate font-medium text-amber-700">
                                {milestone.milestone_name}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Target: {milestone.target_date ? format(parseISO(milestone.target_date), 'MMM d') : 'Not set'}
                              </div>
                            </div>
                            <Badge 
                              variant={milestone.status === 'completed' ? 'default' : 
                                milestone.status === 'delayed' ? 'destructive' : 'outline'}
                              className="text-[10px] shrink-0"
                            >
                              {milestone.status}
                            </Badge>
                          </div>
                          <div 
                            className="relative flex-1"
                            style={{ width: totalDays * colWidth }}
                          >
                            {/* Grid lines */}
                            {dateColumns.map((col, colIdx) => (
                              <div
                                key={colIdx}
                                className={`absolute top-0 bottom-0 border-r border-muted/30`}
                                style={{ left: colIdx * colWidth, width: colWidth }}
                              />
                            ))}
                            
                            {/* Milestone diamond */}
                            {pos && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rotate-45 ${
                                        milestone.status === 'completed' ? 'bg-green-500' :
                                        milestone.status === 'delayed' ? 'bg-red-500' : 'bg-amber-500'
                                      } ring-2 ring-white`}
                                      style={{ left: pos.left * colWidth + colWidth / 2 }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">{milestone.milestone_name}</p>
                                    <p className="text-xs">Target: {milestone.target_date ? format(parseISO(milestone.target_date), 'MMM d, yyyy') : 'Not set'}</p>
                                    {milestone.actual_date && (
                                      <p className="text-xs text-green-500">
                                        Actual: {format(parseISO(milestone.actual_date), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Project completion target */}
              {project.target_completion_date && (
                <div className="flex border-b bg-green-50 dark:bg-green-950/20">
                  <div className="w-[280px] shrink-0 px-3 py-2 border-r flex items-center gap-2">
                    <Diamond className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-green-700 dark:text-green-400">
                        Target Delivery
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(project.target_completion_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div 
                    className="relative flex-1"
                    style={{ width: totalDays * colWidth, height: rowHeight }}
                  >
                    {(() => {
                      const targetPos = differenceInDays(parseISO(project.target_completion_date), startDate);
                      if (targetPos < 0 || targetPos >= totalDays) return null;
                      return (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-green-600"
                          style={{ left: targetPos * colWidth + colWidth / 2 }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rotate-45 bg-green-600 ring-2 ring-white" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Legend */}
        <div className="px-4 py-3 border-t bg-muted/10 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-300 rounded-sm" />
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-500 rounded-sm ring-2 ring-red-500 ring-offset-1" />
            <span>Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rotate-45 bg-amber-500" />
            <span>Milestone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-red-500" />
            <span>Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
