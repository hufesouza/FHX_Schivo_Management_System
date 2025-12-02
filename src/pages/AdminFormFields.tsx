import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { 
  Loader2, 
  Plus, 
  ArrowLeft, 
  Pencil,
  Trash2,
  GripVertical,
  Settings
} from 'lucide-react';

type FieldType = 'yes_no' | 'text' | 'number' | 'textarea' | 'select';
type Section = 'engineering' | 'operations' | 'quality' | 'npi_final' | 'supply_chain';

interface FormField {
  id: string;
  section: Section;
  field_key: string;
  field_type: FieldType;
  label: string;
  placeholder: string | null;
  required: boolean;
  options: any;
  display_order: number;
  is_active: boolean;
}

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'engineering', label: 'Engineering Review' },
  { value: 'operations', label: 'Operations Review' },
  { value: 'quality', label: 'Quality Review' },
  { value: 'npi_final', label: 'NPI Final Review' },
  { value: 'supply_chain', label: 'Supply Chain' },
];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Select' },
];

export default function AdminFormFields() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { role: userRole, loading: roleLoading } = useUserRole();
  
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formSection, setFormSection] = useState<Section>('engineering');
  const [formFieldKey, setFormFieldKey] = useState('');
  const [formFieldType, setFormFieldType] = useState<FieldType>('text');
  const [formLabel, setFormLabel] = useState('');
  const [formPlaceholder, setFormPlaceholder] = useState('');
  const [formRequired, setFormRequired] = useState(false);
  const [formOptions, setFormOptions] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && userRole !== 'admin') {
      toast.error('Access denied. Admin only.');
      navigate('/');
    }
  }, [userRole, roleLoading, navigate]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchFields();
    }
  }, [userRole]);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .order('section')
        .order('display_order');

      if (error) throw error;
      setFields(data as FormField[]);
    } catch (err) {
      console.error('Error fetching fields:', err);
      toast.error('Failed to load form fields');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormSection('engineering');
    setFormFieldKey('');
    setFormFieldType('text');
    setFormLabel('');
    setFormPlaceholder('');
    setFormRequired(false);
    setFormOptions('');
    setEditingField(null);
  };

  const openEditDialog = (field: FormField) => {
    setEditingField(field);
    setFormSection(field.section);
    setFormFieldKey(field.field_key);
    setFormFieldType(field.field_type);
    setFormLabel(field.label);
    setFormPlaceholder(field.placeholder || '');
    setFormRequired(field.required);
    setFormOptions(field.options ? JSON.stringify(field.options) : '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formLabel || !formFieldKey) {
      toast.error('Label and field key are required');
      return;
    }

    setSaving(true);
    try {
      const fieldData = {
        section: formSection,
        field_key: formFieldKey,
        field_type: formFieldType,
        label: formLabel,
        placeholder: formPlaceholder || null,
        required: formRequired,
        options: formOptions ? JSON.parse(formOptions) : null,
      };

      if (editingField) {
        const { error } = await supabase
          .from('form_fields')
          .update(fieldData)
          .eq('id', editingField.id);

        if (error) throw error;
        toast.success('Field updated successfully');
      } else {
        // Get max display order for the section
        const sectionFields = fields.filter(f => f.section === formSection);
        const maxOrder = sectionFields.length > 0 
          ? Math.max(...sectionFields.map(f => f.display_order)) 
          : 0;

        const { error } = await supabase
          .from('form_fields')
          .insert({ ...fieldData, display_order: maxOrder + 1 });

        if (error) throw error;
        toast.success('Field created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchFields();
    } catch (err: any) {
      console.error('Error saving field:', err);
      toast.error(err.message || 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (field: FormField) => {
    try {
      const { error } = await supabase
        .from('form_fields')
        .update({ is_active: !field.is_active })
        .eq('id', field.id);

      if (error) throw error;
      
      setFields(fields.map(f => 
        f.id === field.id ? { ...f, is_active: !f.is_active } : f
      ));
      
      toast.success(`Field ${field.is_active ? 'disabled' : 'enabled'}`);
    } catch (err) {
      console.error('Error toggling field:', err);
      toast.error('Failed to update field');
    }
  };

  const handleDelete = async (field: FormField) => {
    if (!confirm(`Are you sure you want to delete "${field.label}"?`)) return;

    try {
      const { error } = await supabase
        .from('form_fields')
        .delete()
        .eq('id', field.id);

      if (error) throw error;
      
      setFields(fields.filter(f => f.id !== field.id));
      toast.success('Field deleted');
    } catch (err) {
      console.error('Error deleting field:', err);
      toast.error('Failed to delete field');
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole !== 'admin') {
    return null;
  }

  const fieldsBySection = SECTIONS.map(section => ({
    ...section,
    fields: fields.filter(f => f.section === section.value),
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-serif font-medium">Form Fields</h1>
            <p className="text-sm text-muted-foreground">Customize form questions</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Add Field Button */}
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingField ? 'Edit Field' : 'Add New Field'}</DialogTitle>
                <DialogDescription>
                  {editingField ? 'Update the field properties' : 'Create a new form field'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={formSection} onValueChange={(v) => setFormSection(v as Section)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Field Key</Label>
                  <Input
                    placeholder="unique_field_key"
                    value={formFieldKey}
                    onChange={(e) => setFormFieldKey(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  />
                  <p className="text-xs text-muted-foreground">Unique identifier (no spaces)</p>
                </div>
                <div className="space-y-2">
                  <Label>Field Type</Label>
                  <Select value={formFieldType} onValueChange={(v) => setFormFieldType(v as FieldType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    placeholder="Question text shown to users"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder (optional)</Label>
                  <Input
                    placeholder="Placeholder text..."
                    value={formPlaceholder}
                    onChange={(e) => setFormPlaceholder(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Required</Label>
                  <Switch checked={formRequired} onCheckedChange={setFormRequired} />
                </div>
                {formFieldType === 'select' && (
                  <div className="space-y-2">
                    <Label>Options (JSON array)</Label>
                    <Textarea
                      placeholder='["Option 1", "Option 2"]'
                      value={formOptions}
                      onChange={(e) => setFormOptions(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Field'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Fields by Section */}
        <Accordion type="multiple" defaultValue={SECTIONS.map(s => s.value)} className="space-y-4">
          {fieldsBySection.map((section) => (
            <AccordionItem key={section.value} value={section.value} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">{section.label}</span>
                  <Badge variant="secondary">{section.fields.length} fields</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {section.fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No fields in this section
                  </p>
                ) : (
                  <div className="space-y-2">
                    {section.fields
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((field) => (
                        <div 
                          key={field.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            field.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                          }`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{field.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {field.field_key} • {field.field_type}
                              {field.required && ' • Required'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.is_active}
                              onCheckedChange={() => handleToggleActive(field)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(field)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(field)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
}
