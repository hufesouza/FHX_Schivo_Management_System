import * as XLSX from 'xlsx';
import {
  TEMPLATE_PROFILES,
  type FieldRule,
  type FieldType,
  type TableRule,
  type TemplateProfile,
} from './quotationTemplates';

export interface ExtractedValue<T = unknown> {
  key: string;
  label: string;
  value: T | null;
  confidence: number; // 0 = not found, 1 = exact
  source?: string; // cell reference for traceability
}

export interface ExtractedTableRow {
  [key: string]: { value: unknown; confidence: number } | undefined;
}

export interface ExtractedTable {
  key: string;
  label: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  confidence: number;
}

export interface ExtractionResult {
  profileId: string;
  profileName: string;
  sheetName: string;
  fields: Record<string, ExtractedValue>;
  tables: Record<string, ExtractedTable>;
  missing: string[];
  overallConfidence: number;
}

type Grid = (string | number | boolean | null)[][];

const norm = (v: unknown) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[:*]/g, '')
    .trim()
    .toLowerCase();

const cellRef = (r: number, c: number) => `${XLSX.utils.encode_col(c)}${r + 1}`;

function coerce(raw: unknown, type: FieldType = 'string'): unknown {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str || str === '-' || /^#(div\/0|value|ref|n\/a|name)/i.test(str) || norm(str) === 'select') return null;

  if (type === 'number' || type === 'percent') {
    const cleaned = str.replace(/[€$£,\s]/g, '').replace(/%/g, '');
    const n = parseFloat(cleaned);
    if (isNaN(n)) return null;
    if (type === 'percent') return str.includes('%') || n > 1 ? n / 100 : n;
    return n;
  }
  if (type === 'bool') {
    if (/^(yes|y|true|x|required)$/i.test(str)) return true;
    if (/^(no|n|false|not required)$/i.test(str)) return false;
    return null;
  }
  return str;
}

/** Reads a sheet into a dense grid, expanding merged ranges so every cell carries its value. */
function sheetToGrid(sheet: XLSX.WorkSheet): Grid {
  const grid = XLSX.utils.sheet_to_json<Grid[number]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  }) as Grid;

  const merges = (sheet['!merges'] || []) as XLSX.Range[];
  for (const m of merges) {
    const value = grid[m.s.r]?.[m.s.c] ?? null;
    if (value === null) continue;
    for (let r = m.s.r; r <= m.e.r; r++) {
      if (!grid[r]) grid[r] = [];
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (grid[r][c] === null || grid[r][c] === undefined) grid[r][c] = value;
      }
    }
  }
  return grid;
}

function findLabelCells(grid: Grid, labels: string[]): { r: number; c: number; exact: boolean }[] {
  const wanted = labels.map(norm).filter(Boolean);
  if (!wanted.length) return [];
  const hits: { r: number; c: number; exact: boolean }[] = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) {
      const text = norm(row[c]);
      if (!text || text.length > 60) continue;
      for (const w of wanted) {
        if (text === w) { hits.push({ r, c, exact: true }); break; }
        if (text.startsWith(w) || text.includes(w)) { hits.push({ r, c, exact: false }); break; }
      }
    }
  }
  return hits.sort((a, b) => Number(b.exact) - Number(a.exact));
}

function extractField(grid: Grid, rule: FieldRule): ExtractedValue {
  const type = rule.type || 'string';
  const re = rule.pattern ? new RegExp(rule.pattern, 'i') : null;

  // Direct value scan (e.g. manufacturing type from a known value list)
  if (rule.oneOf?.length) {
    const wanted = rule.oneOf.map(norm);
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r] || [];
      for (let c = 0; c < row.length; c++) {
        const idx = wanted.indexOf(norm(row[c]));
        if (idx >= 0) {
          return { key: rule.key, label: rule.label, value: rule.oneOf[idx], confidence: 0.8, source: cellRef(r, c) };
        }
      }
    }
  }

  const hits = findLabelCells(grid, rule.labels);
  for (const hit of hits) {
    for (let i = 0; i < rule.offsets.length; i++) {
      const [dr, dc] = rule.offsets[i];
      const raw = grid[hit.r + dr]?.[hit.c + dc];
      const value = coerce(raw, type);
      if (value === null || value === '') continue;
      if (re && !re.test(String(raw).trim())) continue;
      const base = hit.exact ? 1 : 0.75;
      const penalty = i * 0.1;
      return {
        key: rule.key,
        label: rule.label,
        value,
        confidence: Math.max(0.4, Math.round((base - penalty) * 100) / 100),
        source: cellRef(hit.r + dr, hit.c + dc),
      };
    }
  }
  return { key: rule.key, label: rule.label, value: null, confidence: 0 };
}

