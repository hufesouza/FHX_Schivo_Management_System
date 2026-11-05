export type AeSide = 'left' | 'right' | 'common';
export type AePartType = 'finished_good' | 'subassembly' | 'component';
export type AeStatus = 'draft' | 'reviewed';
export type AeStepOrigin = 'drawing' | 'manual' | 'ai';
export type AeSourcingType = 'unknown' | 'manufactured' | 'purchased';

export type AePartSourcing = Pick<AePart, 'sourcing_type' | 'manufacturing_location' | 'supplier_name'>;

export const SOURCING_LABELS: Record<AeSourcingType, string> = {
  unknown: 'Not classified',
  manufactured: 'Manufactured',
  purchased: 'Purchased',
};

export function sourcingDetail(part: AePartSourcing): string {
  if (part.sourcing_type === 'manufactured') return part.manufacturing_location?.trim() || 'Manufacturing location not set';
  if (part.sourcing_type === 'purchased') return part.supplier_name?.trim() || 'Supplier not set';
  return 'Make / buy not set';
}

export function normalizeSourcing(input: AePartSourcing): AePartSourcing {
  return {
    sourcing_type: input.sourcing_type,
    manufacturing_location: input.sourcing_type === 'manufactured' ? input.manufacturing_location?.trim() || null : null,
    supplier_name: input.sourcing_type === 'purchased' ? input.supplier_name?.trim() || null : null,
  };
}

