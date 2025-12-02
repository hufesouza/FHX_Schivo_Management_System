import { Note } from '@/types/note';
import { cn } from '@/lib/utils';
import { Plus, Search, FileText } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function NotesList({ notes, selectedNoteId, onSelectNote, onCreateNote }: NotesListProps) {
  const [search, setSearch] = useState('');
  
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(search.toLowerCase()) ||
    note.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-72 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-serif font-semibold text-sidebar-foreground">Inkwell</h1>
          <Button 
            onClick={onCreateNote}
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-sidebar-accent border-0 text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>
      
      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">{notes.length === 0 ? 'No notes yet' : 'No matches'}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNotes.map((note, index) => (
              <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-smooth",
                  "hover:bg-sidebar-accent",
                  selectedNoteId === note.id 
                    ? "bg-sidebar-accent shadow-elegant" 
                    : "bg-transparent",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <h3 className="font-medium text-sidebar-foreground truncate text-sm">
                  {note.title || 'Untitled'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {note.content || 'Empty note...'}
                </p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  {formatDate(note.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
