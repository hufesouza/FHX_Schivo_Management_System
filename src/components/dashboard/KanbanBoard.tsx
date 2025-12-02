import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar, FileText } from 'lucide-react';

interface WorkOrder {
  id: string;
  work_order_number: string | null;
  customer: string | null;
  part_and_rev: string | null;
  status: string;
  current_stage: string;
  created_at: string;
  updated_at: string;
}

interface KanbanBoardProps {
  workOrders: WorkOrder[];
}

const STAGES = [
  { key: 'header', label: 'New', color: 'bg-slate-500' },
  { key: 'engineering', label: 'Engineering', color: 'bg-blue-500' },
  { key: 'operations', label: 'Operations', color: 'bg-amber-500' },
  { key: 'quality', label: 'Quality', color: 'bg-purple-500' },
  { key: 'npi', label: 'NPI', color: 'bg-cyan-500' },
  { key: 'supply_chain', label: 'Supply Chain', color: 'bg-emerald-500' },
  { key: 'completed', label: 'Completed', color: 'bg-green-600' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function getDaysOpen(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function KanbanBoard({ workOrders }: KanbanBoardProps) {
  const navigate = useNavigate();

  // Group work orders by stage
  const groupedOrders = STAGES.reduce((acc, stage) => {
    if (stage.key === 'completed') {
      acc[stage.key] = workOrders.filter(wo => wo.status === 'completed');
    } else {
      acc[stage.key] = workOrders.filter(wo => 
        wo.current_stage === stage.key && wo.status !== 'completed'
      );
    }
    return acc;
  }, {} as Record<string, WorkOrder[]>);

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {STAGES.map((stage) => (
          <div key={stage.key} className="w-72 flex-shrink-0">
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`w-3 h-3 rounded-full ${stage.color}`} />
              <h3 className="font-medium text-sm">{stage.label}</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                {groupedOrders[stage.key]?.length || 0}
              </Badge>
            </div>

            {/* Column Content */}
            <div className="bg-muted/50 rounded-lg p-2 min-h-[400px] space-y-2">
              {groupedOrders[stage.key]?.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  No reviews
                </div>
              ) : (
                groupedOrders[stage.key]?.map((wo) => {
                  const daysOpen = getDaysOpen(wo.created_at);
                  const isOld = daysOpen > 7 && wo.status !== 'completed';
                  
                  return (
                    <Card 
                      key={wo.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isOld ? 'border-destructive/50 bg-destructive/5' : ''
                      }`}
                      onClick={() => navigate(`/work-order/${wo.id}`)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm truncate">
                            {wo.work_order_number || 'New Review'}
                          </div>
                          {isOld && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              {daysOpen}d
                            </Badge>
                          )}
                        </div>
                        
                        {wo.customer && (
                          <p className="text-xs text-muted-foreground truncate">
                            {wo.customer}
                          </p>
                        )}
                        
                        {wo.part_and_rev && (
                          <p className="text-xs text-muted-foreground truncate">
                            Part: {wo.part_and_rev}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(wo.updated_at)}
                          </div>
                          {wo.status !== 'completed' && (
                            <span className={isOld ? 'text-destructive' : ''}>
                              {daysOpen}d open
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
