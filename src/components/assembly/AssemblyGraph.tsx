import { useEffect, useMemo, useRef, useState } from 'react';
import type { BomTreeNode } from '@/types/assemblyExplorer';
import { SIDE_LABELS } from '@/types/assemblyExplorer';
import { Button } from '@/components/ui/button';
import { Maximize, Minus, Plus } from 'lucide-react';

const NODE_W = 230;
const NODE_H = 86;
const H_GAP = 60;
const V_GAP = 20;

interface LayoutNode {
  node: BomTreeNode;
  x: number;
  y: number;
  parent?: LayoutNode;
}

interface Props {
  root: BomTreeNode | null;
  collapsed: Set<string>;
  onToggle: (partId: string) => void;
  selectedId: string | null;
  onSelect: (node: BomTreeNode) => void;
  highlightPath: Set<string>;
}

/** Layout the visible tree: children stacked vertically, parents centred. */
function layoutTree(
  root: BomTreeNode,
  collapsed: Set<string>,
): { nodes: LayoutNode[]; width: number; height: number } {
  const nodes: LayoutNode[] = [];
  let maxX = 0;
  let maxY = 0;

  const place = (node: BomTreeNode, depth: number, topY: number, parent?: LayoutNode): { layout: LayoutNode; height: number } => {
    const isCollapsed = collapsed.has(node.part.id);
    const visibleChildren = isCollapsed ? [] : node.children;
    const x = depth * (NODE_W + H_GAP);

    if (visibleChildren.length === 0) {
      const layout: LayoutNode = { node, x, y: topY, parent };
      nodes.push(layout);
      maxX = Math.max(maxX, x + NODE_W);
      maxY = Math.max(maxY, topY + NODE_H);
      return { layout, height: NODE_H };
    }

    let cursor = topY;
    const childLayouts: LayoutNode[] = [];
    for (const child of visibleChildren) {
      const { layout, height } = place(child, depth + 1, cursor);
      childLayouts.push(layout);
      cursor += height + V_GAP;
    }
    const totalHeight = cursor - topY - V_GAP;
    const first = childLayouts[0];
    const last = childLayouts[childLayouts.length - 1];
    const y = (first.y + last.y) / 2;
    const layoutNode: LayoutNode = { node, x, y, parent };
    nodes.push(layoutNode);
    // Fix up parent pointers after layout nodes exist
    for (const childLayout of childLayouts) {
      fixParent(childLayout, layoutNode);
    }
    maxX = Math.max(maxX, x + NODE_W);
    return { layout: layoutNode, height: totalHeight };
  };

  const fixParent = (layout: LayoutNode, parent: LayoutNode) => {
    layout.parent = parent;
  };

  place(root, 0, 0);
  return { nodes, width: maxX, height: maxY };
}

const sideBadgeClass = (side: string) =>
  side === 'left'
    ? 'fill-sky-600'
    : side === 'right'
      ? 'fill-violet-600'
      : 'fill-slate-500';

