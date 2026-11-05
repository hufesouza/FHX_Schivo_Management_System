import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  getDrawingSignedUrl,
  useAeBomItems,
  useAeParts,
  useAeProcessSteps,
  useDeleteProcessStep,
  useSaveProcessStep,
} from '@/hooks/useAssemblyExplorer';
import type { AeBomItem, AeProcessStep, AeStepOrigin } from '@/types/assemblyExplorer';
import { toast } from 'sonner';

const ORIGIN_LABELS: Record<AeStepOrigin, string> = {
  drawing: 'From drawing',
  manual: 'Manual',
  ai: 'AI proposal',
};

const AssemblyProcess = () => {
  const { partId } = useParams<{ partId: string }>();
  const navigate = useNavigate();
  const { data: parts } = useAeParts();
  const { data: bomItems } = useAeBomItems();
  const { data: steps, isLoading } = useAeProcessSteps(partId ?? null);
  const saveStep = useSaveProcessStep();
  const deleteStep = useDeleteProcessStep();

  const [editing, setEditing] = useState<Partial<AeProcessStep> | null>(null);

  const part = useMemo(() => (parts ?? []).find((p) => p.id === partId) ?? null, [parts, partId]);
  const assemblyItems = useMemo(
    () => (bomItems ?? []).filter((i) => i.parent_part_id === partId),
    [bomItems, partId],
  );
  const childAssemblies = useMemo(() => {
    const childIds = new Set(assemblyItems.map((i) => i.child_part_id));
    return (parts ?? []).filter(
      (p) => childIds.has(p.id) && (p.part_type === 'subassembly' || (bomItems ?? []).some((i) => i.parent_part_id === p.id)),
    );
  }, [parts, assemblyItems, bomItems]);

  const sorted = useMemo(() => [...(steps ?? [])].sort((a, b) => a.sequence - b.sequence), [steps]);

  const move = (step: AeProcessStep, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === step.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    saveStep.mutate({ id: step.id, assembly_part_id: step.assembly_part_id, sequence: swapWith.sequence });
    saveStep.mutate({ id: swapWith.id, assembly_part_id: swapWith.assembly_part_id, sequence: step.sequence });
  };

  const openSource = async (drawingId: string | null, page?: number | null) => {
    if (!drawingId) return;
    const path = await fetchDrawingPath(drawingId);
    if (!path) return;
    const url = await getDrawingSignedUrl(path);
    if (url) window.open(`${url}#page=${page ?? 1}`, '_blank');
    else toast.error('Could not open the source drawing');
  };

  if (!partId) return null;

  return (
    <AppLayout
      title="Assembly Process"
      subtitle={part ? `${part.part_number} — ${part.description ?? ''}` : 'Process flow'}
      showBackButton
      backTo="/assembly-explorer"
    >
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Process flow</h2>
            <p className="text-sm text-muted-foreground">
              Steps here mean “precedes” — unlike the BOM, which means “contains”. Only instructions explicitly documented
              on the drawing are imported; everything else is marked for engineering review.
            </p>
          </div>
          <Button
            onClick={() =>
              setEditing({
                assembly_part_id: partId,
                title: '',
                instruction: '',
                origin: 'manual',
                sequence: sorted.length,
                status: 'draft',
                bom_item_ids: [],
                predecessor_ids: [],
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" /> Add step
          </Button>
        </div>

        {isLoading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}

        {!isLoading && sorted.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No process steps yet. If the drawing notes contain explicit assembly instructions they appear here after
              review; otherwise add steps manually.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {sorted.map((step, idx) => (
            <Card key={step.id} className={step.needs_review ? 'border-amber-500/40' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{idx + 1}</Badge>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                  <Badge variant="outline">{ORIGIN_LABELS[step.origin]}</Badge>
                  <Badge
                    className={
                      step.status === 'reviewed'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    }
                  >
                    {step.status}
                  </Badge>
                  {step.needs_review && (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Requires engineering review
                    </Badge>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(step, -1)} disabled={idx === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(step, 1)} disabled={idx === sorted.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(step)}>Edit</Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this step?')) deleteStep.mutate({ id: step.id, assembly_part_id: partId });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {step.instruction && <p>{step.instruction}</p>}
                {step.source_wording && step.source_wording !== step.instruction && (
                  <p className="text-muted-foreground italic border-l-2 pl-2">Source wording: “{step.source_wording}”</p>
                )}
                {step.bom_item_ids.length > 0 && (
                  <p className="text-muted-foreground">
                    Consumes:{' '}
                    {step.bom_item_ids
                      .map((id) => {
                        const item = assemblyItems.find((i) => i.id === id);
                        if (!item) return null;
                        const child = (parts ?? []).find((p) => p.id === item.child_part_id);
                        return `item ${item.item_number} (${child?.part_number ?? '?'})`;
                      })
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {(step.tools || step.specs || step.inspection) && (
                  <div className="grid gap-1 text-muted-foreground">
                    {step.tools && <p>Tools/fixtures: {step.tools}</p>}
                    {step.specs && <p>Specifications: {step.specs}</p>}
                    {step.inspection && <p>Inspection: {step.inspection}</p>}
                  </div>
                )}
                {step.source_drawing_id && (
                  <Button size="sm" variant="outline" onClick={() => openSource(step.source_drawing_id, step.source_page)}>
                    <FileText className="h-4 w-4 mr-1" /> Source{step.source_page ? ` (page ${step.source_page})` : ''}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {childAssemblies.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Subassembly processes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {childAssemblies.map((child) => (
                <Button
                  key={child.id}
                  variant="outline"
                  onClick={() => navigate(`/assembly-explorer/process/${child.id}`)}
                >
                  {child.part_number} — {child.description ?? 'subassembly'}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {editing && (
          <StepEditor
            step={editing}
            assemblyItems={assemblyItems}
            parts={parts ?? []}
            allSteps={sorted}
            onClose={() => setEditing(null)}
            onSave={(step) => {
              saveStep.mutate(step as Partial<AeProcessStep> & { assembly_part_id: string });
              setEditing(null);
            }}
          />
        )}
      </main>
    </AppLayout>
  );
};

async function fetchDrawingPath(drawingId: string): Promise<string | null> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase.from('ae_drawings').select('storage_path').eq('id', drawingId).single();
  return data?.storage_path ?? null;
}

const StepEditor = ({
  step,
  assemblyItems,
  parts,
  allSteps,
  onClose,
  onSave,
}: {
  step: Partial<AeProcessStep>;
  assemblyItems: AeBomItem[];
  parts: import('@/types/assemblyExplorer').AePart[];
  allSteps: AeProcessStep[];
  onClose: () => void;
  onSave: (step: Partial<AeProcessStep>) => void;
}) => {
  const [draft, setDraft] = useState(step);
  const set = (patch: Partial<AeProcessStep>) => setDraft((d) => ({ ...d, ...patch }));

  const toggleId = (list: string[] | undefined, id: string) => {
    const current = list ?? [];
    return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>{step.id ? 'Edit step' : 'New step'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Operation title</Label>
            <Input value={draft.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <Label>Instruction</Label>
            <Textarea value={draft.instruction ?? ''} onChange={(e) => set({ instruction: e.target.value })} />
          </div>
          <div>
            <Label>Original source wording (if copied from a drawing)</Label>
            <Textarea value={draft.source_wording ?? ''} onChange={(e) => set({ source_wording: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Origin</Label>
              <Select value={draft.origin ?? 'manual'} onValueChange={(v) => set({ origin: v as AeStepOrigin })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="drawing">From drawing</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="ai">AI proposal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={draft.status ?? 'draft'} onValueChange={(v) => set({ status: v as 'draft' | 'reviewed' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Components consumed / joined (BOM callouts of this assembly)</Label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {assemblyItems.map((item) => {
                const child = parts.find((p) => p.id === item.child_part_id);
                return (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(draft.bom_item_ids ?? []).includes(item.id)}
                      onCheckedChange={() => set({ bom_item_ids: toggleId(draft.bom_item_ids, item.id) })}
                    />
                    Item {item.item_number} — {child?.part_number ?? '?'}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Predecessors</Label>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {allSteps.filter((s) => s.id !== step.id).map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={(draft.predecessor_ids ?? []).includes(s.id)}
                    onCheckedChange={() => set({ predecessor_ids: toggleId(draft.predecessor_ids, s.id) })}
                  />
                  {s.title}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tools / fixtures</Label>
              <Input value={draft.tools ?? ''} onChange={(e) => set({ tools: e.target.value })} />
            </div>
            <div>
              <Label>Specifications</Label>
              <Input value={draft.specs ?? ''} onChange={(e) => set({ specs: e.target.value })} />
            </div>
            <div>
              <Label>Inspection criteria</Label>
              <Input value={draft.inspection ?? ''} onChange={(e) => set({ inspection: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.needs_review ?? false}
              onCheckedChange={(v) => set({ needs_review: !!v })}
            />
            Requires engineering review
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => draft.title?.trim() ? onSave(draft) : toast.error('Title is required')}>
              Save step
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssemblyProcess;
