import { useMemo } from 'react';
import { EnquiryLog } from '@/types/enquiryLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Inbox, 
  Search, 
  FileCheck, 
  Trophy, 
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

interface EnquiryWorkflowProps {
  enquiries: EnquiryLog[];
  onSelectEnquiry: (enquiry: EnquiryLog) => void;
  onUpdateStatus: (enquiryId: string, newStatus: string) => void;
}

const WORKFLOW_STAGES = [
  { 
    id: 'RECEIVED', 
    label: 'Received', 
    statuses: ['OPEN', 'NEW', ''], 
    icon: Inbox,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  { 
    id: 'IN REVIEW', 
    label: 'In Review', 
    statuses: ['IN REVIEW', 'IN PROGRESS', 'WIP', 'REVIEWING'], 
    icon: Search,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  { 
    id: 'QUOTED', 
    label: 'Quoted', 
    statuses: ['QUOTED', 'SUBMITTED'], 
    icon: FileCheck,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800'
  },
  { 
    id: 'WON', 
    label: 'Won', 
    statuses: ['WON', 'PO RECEIVED', 'ACCEPTED'], 
    icon: Trophy,
    color: 'bg-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  { 
    id: 'LOST', 
    label: 'Lost/On Hold', 
    statuses: ['LOST', 'ON HOLD', 'CANCELLED', 'DECLINED', 'HOLD'], 
    icon: XCircle,
    color: 'bg-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    borderColor: 'border-slate-200 dark:border-slate-800'
  },
];

export function EnquiryWorkflow({ enquiries, onSelectEnquiry, onUpdateStatus }: EnquiryWorkflowProps) {
  const groupedEnquiries = useMemo(() => {
    const groups: Record<string, EnquiryLog[]> = {};
    
    WORKFLOW_STAGES.forEach(stage => {
      groups[stage.id] = [];
    });

    enquiries.forEach(enquiry => {
      const status = enquiry.status?.toUpperCase() || '';
      let assigned = false;
      
      for (const stage of WORKFLOW_STAGES) {
        if (stage.statuses.some(s => s === status || status.includes(s))) {
          groups[stage.id].push(enquiry);
          assigned = true;
          break;
        }
      }
      
      // Default to RECEIVED if no match
      if (!assigned) {
        groups['RECEIVED'].push(enquiry);
      }
    });

    return groups;
  }, [enquiries]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd MMM');
    } catch {
      return '';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Stage Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2">
            {WORKFLOW_STAGES.map((stage, index) => {
              const count = groupedEnquiries[stage.id]?.length || 0;
              const Icon = stage.icon;
              return (
                <div key={stage.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full ${stage.color} flex items-center justify-center text-white mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">{stage.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {WORKFLOW_STAGES.map((stage) => {
          const stageEnquiries = groupedEnquiries[stage.id] || [];
          const Icon = stage.icon;
          
          return (
            <Card key={stage.id} className={`${stage.bgColor} ${stage.borderColor} border-2`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {stage.label}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {stageEnquiries.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[400px] pr-2">
                  <div className="space-y-2">
                    {stageEnquiries.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No enquiries
                      </p>
                    ) : (
                      stageEnquiries.map((enquiry) => (
                        <div
                          key={enquiry.id}
                          onClick={() => onSelectEnquiry(enquiry)}
                          className="p-3 bg-background rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-sm truncate">
                              {enquiry.enquiry_no}
                            </p>
                            {enquiry.priority && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                                {enquiry.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            {enquiry.customer || 'No customer'}
                          </p>
                          {enquiry.details && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {enquiry.details}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(enquiry.date_received)}
                            </div>
                            {enquiry.quoted_price_euro && (
                              <span className="text-emerald-600 font-medium">
                                {formatCurrency(enquiry.quoted_price_euro)}
                              </span>
                            )}
                          </div>
                          {enquiry.npi_owner && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">
                              {enquiry.npi_owner}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