const AssemblyGraph = ({ root, collapsed, onToggle, selectedId, onSelect, highlightPath }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 40, y: 40, zoom: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const { nodes, width, height } = useMemo(
    () => (root ? layoutTree(root, collapsed) : { nodes: [], width: 0, height: 0 }),
    [root, collapsed],
  );

  // Non-passive wheel listener for zoom (React onWheel is passive)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const { x, y, zoom } = viewRef.current;
      const next = Math.min(2.5, Math.max(0.15, zoom * Math.exp(-dy * 0.0015)));
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const k = next / zoom;
      setView({ zoom: next, x: px - (px - x) * k, y: py - (py - y) * k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const fitToScreen = () => {
    const el = containerRef.current;
    if (!el || width === 0) return;
    const rect = el.getBoundingClientRect();
    const zoom = Math.min(1.2, Math.min((rect.width - 80) / width, (rect.height - 80) / height));
    setView({
      zoom,
      x: (rect.width - width * zoom) / 2,
      y: (rect.height - height * zoom) / 2,
    });
  };

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = rect.width / 2;
    const py = rect.height / 2;
    const { x, y, zoom } = viewRef.current;
    const next = Math.min(2.5, Math.max(0.15, zoom * factor));
    const k = next / zoom;
    setView({ zoom: next, x: px - (px - x) * k, y: py - (py - y) * k });
  };

  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root?.part.id]);

  if (!root) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a finished assembly to explore its structure.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-muted/20 cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => {
        dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: view.x, baseY: view.y };
      }}
      onMouseMove={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        setView((v) => ({ ...v, x: drag.baseX + e.clientX - drag.startX, y: drag.baseY + e.clientY - drag.startY }));
      }}
      onMouseUp={() => (dragRef.current = null)}
      onMouseLeave={() => (dragRef.current = null)}
    >
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <Button size="icon" variant="secondary" onClick={() => zoomBy(1.2)}><Plus className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" onClick={() => zoomBy(1 / 1.2)}><Minus className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" onClick={fitToScreen}><Maximize className="h-4 w-4" /></Button>
      </div>

      <svg
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.zoom})`}>
          {/* edges */}
          {nodes
            .filter((n) => n.parent)
            .map((n) => {
              const p = n.parent!;
              const x1 = p.x + NODE_W;
              const y1 = p.y + NODE_H / 2;
              const x2 = n.x;
              const y2 = n.y + NODE_H / 2;
              const midX = (x1 + x2) / 2;
              const highlighted = highlightPath.has(n.node.part.id) && highlightPath.has(p.node.part.id);
              return (
                <path
                  key={`e-${p.node.part.id}-${n.node.part.id}-${n.node.item?.id ?? 'root'}`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  className={highlighted ? 'stroke-primary' : 'stroke-border'}
                  strokeWidth={highlighted ? 3 : 1.5}
                />
              );
            })}

          {/* nodes */}
          {nodes.map((n) => {
            const { node } = n;
            const selected = selectedId === node.part.id;
            const highlighted = highlightPath.has(node.part.id);
            const hasChildren = node.children.length > 0;
            const isCollapsed = collapsed.has(node.part.id);
            const childCount = node.children.length;
            return (
              <g
                key={`${node.part.id}-${node.item?.id ?? 'root'}-${n.x}`}
                transform={`translate(${n.x},${n.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(node);
                }}
                className="cursor-pointer"
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  className={`${
                    selected
                      ? 'fill-primary/10 stroke-primary'
                      : highlighted
                        ? 'fill-primary/5 stroke-primary/60'
                        : 'fill-card stroke-border hover:stroke-primary/40'
                  }`}
                  strokeWidth={selected ? 2.5 : 1.5}
                />
                {/* side stripe */}
                <rect width={5} height={NODE_H} rx={2} className={sideBadgeClass(node.item?.side ?? node.part.side)} />
                <text x={14} y={20} className="fill-foreground" fontSize={12} fontWeight={600}>
                  {(node.part.description ?? node.part.part_number).slice(0, 30)}
                </text>
                <text x={14} y={38} className="fill-muted-foreground" fontSize={11}>
                  {node.part.part_type === 'finished_good' ? 'FG' : 'PN'}: {node.part.part_number}
                </text>
                <text x={14} y={54} className="fill-muted-foreground" fontSize={11}>
                  {node.part.drawing_number ? `DWG: ${node.part.drawing_number}` : 'Referenced drawing missing'}
                </text>
                <text x={14} y={70} className="fill-muted-foreground" fontSize={10}>
                  {SIDE_LABELS[node.item?.side ?? node.part.side]}
                  {node.item ? ` · Item ${node.item.item_number} · Qty ${node.item.quantity}` : ''}
                  {node.part.status === 'draft' ? ' · DRAFT' : ''}
                  {node.repeated ? ' · shared' : ''}
                </text>
                {hasChildren && (
                  <g
                    transform={`translate(${NODE_W - 22}, ${NODE_H / 2 - 11})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(node.part.id);
                    }}
                  >
                    <circle cx={11} cy={11} r={11} className="fill-secondary stroke-border" />
                    <text x={11} y={15} textAnchor="middle" fontSize={12} className="fill-foreground">
                      {isCollapsed ? `+${childCount}` : '−'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default AssemblyGraph;
