import { cn } from '@/lib/utils';
import { FormSection } from '@/types/workOrder';
import { Check, FileText, Settings, ClipboardCheck, CheckCircle, Truck, Code, GitMerge } from 'lucide-react';

interface FormNavigationProps {
  currentSection: FormSection;
  onSectionChange: (section: FormSection) => void;
  completedSections?: FormSection[];
}

const sections: { id: FormSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'header', label: 'Details', icon: FileText },
  { id: 'engineering', label: 'Engineering', icon: Settings },
  { id: 'operations', label: 'Operations', icon: ClipboardCheck },
  { id: 'quality', label: 'Quality', icon: CheckCircle },
  { id: 'programming', label: 'Programming', icon: Code },
  { id: 'handover', label: 'Handover', icon: GitMerge },
  { id: 'npi-final', label: 'NPI Final', icon: Check },
  { id: 'supply-chain', label: 'Supply Chain', icon: Truck },
];

export function FormNavigation({
  currentSection,
  onSectionChange,
  completedSections = [],
}: FormNavigationProps) {
  return (
    <nav className="flex flex-wrap gap-2 p-2 bg-card rounded-lg border border-border">
      {sections.map((section, index) => {
        const Icon = section.icon;
        const isActive = currentSection === section.id;
        const isCompleted = completedSections.includes(section.id);
        
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth",
              isActive
                ? "bg-primary text-primary-foreground shadow-elegant"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
              isCompleted && !isActive && "text-primary"
            )}
          >
            <span className="flex items-center justify-center h-5 w-5 text-xs rounded-full border border-current">
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                index + 1
              )}
            </span>
            <Icon className="h-4 w-4" />
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
