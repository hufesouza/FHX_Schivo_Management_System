import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface YesNoFieldProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  details?: string | null;
  onDetailsChange?: (value: string) => void;
  detailsLabel?: string;
  showDetailsWhen?: 'yes' | 'no' | 'always';
}

export function YesNoField({
  label,
  value,
  onChange,
  details,
  onDetailsChange,
  detailsLabel = 'Details',
  showDetailsWhen = 'no',
}: YesNoFieldProps) {
  const shouldShowDetails = 
    showDetailsWhen === 'always' ||
    (showDetailsWhen === 'yes' && value === true) ||
    (showDetailsWhen === 'no' && value === false);

  return (
    <div className="space-y-3 p-4 rounded-lg bg-card border border-border">
      <Label className="font-medium">{label}</Label>
      
      <RadioGroup
        value={value === null ? '' : value ? 'yes' : 'no'}
        onValueChange={(v) => onChange(v === 'yes' ? true : v === 'no' ? false : null)}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id={`${label}-yes`} />
          <Label htmlFor={`${label}-yes`} className="font-normal cursor-pointer">Yes</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id={`${label}-no`} />
          <Label htmlFor={`${label}-no`} className="font-normal cursor-pointer">No</Label>
        </div>
      </RadioGroup>
      
      {shouldShowDetails && onDetailsChange && (
        <div className={cn("space-y-2 animate-fade-in")}>
          <Label className="text-sm text-muted-foreground">{detailsLabel}</Label>
          <Textarea
            value={details || ''}
            onChange={(e) => onDetailsChange(e.target.value)}
            placeholder="Enter details..."
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