export interface AeDrawing {
  id: string;
  file_name: string;
  storage_path: string;
  drawing_number: string | null;
  revision: string | null;
  filename_revision: string | null;
  revision_discrepancy: boolean;
  description: string | null;
  page_count: number | null;
  status: AeStatus;
  extraction: AeExtraction | null;
  issues: AeIssue[];
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AeIssue {
  type: 'revision_discrepancy' | 'missing_referenced_drawing' | 'low_confidence' | 'duplicate' | 'ambiguous';
  message: string;
  field?: string;
}

export interface AeExtraction {
  drawing_number: string | null;
  revision: string | null;
  description: string | null;
  assemblies: {
    part_number: string;
    description: string | null;
    side: AeSide;
    kind: 'finished_good' | 'subassembly';
  }[];
  bom_tables: {
    parent_part_number: string;
    side: AeSide;
    page: number | null;
    rows: {
      item_number: string;
      component_number: string | null;
      description: string | null;
      quantity: number | null;
      referenced_drawing: string | null;
      page: number | null;
    }[];
  }[];
  referenced_drawings: string[];
  notes: {
    text: string;
    page: number | null;
    applies_to: AeSide | null;
    is_process_instruction: boolean;
  }[];
  low_confidence: string[];
}

export interface AePart {
  id: string;
  part_number: string;
  description: string | null;
  part_type: AePartType;
  sourcing_type: AeSourcingType;
  manufacturing_location: string | null;
  supplier_name: string | null;
  side: AeSide;
  drawing_number: string | null;
  drawing_id: string | null;
  status: AeStatus;
  created_at: string;
  updated_at: string;
}

export interface AeBomItem {
  id: string;
  parent_part_id: string;
  child_part_id: string;
  item_number: string;
  quantity: number;
  side: AeSide;
  source_drawing_id: string | null;
  source_page: number | null;
  source_row: string | null;
  status: AeStatus;
  created_at: string;
  updated_at: string;
}

export interface AeProcessStep {
  id: string;
  assembly_part_id: string;
  title: string;
  instruction: string | null;
  source_wording: string | null;
  origin: AeStepOrigin;
  bom_item_ids: string[];
  predecessor_ids: string[];
  tools: string | null;
  specs: string | null;
  inspection: string | null;
  source_drawing_id: string | null;
  source_page: number | null;
  source_note: string | null;
  sequence: number;
  status: AeStatus;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export type VariantMode = 'left' | 'right' | 'compare';

/** Keep the selected assembly aligned with the side filter, preferring its drawing family. */
export function resolveAssemblyRoot(parts: AePart[], selectedId: string | null, variant: VariantMode): AePart | null {
  const assemblies = parts.filter((part) => part.part_type === 'finished_good');
  const selected = assemblies.find((part) => part.id === selectedId);
  if (variant === 'compare') return selected ?? assemblies[0] ?? null;
  if (selected && sideVisible(selected.side, variant)) return selected;
  const matching = assemblies.filter((part) => part.side === variant);
  return matching.find((part) => selected?.drawing_id && part.drawing_id === selected.drawing_id)
    ?? matching[0]
    ?? assemblies.find((part) => part.side === 'common')
    ?? null;
}

/** A BOM item is visible for a variant when it is common or matches the side. */
export function sideVisible(itemSide: AeSide, variant: VariantMode): boolean {
  if (variant === 'compare') return true;
  return itemSide === 'common' || itemSide === variant;
}

export interface BomTreeNode {
  part: AePart;
  item: AeBomItem | null; // null for the root
  children: BomTreeNode[];
  /** rolled-up quantity relative to the tree root */
  rolledQty: number;
  /** true when this part appears more than once anywhere in the tree */
  repeated: boolean;
  /** true when a cycle was cut here */
  cycleCut: boolean;
}

/**
 * Build an assembly tree from stored relationships.
 * Multiplies quantities along each path and marks repeated uses.
 * Cycles are cut and flagged (the DB trigger prevents them, this is a safety net).
 */
export function buildBomTree(
  rootPartId: string,
  parts: AePart[],
  items: AeBomItem[],
  variant: VariantMode,
): BomTreeNode | null {
  const partById = new Map(parts.map((p) => [p.id, p]));
  const childrenByParent = new Map<string, AeBomItem[]>();
  for (const item of items) {
    if (!sideVisible(item.side, variant)) continue;
    const list = childrenByParent.get(item.parent_part_id) ?? [];
    list.push(item);
    childrenByParent.set(item.parent_part_id, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.item_number.localeCompare(b.item_number, undefined, { numeric: true }));
  }

  const usageCount = new Map<string, number>();

  const build = (partId: string, item: AeBomItem | null, qty: number, ancestry: Set<string>): BomTreeNode | null => {
    const part = partById.get(partId);
    if (!part) return null;
    usageCount.set(partId, (usageCount.get(partId) ?? 0) + 1);
    if (ancestry.has(partId)) {
      return { part, item, children: [], rolledQty: qty, repeated: true, cycleCut: true };
    }
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(partId);
    const childItems = childrenByParent.get(partId) ?? [];
    const children: BomTreeNode[] = [];
    for (const childItem of childItems) {
      const child = build(childItem.child_part_id, childItem, qty * Number(childItem.quantity), nextAncestry);
      if (child) children.push(child);
    }
    return { part, item, children, rolledQty: qty, repeated: false, cycleCut: false };
  };

  const root = build(rootPartId, null, 1, new Set());
  if (!root) return null;

  // Mark parts that appear more than once anywhere in the tree
  const markRepeated = (node: BomTreeNode) => {
    node.repeated = (usageCount.get(node.part.id) ?? 0) > 1;
    node.children.forEach(markRepeated);
  };
  markRepeated(root);
  return root;
}

/** Sum the rolled-up quantity of every occurrence of a part within a tree. */
export function rolledUpQuantity(root: BomTreeNode, partId: string): number {
  let total = 0;
  const walk = (node: BomTreeNode) => {
    if (node.part.id === partId) total += node.rolledQty;
    node.children.forEach(walk);
  };
  walk(root);
  return total;
}

/** Collect the path of part numbers from the root to a target part id (for search highlighting). */
export function findPath(root: BomTreeNode, partId: string): string[] | null {
  if (root.part.id === partId) return [root.part.id];
  for (const child of root.children) {
    const sub = findPath(child, partId);
    if (sub) return [root.part.id, ...sub];
  }
  return null;
}

export const SIDE_LABELS: Record<AeSide, string> = {
  left: 'Left',
  right: 'Right',
  common: 'Common',
};

export const PART_TYPE_LABELS: Record<AePartType, string> = {
  finished_good: 'Finished good',
  subassembly: 'Subassembly',
  component: 'Component',
};
