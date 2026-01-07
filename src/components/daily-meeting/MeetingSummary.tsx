import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  TrendingUp,
  RefreshCw,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FlagStatus = 'none' | 'green' | 'amber' | 'red';
type ActionStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
type ActionPriority = 'low' | 'medium' | 'high' | 'critical';

interface FlagData {
  [key: string]: { status: FlagStatus; comment: string };
}

interface ActionItem {
  id: string;
  action: string;
  owner_id: string | null;
  owner_name: string | null;
  priority: ActionPriority;
  due_date: string | null;
  status: ActionStatus;
  comments: string | null;
}

interface Recognition {
  recognized_user_name: string;
  reason: string;
  recognized_by_name: string;
}

interface Topic {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface OverdueAction {
  id: string;
  action: string;
  owner_name: string | null;
  due_date: string;
  days_overdue: number;
  meeting_date: string;
}

interface MeetingSummaryProps {
  currentDate: Date;
  flags: FlagData;
  actions: ActionItem[];
  recognitions: Recognition[];
  topics: Topic[];
  customers: Customer[];
  meetingId: string | null;
}

export function MeetingSummary({
  currentDate,
  flags,
  actions,
  recognitions,
  topics,
  customers,
  meetingId
}: MeetingSummaryProps) {
  const { toast } = useToast();
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [overdueActions, setOverdueActions] = useState<OverdueAction[]>([]);
  const [loadingOverdue, setLoadingOverdue] = useState(true);

  // Fetch overdue actions from previous days
  useEffect(() => {
    const fetchOverdueActions = async () => {
      setLoadingOverdue(true);
      try {
        const todayStr = format(currentDate, 'yyyy-MM-dd');
        
        // Get all non-completed actions from previous meetings that are overdue
        const { data: meetings, error: meetingsError } = await supabase
          .from('daily_meetings')
          .select('id, meeting_date')
          .lt('meeting_date', todayStr)
          .order('meeting_date', { ascending: false })
          .limit(30); // Look back 30 days

        if (meetingsError) throw meetingsError;

        if (meetings && meetings.length > 0) {
          const meetingIds = meetings.map(m => m.id);
          const meetingDateMap = meetings.reduce((acc, m) => {
            acc[m.id] = m.meeting_date;
            return acc;
          }, {} as Record<string, string>);

          const { data: pastActions, error: actionsError } = await supabase
            .from('meeting_actions')
            .select('*')
            .in('meeting_id', meetingIds)
            .in('status', ['open', 'in_progress'])
            .not('due_date', 'is', null);

          if (actionsError) throw actionsError;

          if (pastActions) {
            const overdue = pastActions
              .filter(a => {
                if (!a.due_date) return false;
                const dueDate = parseISO(a.due_date);
                return dueDate < currentDate;
              })
              .map(a => ({
                id: a.id,
                action: a.action,
                owner_name: a.owner_name,
                due_date: a.due_date!,
                days_overdue: differenceInDays(currentDate, parseISO(a.due_date!)),
                meeting_date: meetingDateMap[a.meeting_id]
              }))
              .sort((a, b) => b.days_overdue - a.days_overdue);

            setOverdueActions(overdue);
          }
        }
      } catch (error) {
        console.error('Error fetching overdue actions:', error);
      }
      setLoadingOverdue(false);
    };

    fetchOverdueActions();
  }, [currentDate]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    // Actions per engineer (today's meeting)
    const actionsByOwner: Record<string, number> = {};
    actions.forEach(a => {
      const owner = a.owner_name || 'Unassigned';
      actionsByOwner[owner] = (actionsByOwner[owner] || 0) + 1;
    });

    // Amber/Red topics aging (topics that have been amber or red)
    const issueTopics: { topic: string; customer: string; status: FlagStatus; comment: string }[] = [];
    Object.entries(flags).forEach(([key, value]) => {
      if (value.status === 'amber' || value.status === 'red') {
        const [topicId, customerId] = key.split('|');
        const topic = topics.find(t => t.id === topicId);
        const customer = customers.find(c => c.id === customerId);
        if (topic && customer) {
          issueTopics.push({
            topic: topic.name,
            customer: customer.name,
            status: value.status,
            comment: value.comment
          });
        }
      }
    });

    // Count by status
    const totalFlags = Object.values(flags).filter(f => f.status !== 'none').length;
    const greenCount = Object.values(flags).filter(f => f.status === 'green').length;
    const amberCount = Object.values(flags).filter(f => f.status === 'amber').length;
    const redCount = Object.values(flags).filter(f => f.status === 'red').length;

    // Action status distribution
    const openActions = actions.filter(a => a.status === 'open').length;
    const inProgressActions = actions.filter(a => a.status === 'in_progress').length;
    const completedActions = actions.filter(a => a.status === 'completed').length;

    return {
      actionsByOwner,
      issueTopics,
      totalFlags,
      greenCount,
      amberCount,
      redCount,
      openActions,
      inProgressActions,
      completedActions,
      totalActions: actions.length
    };
  }, [flags, actions, topics, customers]);

