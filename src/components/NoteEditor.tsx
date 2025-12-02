import { Note } from '@/types/note';
import { Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NoteEditorProps {
  note: Note;
  onUpdateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
  onDeleteNote: (id: string) => void;
}

export function NoteEditor({ note, onUpdateNote, onDeleteNote }: NoteEditorProps) {
  return (
    <div className="flex-1 flex flex-col h-full animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-end p-4 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => onDeleteNote(note.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdateNote(note.id, { title: e.target.value })}
          placeholder="Title"
          className="w-full note-title bg-transparent border-0 outline-none placeholder:text-muted-foreground mb-6"
        />
        
        <textarea
          value={note.content}
          onChange={(e) => onUpdateNote(note.id, { content: e.target.value })}
          placeholder="Start writing..."
          className="w-full h-full min-h-[60vh] note-content bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
