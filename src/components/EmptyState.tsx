import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateNote: () => void;
}

export function EmptyState({ onCreateNote }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-150" />
        <div className="relative bg-card rounded-2xl p-6 shadow-elegant">
          <FileText className="h-12 w-12 text-primary" />
        </div>
      </div>
      
      <h2 className="text-2xl font-serif font-medium mb-2">No note selected</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-sm">
        Select a note from the sidebar or create a new one to start writing
      </p>
      
      <Button onClick={onCreateNote} className="gap-2">
        <Plus className="h-4 w-4" />
        New Note
      </Button>
    </div>
  );
}
