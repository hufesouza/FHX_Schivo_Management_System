import { useState, useEffect } from 'react';
import { EnquiryLog } from '@/types/enquiryLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, Clock, User, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ParsedAction {
  enquiry_no: string;
  customer: string | null;
  action_text: string;
  action_owner: string | null;
  parsed_date: string | null;
  aging_days: number | null;
  is_parsing: boolean;
}

interface ActionsListProps {
  enquiries: EnquiryLog[];
}

// Parse date from action text using AI
async function parseActionDate(actionText: string): Promise<string | null> {
  try {
    const response = await supabase.functions.invoke('parse-action-date', {
      body: { action_text: actionText }
    });
    
    if (response.error) {
      console.error('Error parsing action date:', response.error);
      return null;
    }
    
    return response.data?.date || null;
  } catch (error) {
    console.error('Error calling parse-action-date:', error);
    return null;
  }
}

function calculateAging(dateStr: string | null): number | null {
  if (!dateStr) return null;
  
  try {
    const actionDate = new Date(dateStr);
    const today = new Date();
    const diffMs = today.getTime() - actionDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : null;
  } catch {
    return null;
  }
}

function getAgingBadgeVariant(days: number | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (days === null) return 'outline';
  if (days <= 7) return 'secondary';
  if (days <= 14) return 'default';
  return 'destructive';
}

// Remove date prefix from action text for display
function stripDateFromAction(actionText: string): string {
  // Match patterns like "27/01 - ", "30/01 -", "08/01-", "27-01 - ", etc.
  const datePattern = /^\s*\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?\s*[-–—:]\s*/i;
  return actionText.replace(datePattern, '').trim();
}

export function ActionsList({ enquiries }: ActionsListProps) {
  const [parsedActions, setParsedActions] = useState<ParsedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only include actions from "open" enquiries (not Quoted, Declined, or Cancelled)
    const closedStatuses = ['QUOTED', 'DECLINED', 'CANCELLED'];
    const actionsWithData = enquiries.filter(e => {
      const status = (e.status || '').toUpperCase().trim();
      const isOpen = !closedStatuses.includes(status);
      return isOpen && e.action_required && e.action_required.trim();
    });
    
    if (actionsWithData.length === 0) {
      setParsedActions([]);
      setIsLoading(false);
      return;
    }

    // Initialize with unparsed actions
    const initial: ParsedAction[] = actionsWithData.map(e => ({
      enquiry_no: e.enquiry_no,
      customer: e.customer,
      action_text: e.action_required!,
      action_owner: e.action_owner,
      parsed_date: null,
      aging_days: null,
      is_parsing: true
    }));
    
    setParsedActions(initial);
    setIsLoading(false);

    // Parse dates in background
    actionsWithData.forEach(async (enquiry, idx) => {
      const date = await parseActionDate(enquiry.action_required!);
      const aging = calculateAging(date);
      
      setParsedActions(prev => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx] = {
            ...updated[idx],
            parsed_date: date,
            aging_days: aging,
            is_parsing: false
          };
        }
        return updated;
      });
    });
  }, [enquiries]);

  const actionsWithOwner = parsedActions.filter(a => a.action_owner);
  const groupedByOwner = actionsWithOwner.reduce((acc, action) => {
    const owner = action.action_owner || 'Unassigned';
    if (!acc[owner]) acc[owner] = [];
    acc[owner].push(action);
    return acc;
  }, {} as Record<string, ParsedAction[]>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (parsedActions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Actions Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No actions found in the uploaded data. Make sure columns I (Action Required) and J (Action Owner) are present.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by aging (oldest first)
  const sortedActions = [...parsedActions].sort((a, b) => {
    if (a.aging_days === null && b.aging_days === null) return 0;
    if (a.aging_days === null) return 1;
    if (b.aging_days === null) return -1;
    return b.aging_days - a.aging_days;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Actions Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{parsedActions.length}</div>
              <div className="text-sm text-muted-foreground">Total Actions</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{Object.keys(groupedByOwner).length}</div>
              <div className="text-sm text-muted-foreground">Action Owners</div>
            </div>
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {parsedActions.filter(a => (a.aging_days || 0) > 14).length}
              </div>
              <div className="text-sm text-muted-foreground">Overdue ({'>'}14 days)</div>
            </div>
            <div className="text-center p-4 bg-accent rounded-lg">
              <div className="text-2xl font-bold text-accent-foreground">
                {parsedActions.filter(a => (a.aging_days || 0) > 7 && (a.aging_days || 0) <= 14).length}
              </div>
              <div className="text-sm text-muted-foreground">At Risk (8-14 days)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5" />
            All Actions
            <Badge variant="secondary" className="ml-2">{sortedActions.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Enquiry</TableHead>
                <TableHead className="w-[140px]">Customer</TableHead>
                <TableHead className="w-[120px]">Owner</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[80px] text-right">Aging</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActions.map((action, idx) => (
                <TableRow key={`${action.enquiry_no}-${idx}`}>
                  <TableCell className="font-medium">{action.enquiry_no}</TableCell>
                  <TableCell className="text-muted-foreground">{action.customer || '-'}</TableCell>
                  <TableCell>
                    {action.action_owner ? (
                      <Badge variant="outline" className="font-normal">
                        <User className="h-3 w-3 mr-1" />
                        {action.action_owner}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="line-clamp-2">{stripDateFromAction(action.action_text)}</span>
                  </TableCell>
                  <TableCell>
                    {action.is_parsing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : action.parsed_date ? (
                      <span className="text-sm">
                        {action.parsed_date.split('-').reverse().join('/')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {action.is_parsing ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    ) : action.aging_days !== null ? (
                      <Badge variant={getAgingBadgeVariant(action.aging_days)}>
                        <Clock className="h-3 w-3 mr-1" />
                        {action.aging_days}d
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
