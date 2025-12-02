import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkOrder } from '@/types/workOrder';
import { cn } from '@/lib/utils';

interface FormHeaderProps {
  data: Partial<WorkOrder>;
  onChange: (updates: Partial<WorkOrder>) => void;
  disabled?: boolean;
}

export function FormHeader({ data, onChange, disabled = false }: FormHeaderProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", disabled && "opacity-60")}>
      <div>
        <h2 className="text-xl font-serif font-medium mb-1">Blue Review Details</h2>
        <p className="text-sm text-muted-foreground">
          {disabled ? 'View only - you do not have permission to edit this section' : 'Enter the basic review information'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        
        <div className="space-y-2">
          <Label htmlFor="icn_number">ICN No.</Label>
          <Input
            id="icn_number"
            value={data.icn_number || ''}
            onChange={(e) => onChange({ icn_number: e.target.value })}
            placeholder="ICN number"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
