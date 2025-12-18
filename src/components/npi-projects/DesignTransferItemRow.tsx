import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { NPIDesignTransferItem } from '@/types/npiProject';
import { ResourceConfiguration } from '@/hooks/useResourceConfigurations';

interface DesignTransferItemRowProps {
  item: NPIDesignTransferItem;
  resources: ResourceConfiguration[];
  onStatusChange: (item: NPIDesignTransferItem, status: string) => void;
  onNotesChange: (item: NPIDesignTransferItem, notes: string) => void;
  onOwnerChange?: (item: NPIDesignTransferItem, ownerName: string) => void;
  onDueDateChange?: (item: NPIDesignTransferItem, dueDate: string) => void;
  onDurationChange?: (item: NPIDesignTransferItem, duration: number | null) => void;
}

interface ItemNotes {
  selectedResources?: string[];
  additionalNotes?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-amber-500" />;
    case 'not_applicable':
      return <XCircle className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
};

// Items that should show resource selection
const EQUIPMENT_ITEMS = [
  'Identification of required equipment',
  'Equipment installation & validation',
];

export function DesignTransferItemRow({
  item,
  resources,
  onStatusChange,
  onNotesChange,
  onOwnerChange,
  onDueDateChange,
  onDurationChange,
}: DesignTransferItemRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedNotes, setParsedNotes] = useState<ItemNotes>({});

  const isEquipmentItem = item.category === 'Equipment' && EQUIPMENT_ITEMS.includes(item.item_name);

  // Parse notes on mount
  useEffect(() => {
    if (item.notes) {
      try {
        const parsed = JSON.parse(item.notes);
        setParsedNotes(parsed);
      } catch {
        // If not JSON, treat as plain text
        setParsedNotes({ additionalNotes: item.notes });
      }
    } else {
      setParsedNotes({});
    }
  }, [item.notes]);

  const handleResourceToggle = (resourceName: string) => {
    const currentResources = parsedNotes.selectedResources || [];
    const newResources = currentResources.includes(resourceName)
      ? currentResources.filter(r => r !== resourceName)
      : [...currentResources, resourceName];
    
    const newNotes: ItemNotes = {
      ...parsedNotes,
      selectedResources: newResources,
    };
    
    setParsedNotes(newNotes);
    onNotesChange(item, JSON.stringify(newNotes));
  };

  const handleAdditionalNotesChange = (text: string) => {
    const newNotes: ItemNotes = {
      ...parsedNotes,
      additionalNotes: text,
    };
    
    setParsedNotes(newNotes);
    onNotesChange(item, JSON.stringify(newNotes));
  };

  const selectedResourceCount = parsedNotes.selectedResources?.length || 0;

  // Group resources by department
  const resourcesByDepartment = resources.reduce((acc, resource) => {
    const dept = resource.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(resource);
    return acc;
  }, {} as Record<string, ResourceConfiguration[]>);

  const departmentLabels: Record<string, string> = {
    milling: 'Milling',
    turning: 'Turning',
    sliding_head: 'Sliding Heads',
    misc: 'Misc',
    Other: 'Other',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            {getStatusIcon(item.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{item.item_name}</p>
                {isEquipmentItem && selectedResourceCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedResourceCount} resource{selectedResourceCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{item.category} • {item.description}</p>
            </div>
            <Select
              value={item.status}
              onValueChange={(value) => onStatusChange(item, value)}
            >
              <SelectTrigger className="w-[140px]" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="not_applicable">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 space-y-4 bg-muted/20">
            {/* Owner, Duration, and Due Date */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`owner-${item.id}`} className="text-xs">Owner</Label>
                <Input
                  id={`owner-${item.id}`}
                  value={item.owner_name || ''}
                  onChange={(e) => onOwnerChange?.(item, e.target.value)}
                  placeholder="Assign owner..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`duration-${item.id}`} className="text-xs">Duration (days)</Label>
                <Input
                  id={`duration-${item.id}`}
                  type="number"
                  min="1"
                  max="365"
                  value={item.estimated_duration_days ?? ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    onDurationChange?.(item, val);
                  }}
                  placeholder="Days..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`due-${item.id}`} className="text-xs">Due Date</Label>
                <Input
                  id={`due-${item.id}`}
                  type="date"
                  value={item.due_date || ''}
                  onChange={(e) => onDueDateChange?.(item, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Resource Selection for Equipment Items */}
            {isEquipmentItem && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Select Required Equipment/Resources</Label>
                <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto bg-background">
                  {Object.entries(resourcesByDepartment).map(([dept, deptResources]) => (
                    <div key={dept} className="mb-3 last:mb-0">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        {departmentLabels[dept] || dept}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {deptResources.filter(r => r.is_active).map(resource => (
                          <div key={resource.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`resource-${item.id}-${resource.id}`}
                              checked={parsedNotes.selectedResources?.includes(resource.resource_name) || false}
                              onCheckedChange={() => handleResourceToggle(resource.resource_name)}
                            />
                            <label
                              htmlFor={`resource-${item.id}-${resource.id}`}
                              className="text-sm cursor-pointer truncate"
                              title={resource.resource_name}
                            >
                              {resource.resource_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {resources.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No resources configured. Add resources in Production → Capacity Planning.
                    </p>
                  )}
                </div>
                {selectedResourceCount > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {parsedNotes.selectedResources?.map(name => (
                      <Badge key={name} variant="outline" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Additional Notes */}
            <div className="space-y-1.5">
              <Label htmlFor={`notes-${item.id}`} className="text-xs">
                {isEquipmentItem ? 'Additional Notes' : 'Notes'}
              </Label>
              <Textarea
                id={`notes-${item.id}`}
                value={parsedNotes.additionalNotes || ''}
                onChange={(e) => handleAdditionalNotesChange(e.target.value)}
                placeholder="Add notes..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
