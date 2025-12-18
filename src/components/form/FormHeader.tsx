import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WorkOrder } from '@/types/workOrder';
import { cn } from '@/lib/utils';
import { RotateCcw, PauseCircle } from 'lucide-react';

interface FormHeaderProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
}

export function FormHeader({ data, onChange, disabled = false }: FormHeaderProps) {
  const isRevision = (data.revision_round || 1) > 1;
  const isOnHold = data.br_on_hold === true;

  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-serif font-medium">Blue Review Details</h2>
          {isRevision && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              Round {data.revision_round}
            </Badge>
          )}
          {isOnHold && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1">
              <PauseCircle className="h-3 w-3" />
              On Hold
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Enter the basic review information'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="blue_review_number">Blue Review #</Label>
          <Input
            id="blue_review_number"
            value={data.blue_review_number ? `BR-${String(data.blue_review_number).padStart(5, '0')}` : 'Auto-assigned on save'}
            disabled
            className="bg-muted font-mono"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customer">Customer</Label>
          <Input
            id="customer"
            value={data.customer || ''}
            onChange={(e) => onChange({ customer: e.target.value })}
            placeholder="Customer name"
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="part_and_rev">Part & Rev</Label>
          <Input
            id="part_and_rev"
            value={data.part_and_rev || ''}
            onChange={(e) => onChange({ part_and_rev: e.target.value })}
            placeholder="Part number and revision"
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="work_order_number">W/O #</Label>
          <Input
            id="work_order_number"
            value={data.work_order_number || ''}
            onChange={(e) => onChange({ work_order_number: e.target.value })}
            placeholder="Work order number"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
