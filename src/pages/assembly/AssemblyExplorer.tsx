import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  GitBranch,
  ListTree,
  Loader2,
  Search,
  Upload,
} from 'lucide-react';
import AssemblyGraph from '@/components/assembly/AssemblyGraph';
import PartSourcingEditor from '@/components/assembly/PartSourcingEditor';
import {
  buildBomTree,
  findPath,
  rolledUpQuantity,
  SIDE_LABELS,
  PART_TYPE_LABELS,
  SOURCING_LABELS,
  sourcingDetail,
  type AeBomItem,
  type AePart,
  type BomTreeNode,
  type VariantMode,
} from '@/types/assemblyExplorer';
import {
  getDrawingSignedUrl,
  useAeBomItems,
  useAeDrawings,
  useAeParts,
  useDeleteBomItem,
  useUpdateBomItem,
} from '@/hooks/useAssemblyExplorer';
import { useAeProcessSteps } from '@/hooks/useAssemblyExplorer';
import { toast } from 'sonner';

const AssemblyExplorer = () => {
  const navigate = useNavigate();
  const { data: drawings, isLoading: drawingsLoading } = useAeDrawings();
  const { data: parts, isLoading: partsLoading } = useAeParts();
  const { data: bomItems, isLoading: itemsLoading } = useAeBomItems();

  const [variant, setVariant] = useState<VariantMode>('left');
  const [rootId, setRootId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<BomTreeNode | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'graph' | 'bom'>('graph');
  const [filter, setFilter] = useState<'all' | 'shared' | 'side' | 'unresolved'>('all');
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const updateItem = useUpdateBomItem();
  const deleteItem = useDeleteBomItem();

  const finishedGoods = useMemo(
    () => (parts ?? []).filter((p) => p.part_type === 'finished_good'),
    [parts],
  );

  const effectiveRootId = rootId ?? finishedGoods[0]?.id ?? null;
  const currentSelected = selected ? { ...selected, part: (parts ?? []).find((p) => p.id === selected.part.id) ?? selected.part } : null;

  const tree = useMemo(() => {
    if (!effectiveRootId || !parts || !bomItems) return null;
    let t = buildBomTree(effectiveRootId, parts, bomItems, variant);
    if (!t) return null;
    if (filter === 'shared' || filter === 'side' || filter === 'unresolved') {
      const keep = (node: BomTreeNode): BomTreeNode | null => {
        const children = node.children.map(keep).filter((c): c is BomTreeNode => !!c);
        const matches =
          filter === 'shared'
            ? node.repeated
            : filter === 'side'
              ? (node.item?.side ?? node.part.side) !== 'common'
              : !node.part.drawing_number && node.part.part_type !== 'finished_good';
        if (matches || children.length > 0) return { ...node, children };
        return null;
      };
      t = keep(t);
    }
    return t;
  }, [effectiveRootId, parts, bomItems, variant, filter]);

  const highlightPath = useMemo(() => {
    if (!tree || !search.trim()) return new Set<string>();
    const q = search.trim().toLowerCase();
    const matches = new Set<string>();
    const walk = (node: BomTreeNode) => {
      const hay = `${node.part.part_number} ${node.part.description ?? ''} ${node.part.drawing_number ?? ''} ${node.part.manufacturing_location ?? ''} ${node.part.supplier_name ?? ''}`.toLowerCase();
      if (hay.includes(q)) {
        const path = findPath(tree, node.part.id);
        path?.forEach((id) => matches.add(id));
      }
      node.children.forEach(walk);
    };
    walk(tree);
    return matches;
  }, [tree, search]);

  const toggleCollapse = (partId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  };

  const openSource = async (drawingId: string | null, page?: number | null) => {
    if (!drawingId) return;
    const drawing = (drawings ?? []).find((d) => d.id === drawingId);
    if (!drawing) return;
    const url = await getDrawingSignedUrl(drawing.storage_path);
    if (url) setSourceUrl(`${url}#page=${page ?? 1}`);
    else toast.error('Could not open the source drawing');
  };

  const loading = drawingsLoading || partsLoading || itemsLoading;

  return (
    <AppLayout title="Assembly Explorer" subtitle="Interactive assembly structure" showBackButton backTo="/npi">
      <div className="flex flex-col lg:flex-row min-h-[700px] lg:h-[calc(100vh-64px)]">
        {/* Left sidebar */}
        <aside className="w-full lg:w-60 lg:shrink-0 border-r flex flex-col max-h-72 lg:max-h-none">
          <div className="p-3 space-y-3">
            <Button className="w-full" onClick={() => navigate('/assembly-explorer/upload')}>
              <Upload className="h-4 w-4 mr-2" /> Upload drawings
            </Button>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search part, description, drawing…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ToggleGroup
              type="single"
              value={variant}
              onValueChange={(v) => v && setVariant(v as VariantMode)}
              className="justify-start"
            >
              <ToggleGroupItem value="left">Left</ToggleGroupItem>
              <ToggleGroupItem value="right">Right</ToggleGroupItem>
              <ToggleGroupItem value="compare">Compare</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="single"
              value={filter}
              onValueChange={(v) => v && setFilter(v as typeof filter)}
              className="justify-start flex-wrap"
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="shared">Shared</ToggleGroupItem>
              <ToggleGroupItem value="side">Side-specific</ToggleGroupItem>
              <ToggleGroupItem value="unresolved">Unresolved</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Finished assemblies
              </p>
              {finishedGoods.map((fg) => (
                <button
                  key={fg.id}
                  onClick={() => {
                    setRootId(fg.id);
                    setSelected(null);
                  }}
                  className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                    effectiveRootId === fg.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                  }`}
                >
                  <span className="block truncate">{fg.description ?? fg.part_number}</span>
                  <span className="block text-xs text-muted-foreground">
                    {fg.part_number} · {SIDE_LABELS[fg.side]}
                  </span>
                </button>
              ))}
              {finishedGoods.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">No reviewed assemblies yet. Upload drawings to begin.</p>
              )}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
                Drawings
              </p>
              {(drawings ?? []).map((d) => (
                <button
                  key={d.id}
                  onClick={() => navigate(`/assembly-explorer/review/${d.id}`)}
                  className="w-full text-left rounded-md px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{d.drawing_number ?? d.file_name}</span>
                  {d.status === 'draft' && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 ml-auto">Draft</Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Centre */}
        <section className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as typeof viewMode)}
            >
              <ToggleGroupItem value="graph"><GitBranch className="h-4 w-4 mr-1" /> Flowchart</ToggleGroupItem>
              <ToggleGroupItem value="bom"><ListTree className="h-4 w-4 mr-1" /> BOM</ToggleGroupItem>
            </ToggleGroup>
            {selected && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-4 overflow-hidden">
                {tree &&
                  (findPath(tree, selected.part.id) ?? []).map((id, i, arr) => {
                    const p = (parts ?? []).find((pp) => pp.id === id);
                    return (
                      <span key={`${id}-${i}`} className="flex items-center gap-1 whitespace-nowrap">
                        {i > 0 && <ChevronRight className="h-3 w-3" />}
                        <button className="hover:text-primary" onClick={() => {
                          const node = findNode(tree, id);
                          if (node) setSelected(node);
                        }}>
                          {p?.part_number}
                        </button>
                        {i === arr.length - 1 && null}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[500px] lg:min-h-0">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : viewMode === 'graph' ? (
              <AssemblyGraph
                root={tree}
                collapsed={collapsed}
                onToggle={toggleCollapse}
                selectedId={selected?.part.id ?? null}
                onSelect={setSelected}
                highlightPath={highlightPath}
              />
            ) : (
              <ScrollArea className="h-full p-4">
                {tree ? <BomTreeView node={tree} depth={0} onSelect={setSelected} selectedId={selected?.part.id ?? null} /> : (
                  <p className="text-sm text-muted-foreground">Select a finished assembly.</p>
                )}
              </ScrollArea>
            )}
          </div>
        </section>

        {/* Right details panel */}
        <aside className="w-full lg:w-80 lg:shrink-0 border-l overflow-y-auto">
          {currentSelected && tree ? (
            <DetailsPanel
              node={currentSelected}
              tree={tree}
              parts={parts ?? []}
              bomItems={bomItems ?? []}
              onOpenSource={openSource}
              onOpenProcess={(partId) => navigate(`/assembly-explorer/process/${partId}`)}
              onUpdateItem={(id, updates) => updateItem.mutate({ id, updates })}
              onDeleteItem={(id) => {
                if (confirm('Remove this relationship?')) deleteItem.mutate(id);
              }}
            />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              Select a node to see identifiers, where-used, quantities and source evidence.
            </div>
          )}
        </aside>

        {/* Source PDF overlay */}
        {sourceUrl && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setSourceUrl(null)}>
            <div className="w-full max-w-4xl h-full bg-card rounded-lg border shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b">
                <p className="font-medium text-sm">Source drawing</p>
                <Button variant="ghost" size="sm" onClick={() => setSourceUrl(null)}>Close</Button>
              </div>
              <iframe src={sourceUrl} className="flex-1 rounded-b-lg" title="Source drawing" />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

function findNode(root: BomTreeNode, partId: string): BomTreeNode | null {
  if (root.part.id === partId) return root;
  for (const child of root.children) {
    const found = findNode(child, partId);
    if (found) return found;
  }
  return null;
}

const BomTreeView = ({
  node,
  depth,
  onSelect,
  selectedId,
}: {
  node: BomTreeNode;
  depth: number;
  onSelect: (n: BomTreeNode) => void;
  selectedId: string | null;
}) => (
  <div>
    <button
      onClick={() => onSelect(node)}
      className={`w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted ${
        selectedId === node.part.id ? 'bg-primary/10' : ''
      }`}
      style={{ paddingLeft: `${depth * 22 + 8}px` }}
    >
      <span className="font-medium">{node.part.part_number}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-muted-foreground truncate">{node.part.description}</span>
        <span className="block text-xs text-muted-foreground truncate">{SOURCING_LABELS[node.part.sourcing_type ?? 'unknown']} · {sourcingDetail(node.part)}</span>
      </span>
      <Badge variant="outline" className="ml-auto shrink-0">{SIDE_LABELS[node.item?.side ?? node.part.side]}</Badge>
      {node.item && <span className="text-xs text-muted-foreground shrink-0">×{node.item.quantity}</span>}
      {depth > 0 && <span className="text-xs text-muted-foreground shrink-0">(total {node.rolledQty})</span>}
    </button>
    {node.children.map((child) => (
      <BomTreeView key={`${child.part.id}-${child.item?.id}`} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
    ))}
  </div>
);

const DetailsPanel = ({
  node,
  tree,
  parts,
  bomItems,
  onOpenSource,
  onOpenProcess,
  onUpdateItem,
  onDeleteItem,
}: {
  node: BomTreeNode;
  tree: BomTreeNode;
  parts: AePart[];
  bomItems: AeBomItem[];
  onOpenSource: (drawingId: string | null, page?: number | null) => void;
  onOpenProcess: (partId: string) => void;
  onUpdateItem: (id: string, updates: Partial<AeBomItem>) => void;
  onDeleteItem: (id: string) => void;
}) => {
  const { data: steps } = useAeProcessSteps(node.part.id);
  const whereUsed = bomItems.filter((i) => i.child_part_id === node.part.id);
  const parents = whereUsed
    .map((i) => parts.find((p) => p.id === i.parent_part_id))
    .filter(Boolean);
  const missingDrawing = !node.part.drawing_number && node.part.part_type !== 'finished_good' && node.part.sourcing_type !== 'purchased';

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-lg">{node.part.description ?? node.part.part_number}</h3>
          <Badge variant="outline">{SIDE_LABELS[node.part.side]}</Badge>
          <Badge className={node.part.status === 'reviewed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border-amber-500/30'}>
            {node.part.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{PART_TYPE_LABELS[node.part.part_type]}</p>
      </div>

      <PartSourcingEditor key={node.part.id} part={node.part} />

      {missingDrawing && (
        <Card className="border-amber-500/40">
          <CardContent className="py-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Referenced drawing missing — internal components unknown.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identifiers</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <Row label={node.part.part_type === 'finished_good' ? 'Finished good no.' : 'Component no.'} value={node.part.part_number} />
          <Row label="Drawing no." value={node.part.drawing_number ?? '—'} />
          {node.item && <Row label="BOM item (this parent)" value={node.item.item_number} />}
          {node.item && <Row label="Qty per parent" value={String(node.item.quantity)} />}
          <Row label="Rolled-up qty (selected assembly)" value={String(rolledUpQuantity(tree, node.part.id))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Where used</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {parents.length === 0 && <p className="text-muted-foreground">Top-level assembly.</p>}
          {whereUsed.map((i) => {
            const parent = parts.find((p) => p.id === i.parent_part_id);
            return (
              <div key={i.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {parent?.part_number} · item {i.item_number} · ×{i.quantity} · {SIDE_LABELS[i.side]}
                </span>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const qty = prompt('Quantity per parent', String(i.quantity));
                      if (qty && Number(qty) > 0) onUpdateItem(i.id, { quantity: Number(qty) });
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDeleteItem(i.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {node.children.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Direct components</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {node.children.map((c) => (
              <p key={`${c.part.id}-${c.item?.id}`} className="truncate">
                {c.item?.item_number}. {c.part.part_number} — {c.part.description ?? 'no description'} ×{c.item?.quantity}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {node.item?.source_drawing_id && (
          <Button variant="outline" onClick={() => onOpenSource(node.item?.source_drawing_id ?? null, node.item?.source_page)}>
            <FileText className="h-4 w-4 mr-2" /> Open source drawing{node.item.source_page ? ` (page ${node.item.source_page})` : ''}
          </Button>
        )}
        <Button variant="outline" onClick={() => onOpenProcess(node.part.id)}>
          <GitBranch className="h-4 w-4 mr-2" /> Process flow{steps?.length ? ` (${steps.length} steps)` : ''}
        </Button>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default AssemblyExplorer;
