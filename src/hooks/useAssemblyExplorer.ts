import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { readDocument } from '@/utils/documentReader';
import type {
  AeBomItem,
  AeDrawing,
  AeExtraction,
  AeIssue,
  AePart,
  AeProcessStep,
} from '@/types/assemblyExplorer';

const BUCKET = 'assembly-drawings';

export function useAeDrawings() {
  return useQuery({
    queryKey: ['ae_drawings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ae_drawings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AeDrawing[];
    },
  });
}

export function useAeParts() {
  return useQuery({
    queryKey: ['ae_parts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ae_parts').select('*').order('part_number');
      if (error) throw error;
      return (data ?? []) as unknown as AePart[];
    },
  });
}

export function useAeBomItems() {
  return useQuery({
    queryKey: ['ae_bom_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ae_bom_items').select('*');
      if (error) throw error;
      return (data ?? []) as unknown as AeBomItem[];
    },
  });
}

export function useAeProcessSteps(assemblyPartId: string | null) {
  return useQuery({
    queryKey: ['ae_process_steps', assemblyPartId],
    enabled: !!assemblyPartId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ae_process_steps')
        .select('*')
        .eq('assembly_part_id', assemblyPartId!)
        .order('sequence');
      if (error) throw error;
      return (data ?? []) as unknown as AeProcessStep[];
    },
  });
}

export async function getDrawingSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function detectFilenameRevision(fileName: string): string | null {
  const match = fileName.match(/rev[-_ ]?([A-Za-z0-9.]+)/i);
  return match ? match[1].toUpperCase() : null;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = String(fr.result);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    fr.onerror = () => reject(new Error('Could not read the file'));
    fr.readAsDataURL(file);
  });

