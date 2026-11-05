/// <reference types="node" />
import { describe, test } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { normalizeSourcing, sourcingDetail, resolveAssemblyRoot, buildBomTree, type AePart, type AeBomItem } from './assemblyExplorer';

describe('BOM make / buy sourcing', () => {
  test('manufactured parts retain their manufacturing location, not a supplier', () => {
    const result = normalizeSourcing({ sourcing_type: 'manufactured', manufacturing_location: ' Waterford ', supplier_name: 'Old supplier' });
    deepStrictEqual(result, { sourcing_type: 'manufactured', manufacturing_location: 'Waterford', supplier_name: null });
    strictEqual(sourcingDetail(result), 'Waterford');
  });
  test('purchased parts retain their supplier, not a manufacturing location', () => {
    const result = normalizeSourcing({ sourcing_type: 'purchased', manufacturing_location: 'Old site', supplier_name: ' Supplier A ' });
    deepStrictEqual(result, { sourcing_type: 'purchased', manufacturing_location: null, supplier_name: 'Supplier A' });
    strictEqual(sourcingDetail(result), 'Supplier A');
  });
  test('unknown sourcing does not invent a supplier or manufacturing location', () => {
    deepStrictEqual(normalizeSourcing({ sourcing_type: 'unknown', manufacturing_location: 'Old site', supplier_name: 'Old supplier' }),
      { sourcing_type: 'unknown', manufacturing_location: null, supplier_name: null });
  });
});

const part = (id: string, side: AePart['side'], part_type: AePart['part_type'] = 'finished_good', drawing_id = 'drawing-1'): AePart => ({
  id, part_number: id, description: null, part_type, side, drawing_id, drawing_number: null,
  sourcing_type: 'unknown', manufacturing_location: null, supplier_name: null,
  status: 'reviewed', created_at: '', updated_at: '',
});

describe('BOM assembly side selection', () => {
  const parts = [part('451570105', 'left'), part('other-right', 'right', 'finished_good', 'drawing-2'), part('451570106', 'right'), part('rh-body', 'right', 'component')];
  test('Right selects the Right assembly from the same drawing and displays its components', () => {
    const root = resolveAssemblyRoot(parts, '451570105', 'right');
    strictEqual(root?.id, '451570106');
    const items: AeBomItem[] = [{ id: 'rh-item', parent_part_id: '451570106', child_part_id: 'rh-body', item_number: '1', quantity: 1, side: 'right', source_drawing_id: 'drawing-1', source_page: 1, source_row: null, status: 'reviewed', created_at: '', updated_at: '' }];
    deepStrictEqual(buildBomTree(root?.id ?? '', parts, items, 'right')?.children.map((node) => node.part.id), ['rh-body']);
  });
  test('Left selects the Left assembly when switching back from Right', () => {
    strictEqual(resolveAssemblyRoot(parts, '451570106', 'left')?.id, '451570105');
  });
  test('Compare preserves the selected assembly', () => {
    strictEqual(resolveAssemblyRoot(parts, '451570106', 'compare')?.id, '451570106');
  });
  test('a missing Right assembly does not display a Left assembly under the Right filter', () => {
    strictEqual(resolveAssemblyRoot([parts[0]], '451570105', 'right'), null);
  });
});