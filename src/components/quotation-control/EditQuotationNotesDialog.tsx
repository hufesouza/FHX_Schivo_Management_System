import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Plus, Trash2, Loader2 } from 'lucide-react';
import { EnquiryQuotation } from '@/hooks/useEnquiryQuotations';
import { DEFAULT_NOTES, DEFAULT_CONDITIONS } from './ExportQuotationPDF';

interface EditQuotationNotesDialogProps {
  quotation: EnquiryQuotation;
  onSave: (id: string, notes: string) => Promise<boolean>;
  trigger?: React.ReactNode;
}

interface NotesAndConditions {
  notes: string[];
  conditions: {
    leadTime: string;
    carriage: string;
    validity: string;
    paymentTerms: string;
  };
}

export function EditQuotationNotesDialog({ quotation, onSave, trigger }: EditQuotationNotesDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<string[]>(DEFAULT_NOTES);
  const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);

  useEffect(() => {
    if (open && quotation.notes) {
      try {
        const parsed: NotesAndConditions = JSON.parse(quotation.notes);
        setNotes(parsed.notes || DEFAULT_NOTES);
        setConditions(parsed.conditions || DEFAULT_CONDITIONS);
      } catch {
        setNotes(DEFAULT_NOTES);
        setConditions(DEFAULT_CONDITIONS);
      }
    } else if (open) {
      setNotes(DEFAULT_NOTES);
      setConditions(DEFAULT_CONDITIONS);
    }
  }, [open, quotation.notes]);

  const handleAddNote = () => {
    setNotes([...notes, '']);
  };

  const handleRemoveNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const handleNoteChange = (index: number, value: string) => {
    const updated = [...notes];
    updated[index] = value;
    setNotes(updated);
  };

  const handleConditionChange = (key: keyof typeof conditions, value: string) => {
    setConditions({ ...conditions, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    const notesJson = JSON.stringify({ notes, conditions });
    const success = await onSave(quotation.id, notesJson);
    setSaving(false);
    if (success) {
      setOpen(false);
    }
  };

  const handleReset = () => {
    setNotes(DEFAULT_NOTES);
    setConditions(DEFAULT_CONDITIONS);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Edit className="h-4 w-4" />
        </Button>
      )}
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--schivo-orange))]">
            Edit Notes & Conditions
          </DialogTitle>
          <DialogDescription>
            Customize the notes and conditions that appear on the PDF quotation for {quotation.enquiry_no}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Notes</Label>
              <Button variant="outline" size="sm" onClick={handleAddNote}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
            
            {notes.map((note, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={note}
                  onChange={(e) => handleNoteChange(index, e.target.value)}
                  placeholder="Enter note..."
                  className="flex-1 min-h-[60px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveNote(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Conditions Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Conditions</Label>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="leadTime">Lead Time</Label>
                <Input
                  id="leadTime"
                  value={conditions.leadTime}
                  onChange={(e) => handleConditionChange('leadTime', e.target.value)}
                  placeholder="e.g., Subject to confirmation at time of order placement"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="carriage">Carriage</Label>
                <Input
                  id="carriage"
                  value={conditions.carriage}
                  onChange={(e) => handleConditionChange('carriage', e.target.value)}
                  placeholder="e.g., Extra at Cost (unless otherwise stated)"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="validity">Quotation Validity</Label>
                <Input
                  id="validity"
                  value={conditions.validity}
                  onChange={(e) => handleConditionChange('validity', e.target.value)}
                  placeholder="e.g., Quotation is valid for 60 days."
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={conditions.paymentTerms}
                  onChange={(e) => handleConditionChange('paymentTerms', e.target.value)}
                  placeholder="e.g., 30 Days end of month"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
