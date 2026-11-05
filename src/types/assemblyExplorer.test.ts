import { describe, expect, test } from 'bun:test';
import { normalizeSourcing, sourcingDetail } from './assemblyExplorer';

describe('BOM make / buy sourcing', () => {
  test('manufactured parts retain their manufacturing location, not a supplier', () => {
    const result = normalizeSourcing({ sourcing_type: 'manufactured', manufacturing_location: ' Waterford ', supplier_name: 'Old supplier' });
    expect(result).toEqual({ sourcing_type: 'manufactured', manufacturing_location: 'Waterford', supplier_name: null });
    expect(sourcingDetail(result)).toBe('Waterford');
  });
  test('purchased parts retain their supplier, not a manufacturing location', () => {
    const result = normalizeSourcing({ sourcing_type: 'purchased', manufacturing_location: 'Old site', supplier_name: ' Supplier A ' });
    expect(result).toEqual({ sourcing_type: 'purchased', manufacturing_location: null, supplier_name: 'Supplier A' });
    expect(sourcingDetail(result)).toBe('Supplier A');
  });
  test('unknown sourcing does not invent a supplier or manufacturing location', () => {
    expect(normalizeSourcing({ sourcing_type: 'unknown', manufacturing_location: 'Old site', supplier_name: 'Old supplier' }))
      .toEqual({ sourcing_type: 'unknown', manufacturing_location: null, supplier_name: null });
  });
});