export function useUploadDrawing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: userData } = await supabase.auth.getUser();
      const storagePath = `${crypto.randomUUID()}-${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file);
      if (uploadError) throw uploadError;

      const read = await readDocument(file);
      const pdfBase64 = await fileToBase64(file);

      const { data: fnData, error: fnError } = await supabase.functions.invoke('extract-assembly-drawing', {
        body: { fileName: file.name, pdfBase64, extractedText: read.text },
      });
      if (fnError) throw new Error(fnError.message || 'Extraction failed');
      if (fnData?.error) throw new Error(fnData.error);

      const extraction = fnData.extraction as AeExtraction;
      const filenameRevision = detectFilenameRevision(file.name);
      const titleRevision = extraction.revision?.trim().toUpperCase() ?? null;
      const revisionDiscrepancy =
        !!filenameRevision && !!titleRevision && filenameRevision !== titleRevision;

      const issues: AeIssue[] = [];
      if (revisionDiscrepancy) {
        issues.push({
          type: 'revision_discrepancy',
          field: 'revision',
          message: `Filename indicates REV-${filenameRevision} but the title block shows ${extraction.revision}. Review required.`,
        });
      }
      for (const field of extraction.low_confidence ?? []) {
        issues.push({ type: 'low_confidence', field, message: `Low confidence value: ${field}` });
      }

      // Flag referenced drawings that have not been uploaded
      const { data: existing } = await supabase.from('ae_drawings').select('drawing_number');
      const known = new Set((existing ?? []).map((d) => d.drawing_number).filter(Boolean));
      const ownNumber = extraction.drawing_number;
      for (const ref of extraction.referenced_drawings ?? []) {
        if (ref && ref !== ownNumber && !known.has(ref)) {
          issues.push({
            type: 'missing_referenced_drawing',
            message: `Referenced drawing ${ref} has not been uploaded yet.`,
          });
        }
      }

      const { data: drawing, error: insertError } = await supabase
        .from('ae_drawings')
        .insert({
          file_name: file.name,
          storage_path: storagePath,
          drawing_number: extraction.drawing_number,
          revision: extraction.revision,
          filename_revision: filenameRevision,
          revision_discrepancy: revisionDiscrepancy,
          description: extraction.description,
          status: 'draft',
          extraction: extraction as never,
          issues: issues as never,
          uploaded_by: userData.user?.id ?? null,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      qc.invalidateQueries({ queryKey: ['ae_drawings'] });
      return drawing as unknown as AeDrawing;
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed'),
  });
}

export interface ConfirmDrawingInput {
  drawing: AeDrawing;
  extraction: AeExtraction;
}

export function useConfirmDrawing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ drawing, extraction }: ConfirmDrawingInput) => {
      // 1. Upsert every part mentioned by the extraction
      const partNumbers = new Map<string, AePart>();
      const upsertPart = async (
        partNumber: string,
        description: string | null,
        partType: AePart['part_type'],
        side: AePart['side'],
        drawingNumber: string | null,
      ): Promise<AePart> => {
        const cached = partNumbers.get(partNumber);
        if (cached) return cached;
        const { data: existing } = await supabase
          .from('ae_parts')
          .select('*')
          .eq('part_number', partNumber)
          .maybeSingle();
        if (existing) {
          const part = existing as unknown as AePart;
          // Enrich existing record with newly known information
          const updates: Record<string, unknown> = {};
          if (!part.description && description) updates.description = description;
          if (!part.drawing_number && drawingNumber) updates.drawing_number = drawingNumber;
          if (!part.drawing_id) updates.drawing_id = drawing.id;
          if (part.part_type === 'component' && partType !== 'component') updates.part_type = partType;
          if (Object.keys(updates).length > 0) {
            const { data: updated, error } = await supabase
              .from('ae_parts')
              .update(updates)
              .eq('id', part.id)
              .select()
              .single();
            if (error) throw error;
            partNumbers.set(partNumber, updated as unknown as AePart);
            return updated as unknown as AePart;
          }
          partNumbers.set(partNumber, part);
          return part;
        }
        const { data: created, error } = await supabase
          .from('ae_parts')
          .insert({
            part_number: partNumber,
            description,
            part_type: partType,
            side,
            drawing_number: drawingNumber,
            drawing_id: drawing.id,
            status: 'reviewed',
          })
          .select()
          .single();
        if (error) throw error;
        partNumbers.set(partNumber, created as unknown as AePart);
        return created as unknown as AePart;
      };

      // Assemblies defined by this drawing
      for (const asm of extraction.assemblies ?? []) {
        if (!asm.part_number) continue;
        await upsertPart(asm.part_number, asm.description, asm.kind, asm.side, extraction.drawing_number);
      }

      // 2. BOM tables -> parent/child relationships
      for (const table of extraction.bom_tables ?? []) {
        if (!table.parent_part_number) continue;
        const parent = await upsertPart(
          table.parent_part_number,
          null,
          'subassembly',
          table.side,
          extraction.drawing_number,
        );
        for (const row of table.rows ?? []) {
          if (!row.component_number || !row.item_number) continue;
          const child = await upsertPart(
            row.component_number,
            row.description,
            'component',
            table.side,
            row.referenced_drawing,
          );
          const { error } = await supabase.from('ae_bom_items').upsert(
            {
              parent_part_id: parent.id,
              child_part_id: child.id,
              item_number: row.item_number,
              quantity: row.quantity ?? 1,
              side: table.side,
              source_drawing_id: drawing.id,
              source_page: row.page ?? table.page,
              source_row: `Item ${row.item_number}`,
              status: 'reviewed',
            },
            { onConflict: 'parent_part_id,item_number,side' },
          );
          if (error) throw error;
        }
      }

      // 3. Process instructions from explicit drawing notes
      const processNotes = (extraction.notes ?? []).filter((n) => n.is_process_instruction && n.text);
      if (processNotes.length > 0) {
        const firstAssembly = extraction.assemblies?.[0];
        if (firstAssembly?.part_number) {
          const assembly = partNumbers.get(firstAssembly.part_number);
          if (assembly) {
            const rows = processNotes.map((note, index) => ({
              assembly_part_id: assembly.id,
              title: `Note ${index + 1}`,
              instruction: note.text,
              source_wording: note.text,
              origin: 'drawing' as const,
              source_drawing_id: drawing.id,
              source_page: note.page,
              sequence: index,
              status: 'draft' as const,
              needs_review: true,
            }));
            await supabase.from('ae_process_steps').insert(rows);
          }
        }
      }

      // 4. Mark the drawing as reviewed
      const { error: updateError } = await supabase
        .from('ae_drawings')
        .update({ status: 'reviewed', extraction: extraction as never })
        .eq('id', drawing.id);
      if (updateError) throw updateError;

      qc.invalidateQueries({ queryKey: ['ae_drawings'] });
      qc.invalidateQueries({ queryKey: ['ae_parts'] });
      qc.invalidateQueries({ queryKey: ['ae_bom_items'] });
      qc.invalidateQueries({ queryKey: ['ae_process_steps'] });
    },
    onSuccess: () => toast.success('Drawing published as reviewed structure'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not publish drawing'),
  });
}

export function useUpdateBomItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AeBomItem> }) => {
      const { error } = await supabase.from('ae_bom_items').update(updates as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ae_bom_items'] });
      toast.success('Relationship updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });
}

export function useDeleteBomItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ae_bom_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ae_bom_items'] });
      toast.success('Relationship removed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });
}

export function useDeleteDrawing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (drawing: AeDrawing) => {
      await supabase.storage.from(BUCKET).remove([drawing.storage_path]);
      const { error } = await supabase.from('ae_drawings').delete().eq('id', drawing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ae_drawings'] });
      toast.success('Drawing deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });
}

export function useSaveProcessStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: Partial<AeProcessStep> & { assembly_part_id: string }) => {
      if (step.id) {
        const { id, ...updates } = step;
        const { error } = await supabase.from('ae_process_steps').update(updates as never).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ae_process_steps').insert(step as never);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ae_process_steps', vars.assembly_part_id] });
      toast.success('Process step saved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  });
}

export function useDeleteProcessStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; assembly_part_id: string }) => {
      const { error } = await supabase.from('ae_process_steps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ae_process_steps', vars.assembly_part_id] });
      toast.success('Process step deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  });
}
