import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NPI_PHASES, NPIPhaseTask, NPIProjectMilestone, calculatePhaseProgress, getPhaseInfo } from '@/types/npiProject';

interface ProjectGanttChartProps {
  tasks: NPIPhaseTask[];
  milestones: NPIProjectMilestone[];
  currentPhase: string;
  onPhaseClick?: (phase: string) => void;
}

export function ProjectGanttChart({ tasks, milestones, currentPhase, onPhaseClick }: ProjectGanttChartProps) {
  const activePhases = NPI_PHASES.filter(p => !['completed', 'on_hold', 'cancelled'].includes(p.value));
  
  const phaseData = useMemo(() => {
    return activePhases.map((phase, idx) => {
      const progress = calculatePhaseProgress(tasks, phase.value);
      const currentIdx = activePhases.findIndex(p => p.value === currentPhase);
      const isPast = idx < currentIdx;
      const isCurrent = phase.value === currentPhase;
      const isFuture = idx > currentIdx;
      const milestone = milestones.find(m => m.phase === phase.value);
      
      return {
        ...phase,
        progress,
        isPast,
        isCurrent,
        isFuture,
        milestone,
      };
    });
  }, [tasks, milestones, currentPhase, activePhases]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Project Timeline (Phases A-I)</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Timeline visualization */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full" />
          
          {/* Phase nodes */}
          <div className="relative flex justify-between">
            {phaseData.map((phase, idx) => (
              <div
                key={phase.value}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => onPhaseClick?.(phase.value)}
              >
                {/* Node */}
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold
                    transition-all group-hover:scale-110 z-10
                    ${phase.isPast ? 'bg-green-500 text-white' : ''}
                    ${phase.isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' : ''}
                    ${phase.isFuture ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {phase.progress.status === 'completed' ? '✓' : phase.shortLabel}
                </div>
                
                {/* Phase label */}
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${phase.isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    Phase {phase.value.charAt(0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground max-w-[60px] truncate">
                    {phase.shortLabel}
                  </div>
                </div>
                
                {/* Progress indicator */}
                {!phase.isFuture && (
                  <div className="mt-1">
                    <Badge 
                      variant={phase.progress.status === 'completed' ? 'default' : 'secondary'}
                      className="text-[10px] px-1"
                    >
                      {phase.progress.progress_percent}%
                    </Badge>
                  </div>
                )}
                
                {/* Milestone indicator */}
                {phase.milestone && phase.milestone.target_date && (
                  <div className="text-[9px] text-muted-foreground mt-1">
                    {new Date(phase.milestone.target_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="mt-6 pt-4 border-t grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {phaseData.filter(p => p.progress.status === 'completed').length}
            </div>
            <div className="text-xs text-muted-foreground">Phases Done</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              {tasks.filter(t => t.status === 'completed' || t.status === 'not_applicable').length}
            </div>
            <div className="text-xs text-muted-foreground">Tasks Done</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {tasks.filter(t => t.status === 'blocked').length}
            </div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