  const generateSummary = async () => {
    if (!meetingId && Object.keys(flags).length === 0 && actions.length === 0) {
      toast({
        title: 'No data to summarize',
        description: 'Add some status flags or actions first.',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      // Prepare data for AI
      const flagsArray = Object.entries(flags).map(([key, value]) => {
        const [topicId, customerId] = key.split('|');
        const topic = topics.find(t => t.id === topicId);
        const customer = customers.find(c => c.id === customerId);
        return {
          topic: topic?.name || 'Unknown',
          customer: customer?.name || 'Unknown',
          status: value.status,
          comment: value.comment
        };
      });

      const { data, error } = await supabase.functions.invoke('meeting-summary', {
        body: {
          flags: flagsArray,
          actions: actions.map(a => ({
            action: a.action,
            owner_name: a.owner_name,
            priority: a.priority,
            due_date: a.due_date,
            status: a.status
          })),
          recognitions: recognitions.map(r => ({
            recognized_user_name: r.recognized_user_name,
            reason: r.reason,
            recognized_by_name: r.recognized_by_name
          })),
          meetingDate: format(currentDate, 'MMMM d, yyyy')
        }
      });

      if (error) throw error;

      if (data?.summary) {
        setAiSummary(data.summary);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Failed to generate summary',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    }
    setGenerating(false);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Meeting Summary & KPIs</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateSummary}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1 text-yellow-500" />
                Generate Summary
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Status Overview */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{kpis.greenCount}</div>
            <div className="text-xs text-muted-foreground">🟢 Good</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{kpis.amberCount}</div>
            <div className="text-xs text-muted-foreground">🟡 Attention</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{kpis.redCount}</div>
            <div className="text-xs text-muted-foreground">🔴 At Risk</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{kpis.totalActions}</div>
            <div className="text-xs text-muted-foreground">Actions Today</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{kpis.openActions}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{overdueActions.length}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>

        {/* Two Column Layout for Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Actions by Engineer */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Actions by Engineer
            </h4>
            <div className="space-y-2">
              {Object.entries(kpis.actionsByOwner).length > 0 ? (
                Object.entries(kpis.actionsByOwner)
                  .sort((a, b) => b[1] - a[1])
                  .map(([owner, count]) => (
                    <div 
                      key={owner} 
                      className="flex items-center justify-between bg-muted/50 rounded px-3 py-2"
                    >
                      <span className="text-sm">{owner}</span>
                      <span className="text-sm font-medium bg-primary/10 px-2 py-0.5 rounded">
                        {count} action{count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">No actions assigned yet</p>
              )}
            </div>
          </div>

          {/* Issues Requiring Attention */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Issues Requiring Attention
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {kpis.issueTopics.length > 0 ? (
                kpis.issueTopics.map((issue, idx) => (
                  <div 
                    key={idx} 
                    className={`rounded px-3 py-2 ${
                      issue.status === 'red' 
                        ? 'bg-red-50 dark:bg-red-950/30 border-l-2 border-red-500' 
                        : 'bg-yellow-50 dark:bg-yellow-950/30 border-l-2 border-yellow-500'
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {issue.customer} - {issue.topic}
                    </div>
                    {issue.comment && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {issue.comment}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No critical issues today!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Overdue Actions from Previous Days */}
        {overdueActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-red-500" />
              Overdue Actions (Carried Forward)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-red-50/50 dark:bg-red-950/20">
                    <th className="text-left p-2 font-medium">Action</th>
                    <th className="text-left p-2 font-medium w-28">Owner</th>
                    <th className="text-center p-2 font-medium w-24">Due Date</th>
                    <th className="text-center p-2 font-medium w-20">Overdue</th>
                    <th className="text-center p-2 font-medium w-24">From Meeting</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueActions.slice(0, 10).map(action => (
                    <tr key={action.id} className="border-b hover:bg-red-50/30 dark:hover:bg-red-950/10">
                      <td className="p-2">{action.action}</td>
                      <td className="p-2 text-muted-foreground">{action.owner_name || 'Unassigned'}</td>
                      <td className="p-2 text-center text-xs">{format(parseISO(action.due_date), 'MMM d')}</td>
                      <td className="p-2 text-center">
                        <span className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-0.5 rounded text-xs font-medium">
                          {action.days_overdue}d
                        </span>
                      </td>
                      <td className="p-2 text-center text-xs text-muted-foreground">
                        {format(parseISO(action.meeting_date), 'MMM d')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overdueActions.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  +{overdueActions.length - 10} more overdue actions
                </p>
              )}
            </div>
          </div>
        )}

        {/* AI Generated Summary */}
        {aiSummary && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              AI-Generated Summary
            </h4>
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm">{aiSummary}</div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!aiSummary && Object.keys(flags).length === 0 && actions.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Add status flags and actions to see KPIs and generate a summary.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