function extractTable(grid: Grid, rule: TableRule): ExtractedTable {
  const allHeaders = rule.columns.flatMap(col => col.headers.map(norm));
  let headerRow = -1;
  let matchCount = 0;

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    const texts = row.map(norm);
    const matched = new Set<string>();
    for (const t of texts) {
      if (!t) continue;
      for (const h of allHeaders) if (t === h || t.startsWith(h)) matched.add(h);
    }
    if (matched.size >= rule.minHeaderMatches && matched.size > matchCount) {
      headerRow = r;
      matchCount = matched.size;
    }
  }

  const result: ExtractedTable = {
    key: rule.key,
    label: rule.label,
    columns: rule.columns.map(c => ({ key: c.key, label: c.label })),
    rows: [],
    confidence: 0,
  };
  if (headerRow < 0) return result;

  // Map each column key to a sheet column index
  const headerTexts = (grid[headerRow] || []).map(norm);
  const colIndex: Record<string, number> = {};
  for (const col of rule.columns) {
    const wanted = col.headers.map(norm);
    let idx = headerTexts.findIndex(t => t && wanted.includes(t));
    if (idx < 0) idx = headerTexts.findIndex(t => t && wanted.some(w => t.startsWith(w)));
    if (idx >= 0) colIndex[col.key] = idx;
  }

  let blankStreak = 0;
  for (let r = headerRow + 1; r < grid.length && result.rows.length < rule.maxRows; r++) {
    const row = grid[r] || [];
    // stop when we hit a new section header
    const firstText = norm(row[0]);
    if (r > headerRow + 1 && firstText && headerTexts.includes(firstText)) break;

    const obj: Record<string, unknown> = {};
    let hasRequired = false;
    for (const col of rule.columns) {
      const ci = colIndex[col.key];
      if (ci === undefined) { obj[col.key] = null; continue; }
      const value = coerce(row[ci], col.type || 'string');
      obj[col.key] = value;
      if (rule.requireAny.includes(col.key) && value !== null && value !== '' && value !== 0) hasRequired = true;
    }
    if (!hasRequired) {
      blankStreak++;
      if (blankStreak >= 4) break;
      continue;
    }
    blankStreak = 0;
    obj.__row = r + 1;
    result.rows.push(obj);
  }

  const mappedRatio = Object.keys(colIndex).length / rule.columns.length;
  result.confidence = result.rows.length ? Math.round(Math.min(1, mappedRatio) * 100) / 100 : 0;
  return result;
}

function pickSheet(wb: XLSX.WorkBook, profile: TemplateProfile): string {
  for (const wanted of profile.sheets) {
    const found = wb.SheetNames.find(n => norm(n) === norm(wanted) || norm(n).startsWith(norm(wanted)));
    if (found) return found;
  }
  return wb.SheetNames[0];
}

export function extractFromWorkbook(wb: XLSX.WorkBook, profiles = TEMPLATE_PROFILES): ExtractionResult {
  let best: ExtractionResult | null = null;

  for (const profile of profiles) {
    const sheetName = pickSheet(wb, profile);
    const grid = sheetToGrid(wb.Sheets[sheetName]);

    const fields: Record<string, ExtractedValue> = {};
    for (const rule of profile.fields) fields[rule.key] = extractField(grid, rule);

    const tables: Record<string, ExtractedTable> = {};
    for (const rule of profile.tables) tables[rule.key] = extractTable(grid, rule);

    const missing = [
      ...Object.values(fields).filter(f => f.value === null).map(f => f.label),
      ...Object.values(tables).filter(t => !t.rows.length).map(t => t.label),
    ];
    const scores = [
      ...Object.values(fields).map(f => f.confidence),
      ...Object.values(tables).map(t => t.confidence),
    ];
    const overallConfidence = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 0;

    const result: ExtractionResult = {
      profileId: profile.id,
      profileName: profile.name,
      sheetName,
      fields,
      tables,
      missing,
      overallConfidence,
    };
    if (!best || result.overallConfidence > best.overallConfidence) best = result;
  }

  return best!;
}

