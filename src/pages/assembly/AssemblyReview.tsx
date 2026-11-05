import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import {
  getDrawingSignedUrl,
  useAeDrawings,
  useConfirmDrawing,
} from '@/hooks/useAssemblyExplorer';
import type { AeExtraction, AeSide } from '@/types/assemblyExplorer';
import { toast } from 'sonner';

const SIDES: AeSide[] = ['left', 'right', 'common'];

const AssemblyReview = () => {
  const { drawingId } = useParams<{ drawingId: string }>();
  const navigate = useNavigate();
  const { data: drawings, isLoading } = useAeDrawings();
  const confirm = useConfirmDrawing();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<AeExtraction | null>(null);

  const drawing = useMemo(
    () => (drawings ?? []).find((d) => d.id === drawingId) ?? null,
    [drawings, drawingId],
  );

  useEffect(() => {
    if (drawing?.storage_path) {
      getDrawingSignedUrl(drawing.storage_path).then(setPdfUrl);
    }
  }, [drawing?.storage_path]);

  useEffect(() => {
    if (drawing?.extraction && !draft) {
      setDraft(JSON.parse(JSON.stringify(drawing.extraction)) as AeExtraction);
    }
  }, [drawing?.extraction, draft]);

  if (isLoading) {
    return (
      <AppLayout title="Assembly Explorer" subtitle="Review extraction" showBackButton backTo="/assembly-explorer/upload">
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!drawing || !draft) {
    return (
      <AppLayout title="Assembly Explorer" subtitle="Review extraction" showBackButton backTo="/assembly-explorer/upload">
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Drawing not found.</p>
        </main>
      </AppLayout>
    );
  }

  const update = (patch: Partial<AeExtraction>) => setDraft({ ...draft, ...patch });

  const handlePublish = async () => {
    if (!draft.drawing_number) {
      toast.error('Drawing number is required before publishing');
      return;
    }
    await confirm.mutateAsync({ drawing, extraction: draft });
    navigate('/assembly-explorer');
  };

  return (
    <AppLayout title="Assembly Explorer" subtitle={`Review ${drawing.file_name}`} showBackButton backTo="/assembly-explorer/upload">
      <main className="px-4 py-6 grid gap-4 lg:grid-cols-2">
        {/* Source PDF */}
        <Card className="h-[calc(100vh-140px)] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Source drawing</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full rounded-md border" title="Source PDF" />
            ) : (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editable extraction */}
        <div className="space-y-4 h-[calc(100vh-140px)] overflow-y-auto pr-1">
          {drawing.issues?.length > 0 && (
            <Card className="border-amber-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Review issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {drawing.issues.map((issue, i) => (
                  <p key={i} className="text-sm text-amber-700 dark:text-amber-400">
                    • {issue.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Title block</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div>
                <Label>Drawing number</Label>
                <Input
                  value={draft.drawing_number ?? ''}
                  onChange={(e) => update({ drawing_number: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Revision (title block)</Label>
                <Input
                  value={draft.revision ?? ''}
                  onChange={(e) => update({ revision: e.target.value || null })}
                />
                {drawing.filename_revision && (
                  <p className="text-xs text-muted-foreground mt-1">Filename: REV-{drawing.filename_revision}</p>
                )}
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={draft.description ?? ''}
                  onChange={(e) => update({ description: e.target.value || null })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base">Assemblies defined by this drawing</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  update({
                    assemblies: [
                      ...(draft.assemblies ?? []),
                      { part_number: '', description: null, side: 'common', kind: 'finished_good' },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(draft.assemblies ?? []).map((asm, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_110px_130px_32px] gap-2 items-center">
                  <Input
                    placeholder="Part number"
                    value={asm.part_number}
                    onChange={(e) => {
                      const assemblies = [...draft.assemblies];
                      assemblies[i] = { ...asm, part_number: e.target.value };
                      update({ assemblies });
                    }}
                  />
                  <Input
                    placeholder="Description"
                    value={asm.description ?? ''}
                    onChange={(e) => {
                      const assemblies = [...draft.assemblies];
                      assemblies[i] = { ...asm, description: e.target.value || null };
                      update({ assemblies });
                    }}
                  />
                  <Select
                    value={asm.side}
                    onValueChange={(v) => {
                      const assemblies = [...draft.assemblies];
                      assemblies[i] = { ...asm, side: v as AeSide };
                      update({ assemblies });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIDES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={asm.kind}
                    onValueChange={(v) => {
                      const assemblies = [...draft.assemblies];
                      assemblies[i] = { ...asm, kind: v as 'finished_good' | 'subassembly' };
                      update({ assemblies });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finished_good">Finished good</SelectItem>
                      <SelectItem value="subassembly">Subassembly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => update({ assemblies: draft.assemblies.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {(draft.assemblies ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No assemblies extracted.</p>
              )}
            </CardContent>
          </Card>

          {(draft.bom_tables ?? []).map((table, ti) => (
            <Card key={ti}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  BOM — parent
                  <Input
                    className="w-40 h-8"
                    value={table.parent_part_number}
                    onChange={(e) => {
                      const bom_tables = [...draft.bom_tables];
                      bom_tables[ti] = { ...table, parent_part_number: e.target.value };
                      update({ bom_tables });
                    }}
                  />
                  <Badge variant="outline">{table.side}</Badge>
                  {table.page && <Badge variant="secondary">page {table.page}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-[64px_1fr_1fr_72px_1fr_32px] gap-2 text-xs text-muted-foreground font-medium">
                  <span>Item</span><span>Component no.</span><span>Description</span><span>Qty</span><span>Ref. drawing</span><span />
                </div>
                {table.rows.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-[64px_1fr_1fr_72px_1fr_32px] gap-2 items-center">
                    <Input
                      value={row.item_number}
                      onChange={(e) => {
                        const bom_tables = [...draft.bom_tables];
                        const rows = [...table.rows];
                        rows[ri] = { ...row, item_number: e.target.value };
                        bom_tables[ti] = { ...table, rows };
                        update({ bom_tables });
                      }}
                    />
                    <Input
                      value={row.component_number ?? ''}
                      onChange={(e) => {
                        const bom_tables = [...draft.bom_tables];
                        const rows = [...table.rows];
                        rows[ri] = { ...row, component_number: e.target.value || null };
                        bom_tables[ti] = { ...table, rows };
                        update({ bom_tables });
                      }}
                    />
                    <Input
                      value={row.description ?? ''}
                      onChange={(e) => {
                        const bom_tables = [...draft.bom_tables];
                        const rows = [...table.rows];
                        rows[ri] = { ...row, description: e.target.value || null };
                        bom_tables[ti] = { ...table, rows };
                        update({ bom_tables });
                      }}
                    />
                    <Input
                      type="number"
                      value={row.quantity ?? ''}
                      onChange={(e) => {
                        const bom_tables = [...draft.bom_tables];
                        const rows = [...table.rows];
                        rows[ri] = { ...row, quantity: e.target.value ? Number(e.target.value) : null };
                        bom_tables[ti] = { ...table, rows };
                        update({ bom_tables });
                      }}
                    />
                    <Input
                      value={row.referenced_drawing ?? ''}
                      onChange={(e) => {
                        const bom_tables = [...draft.bom_tables];
                        const rows = [...table.rows];
                        rows[ri] = { ...row, referenced_drawing: e.target.value || null };
                        bom_tables[ti] = { ...table, rows };
                        update({ bom_tables });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const bom_tables = [...draft.bom_tables];
                        bom_tables[ti] = { ...table, rows: table.rows.filter((_, j) => j !== ri) };
                        update({ bom_tables });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const bom_tables = [...draft.bom_tables];
                    bom_tables[ti] = {
                      ...table,
                      rows: [
                        ...table.rows,
                        { item_number: String(table.rows.length + 1), component_number: null, description: null, quantity: 1, referenced_drawing: null, page: table.page },
                      ],
                    };
                    update({ bom_tables });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add row
                </Button>
              </CardContent>
            </Card>
          ))}

          {(draft.notes ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Drawing notes (original wording preserved)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {draft.notes.map((note, i) => (
                  <div key={i} className="rounded-md border p-2 text-sm">
                    <p>{note.text}</p>
                    <div className="flex gap-2 mt-1">
                      {note.page && <Badge variant="secondary">page {note.page}</Badge>}
                      {note.applies_to && <Badge variant="outline">{note.applies_to}</Badge>}
                      {note.is_process_instruction && <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/30">process instruction</Badge>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 pb-4">
            <Button variant="outline" onClick={() => navigate('/assembly-explorer/upload')}>
              Back
            </Button>
            <Button onClick={handlePublish} disabled={confirm.isPending}>
              {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm & publish
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default AssemblyReview;
