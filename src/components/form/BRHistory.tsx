import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BRHistoryItem {
  id: string;
  blue_review_number: number;
  work_order_number: string | null;
  revision_round: number;
  status: string;
  br_on_hold: boolean;
  created_at: string;
}

interface BRHistoryProps {
  currentBrId: string;
  parentBrId: string | null;
  revisionRound: number;
}

export function BRHistory({ currentBrId, parentBrId, revisionRound }: BRHistoryProps) {
  const [history, setHistory] = useState<BRHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchHistory() {
      if (!parentBrId && revisionRound === 1) {
        // Check if there are child revisions
        const { data: children } = await supabase
          .from('work_orders')
          .select('id, blue_review_number, work_order_number, revision_round, status, br_on_hold, created_at')
          .eq('parent_br_id', currentBrId)
          .order('revision_round', { ascending: true });
        
        if (children && children.length > 0) {
          // Get current BR info
          const { data: current } = await supabase
            .from('work_orders')
            .select('id, blue_review_number, work_order_number, revision_round, status, br_on_hold, created_at')
            .eq('id', currentBrId)
            .single();
          
          if (current) {
            setHistory([current as BRHistoryItem, ...(children as BRHistoryItem[])]);
          }
        }
        setLoading(false);
        return;
      }

      // Find root parent
      let rootId = parentBrId || currentBrId;
      let attempts = 0;
      while (attempts < 10) {
        const { data: parent } = await supabase
          .from('work_orders')
          .select('id, parent_br_id')
          .eq('id', rootId)
          .single();
        
        if (!parent?.parent_br_id) break;
        rootId = parent.parent_br_id;
        attempts++;
      }

      // Get root BR
      const { data: root } = await supabase
        .from('work_orders')
        .select('id, blue_review_number, work_order_number, revision_round, status, br_on_hold, created_at')
        .eq('id', rootId)
        .single();

      // Get all revisions
      const { data: revisions } = await supabase
        .from('work_orders')
        .select('id, blue_review_number, work_order_number, revision_round, status, br_on_hold, created_at')
        .eq('parent_br_id', rootId)
        .order('revision_round', { ascending: true });

      const allHistory: BRHistoryItem[] = [];
      if (root) allHistory.push(root as BRHistoryItem);
      if (revisions) allHistory.push(...(revisions as BRHistoryItem[]));

      setHistory(allHistory);
      setLoading(false);
    }

    fetchHistory();
  }, [currentBrId, parentBrId, revisionRound]);

  if (loading || history.length <= 1) return null;

  const formatBrNumber = (num: number) => `BR-${String(num).padStart(5, '0')}`;

  return (
    <Card className="mt-6 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Blue Review History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {history.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <Button
                variant={item.id === currentBrId ? 'default' : 'outline'}
                size="sm"
                onClick={() => item.id !== currentBrId && navigate(`/work-order/${item.id}`)}
                className="flex items-center gap-2"
              >
                <span>Round {item.revision_round || 1}</span>
                <span className="text-xs opacity-70">
                  {formatBrNumber(item.blue_review_number)}
                </span>
                {item.br_on_hold && (
                  <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                    On Hold
                  </Badge>
                )}
                {item.status === 'completed' && (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                    Completed
                  </Badge>
                )}
                {item.id !== currentBrId && <ExternalLink className="h-3 w-3" />}
              </Button>
              {index < history.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