export async function extractFromFile(file: File, profiles = TEMPLATE_PROFILES): Promise<ExtractionResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  return extractFromWorkbook(wb, profiles);
}

/* ---------------- Derived / summary helpers ---------------- */

const isDevOp = (desc: unknown) => /develop/i.test(String(desc || ''));

export interface DerivedQuotation {
  developmentMinutes: number;
  cycleMinutes: number;
  setupMinutes: number;
  subconProcessingMinutes: number;
  routingResources: string[];
  hasSubcon: boolean;
  labourCost: number | null;
  materialCost: number | null;
  subconCost: number | null;
  toolingCost: number | null;
  miscCost: number | null;
  totalCost: number | null;
  unitCost: number | null;
  margin: number | null;
  unitPrice: number | null;
  volumeBreaks: { qty: number; unitPrice: number | null; totalPrice: number | null; margin: number | null }[];
  bom: { parent: string | null; components: { part_number: string | null; description: string | null; qty: number | null; uom: string | null }[] };
}

export function deriveQuotation(res: ExtractionResult): DerivedQuotation {
  const routing = res.tables.routing?.rows || [];
  const materials = res.tables.materials?.rows || [];
  const subcons = res.tables.subcons?.rows || [];
  const vp = res.tables.volume_pricing?.rows || [];

  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);

  const developmentMinutes = routing
    .filter(r => isDevOp(r.operation_details))
    .reduce((s, r) => s + num(r.setup_time) + num(r.run_time), 0);
  const setupMinutes = routing
    .filter(r => !isDevOp(r.operation_details))
    .reduce((s, r) => s + num(r.setup_time), 0);
  const cycleMinutes = routing
    .filter(r => !isDevOp(r.operation_details))
    .reduce((s, r) => s + num(r.run_time), 0);
  const subconProcessingMinutes = routing.reduce((s, r) => s + num(r.subcon_processing_time), 0);

  const routingResources = Array.from(
    new Set(routing.map(r => String(r.resource || '').trim()).filter(Boolean)),
  );

  const priced = vp.filter(r => num(r.qty) > 0);
  const primary = priced[0] || null;

  const volumeBreaks = priced.map(r => ({
    qty: num(r.qty),
    unitPrice: (r.unit_price as number) ?? null,
    totalPrice: (r.total_price as number) ?? null,
    margin: (r.margin as number) ?? null,
  }));

  const subconCostFromTable = subcons.reduce((s, r) => s + num(r.std_cost_est), 0);

  return {
    developmentMinutes,
    cycleMinutes,
    setupMinutes,
    subconProcessingMinutes,
    routingResources,
    hasSubcon: subcons.length > 0 || subconCostFromTable > 0 || subconProcessingMinutes > 0,
    labourCost: primary ? ((primary.labour_cost as number) ?? null) : null,
    materialCost: primary ? ((primary.material_cost as number) ?? null) : null,
    subconCost: primary ? ((primary.subcon_cost as number) ?? subconCostFromTable) : subconCostFromTable || null,
    toolingCost: (res.fields.tooling_cost?.value as number) ?? (primary ? ((primary.tooling_cost as number) ?? null) : null),
    miscCost: primary ? ((primary.misc as number) ?? null) : null,
    totalCost: primary ? ((primary.total_price as number) ?? null) : null,
    unitCost: primary ? ((primary.unit_cost as number) ?? null) : null,
    margin: primary ? ((primary.margin as number) ?? (res.fields.std_margin?.value as number) ?? null) : ((res.fields.std_margin?.value as number) ?? null),
    unitPrice: primary ? ((primary.unit_price as number) ?? null) : null,
    volumeBreaks,
    bom: {
      parent: (res.fields.part_number?.value as string) ?? null,
      components: materials.map(m => ({
        part_number: (m.part_number as string) ?? null,
        description: (m.material_description as string) ?? null,
        qty: (m.qty_per_unit as number) ?? null,
        uom: (m.uom as string) ?? null,
      })),
    },
  };
}
