/// <reference types="node" />
import { describe, test } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { normalizeSourcing, sourcingDetail } from './assemblyExplorer';

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