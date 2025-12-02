import { useNotes } from '@/hooks/useNotes';
import { NotesList } from '@/components/NotesList';
import { NoteEditor } from '@/components/NoteEditor';
import { EmptyState } from '@/components/EmptyState';
import { InstallBanner } from '@/components/InstallBanner';

const Index = () => {
  const { 
    notes, 
    selectedNote, 
    selectedNoteId,
    setSelectedNoteId, 
    createNote, 
    updateNote, 
    deleteNote 
  } = useNotes();

  return (
    <div className="flex h-screen bg-background">
      <NotesList
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onCreateNote={createNote}
      />
      
      <main className="flex-1 flex flex-col">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
          />
        ) : (
          <EmptyState onCreateNote={createNote} />
        )}
      </main>
      
      <InstallBanner />
    </div>
  );
};

export default Index;
