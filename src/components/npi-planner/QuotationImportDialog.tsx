import { useCallback, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  extractFromFile,
  deriveQuotation,
  type ExtractionResult,
  type DerivedQuotation,
} from '@/utils/quotationSheetExtractor';
import { SCHIVO_QUOTATION_PROFILE } from '@/utils/quotationTemplates';

export interface QuotationImportPayload {
  extraction: ExtractionResult;
  derived: DerivedQuotation;
  file: File;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (payload: QuotationImportPayload) => void;
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value <= 0) return <Badge variant="destructive" className="text-[10px]">not found</Badge>;
  const pct = Math.round(value * 100);
  const variant = value >= 0.9 ? 'default' : value >= 0.7 ? 'secondary' : 'outline';
  return <Badge variant={variant as any} className="text-[10px]">{pct}%</Badge>;
}

const asText = (v: unknown) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

export function QuotationImportDialog({ open, onOpenChange, onApply }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [tableRows, setTableRows] = useState<Record<string, Record<string, unknown>[]>>({});

  const reset = () => { setFile(null); setResult(null); setFieldValues({}); setTableRows({}); };

  const handleFile = useCallback(async (f: File) => {
    if (!/\.(xlsm|xlsx|xls)$/i.test(f.name)) {
      toast.error('Please upload an .xlsm, .xlsx or .xls file');
      return;
    }
    setParsing(true);
    try {
      const res = await extractFromFile(f);
      setFile(f);
      setResult(res);
      setFieldValues(
        Object.fromEntries(Object.values(res.fields).map(fv => [fv.key, asText(fv.value)])),
      );
      setTableRows(
        Object.fromEntries(Object.entries(res.tables).map(([k, t]) => [k, t.rows.map(r => ({ ...r }))])),
      );
      toast.success(`Extracted with ${Math.round(res.overallConfidence * 100)}% average confidence`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to read the file');
    } finally {
      setParsing(false);
    }
  }, []);

  const fieldRules = SCHIVO_QUOTATION_PROFILE.fields;

  const editedResult = useMemo<ExtractionResult | null>(() => {
    if (!result) return null;
    const fields = { ...result.fields };
    for (const rule of fieldRules) {
      const original = result.fields[rule.key];
      const text = fieldValues[rule.key] ?? '';
      let value: unknown = text.trim() === '' ? null : text.trim();
      if (value !== null) {
        if (rule.type === 'number') { const n = parseFloat(String(value).replace(/[^0-9.\-]/g, '')); value = isNaN(n) ? null : n; }
        else if (rule.type === 'percent') { const n = parseFloat(String(value).replace(/[^0-9.\-]/g, '')); value = isNaN(n) ? null : (n > 1 ? n / 100 : n); }
        else if (rule.type === 'bool') value = /^(yes|y|true|1)$/i.test(String(value));
      }
      const changed = asText(value) !== asText(original?.value);
      fields[rule.key] = {
        ...original,
        key: rule.key,
        label: rule.label,
        value: value as any,
        confidence: changed ? 1 : original?.confidence ?? 0,
      };
    }
    const tables = { ...result.tables };
    for (const [k, rows] of Object.entries(tableRows)) tables[k] = { ...tables[k], rows };
    return { ...result, fields, tables };
  }, [result, fieldValues, tableRows, fieldRules]);

  const derived = useMemo(() => (editedResult ? deriveQuotation(editedResult) : null), [editedResult]);

  const missingCount = useMemo(
    () => (editedResult ? Object.values(editedResult.fields).filter(f => f.value === null).length : 0),
    [editedResult],
  );

  const setCell = (tableKey: string, rowIdx: number, colKey: string, raw: string) => {
    setTableRows(prev => {
      const rows = [...(prev[tableKey] || [])];
      const prevVal = rows[rowIdx]?.[colKey];
      let value: unknown = raw;
      if (typeof prevVal === 'number') { const n = parseFloat(raw.replace(/[^0-9.\-]/g, '')); value = isNaN(n) ? null : n; }
      else if (typeof prevVal === 'boolean') value = /^(yes|y|true|1)$/i.test(raw);
      else if (raw.trim() === '') value = null;
      rows[rowIdx] = { ...rows[rowIdx], [colKey]: value };
      return { ...prev, [tableKey]: rows };
    });
  };

  const handleApply = () => {
    if (!editedResult || !derived || !file) return;
    onApply({ extraction: editedResult, derived, file });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Import from quotation / routing sheet</DialogTitle>
          <DialogDescription>
            Upload a Schivo quotation workbook (.xlsm, .xlsx, .xls). Every value is extracted with a confidence score and can be edited before it is applied to the part configuration.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="relative border-2 border-dashed rounded-lg p-10 text-center hover:border-muted-foreground/50 transition-colors">
            <input
              type="file"
              accept=".xlsm,.xlsx,.xls"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={parsing}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="flex flex-col items-center gap-3">
              {parsing ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <Upload className="h-10 w-10 text-muted-foreground" />}
              <div>
                <p className="font-medium">{parsing ? 'Reading workbook…' : 'Drop your quotation sheet here or click to browse'}</p>
                <p className="text-sm text-muted-foreground">Supports .xlsm, .xlsx and .xls — merged cells and slightly different layouts are handled automatically.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="font-medium">{file?.name}</span>
              <Badge variant="outline">{result.profileName}</Badge>
              <Badge variant="secondary">Sheet: {result.sheetName}</Badge>
              <Badge>{Math.round((editedResult?.overallConfidence || 0) * 100)}% avg confidence</Badge>
              {missingCount > 0 ? (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{missingCount} field(s) not identified</Badge>
              ) : (
                <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />All fields identified</Badge>
              )}
              <Button size="sm" variant="ghost" onClick={reset} className="ml-auto">Choose another file</Button>
            </div>

            <Tabs defaultValue="part">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="part">Part &amp; compliance</TabsTrigger>
                <TabsTrigger value="materials">Materials ({tableRows.materials?.length || 0})</TabsTrigger>
                <TabsTrigger value="subcon">Subcontract ({tableRows.subcons?.length || 0})</TabsTrigger>
                <TabsTrigger value="routing">Routing ({tableRows.routing?.length || 0})</TabsTrigger>
                <TabsTrigger value="costing">Costing &amp; pricing</TabsTrigger>
                <TabsTrigger value="bom">BOM</TabsTrigger>
              </TabsList>

              <TabsContent value="part" className="pt-3">
                <div className="grid md:grid-cols-3 gap-3">
                  {fieldRules.map(rule => {
                    const fv = editedResult?.fields[rule.key];
                    const notFound = !fv || fv.value === null;
                    return (
                      <div key={rule.key} className={notFound ? 'rounded-md p-2 -m-2 bg-destructive/5 ring-1 ring-destructive/30' : ''}>
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-xs">{rule.label}</Label>
                          <ConfidenceBadge value={fv?.confidence ?? 0} />
                        </div>
                        <Input
                          className="mt-1"
                          value={fieldValues[rule.key] ?? ''}
                          placeholder={notFound ? 'Not found — enter manually' : ''}
                          onChange={e => setFieldValues(v => ({ ...v, [rule.key]: e.target.value }))}
                        />
                        {fv?.source && <div className="text-[10px] text-muted-foreground mt-0.5">cell {fv.source}</div>}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {(['materials', 'subcons', 'routing'] as const).map(key => (
                <TabsContent key={key} value={key === 'subcons' ? 'subcon' : key} className="pt-3">
                  <EditableTable
                    columns={result.tables[key]?.columns || []}
                    rows={tableRows[key] || []}
                    onChange={(ri, ck, v) => setCell(key, ri, ck, v)}
                    emptyLabel={key === 'subcons' ? 'No subcontract operations detected in this quotation.' : 'Nothing extracted for this section.'}
                  />
                  {key === 'subcons' && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Subcontract detected: <strong>{derived?.hasSubcon ? 'Yes' : 'No'}</strong>
                    </div>
                  )}
                </TabsContent>
              ))}

              <TabsContent value="costing" className="pt-3 space-y-4">
                <div className="grid md:grid-cols-4 gap-3">
                  <Stat label="Labour cost" value={derived?.labourCost} money />
                  <Stat label="Material cost" value={derived?.materialCost} money />
                  <Stat label="Subcontract cost" value={derived?.subconCost} money />
                  <Stat label="Tooling cost" value={derived?.toolingCost} money />
                  <Stat label="Miscellaneous" value={derived?.miscCost} money />
                  <Stat label="Total cost" value={derived?.totalCost} money />
                  <Stat label="Unit cost" value={derived?.unitCost} money />
                  <Stat label="Margin" value={derived?.margin != null ? derived.margin * 100 : null} suffix="%" />
                  <Stat label="Selling price / unit" value={derived?.unitPrice} money />
                  <Stat label="Development time" value={derived?.developmentMinutes} suffix=" min" />
                  <Stat label="Cycle time (run)" value={derived?.cycleMinutes} suffix=" min" />
                  <Stat label="Setup time" value={derived?.setupMinutes} suffix=" min" />
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Volume pricing</CardTitle></CardHeader>
                  <CardContent>
                    <EditableTable
                      columns={result.tables.volume_pricing?.columns || []}
                      rows={tableRows.volume_pricing || []}
                      onChange={(ri, ck, v) => setCell('volume_pricing', ri, ck, v)}
                      emptyLabel="No volume breaks found."
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bom" className="pt-3 space-y-3">
                <div className="text-sm">
                  Parent part: <strong>{derived?.bom.parent || '—'}</strong>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Material components</CardTitle></CardHeader>
                  <CardContent>
                    {derived?.bom.components.length ? (
                      <Table>
                        <TableHeader><TableRow><TableHead>Component</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Qty / part</TableHead><TableHead>UOM</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {derived.bom.components.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell>{c.part_number || '—'}</TableCell>
                              <TableCell className="max-w-[420px] truncate">{c.description || '—'}</TableCell>
                              <TableCell className="text-right tabular-nums">{c.qty ?? '—'}</TableCell>
                              <TableCell>{c.uom || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : <p className="text-sm text-muted-foreground">No components found.</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Routing resources</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-1">
                    {derived?.routingResources.length
                      ? derived.routingResources.map(r => <Badge key={r} variant="secondary">{r}</Badge>)
                      : <p className="text-sm text-muted-foreground">No resources found.</p>}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={!result}>Apply to part configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, money, suffix }: { label: string; value?: number | null; money?: boolean; suffix?: string }) {
  const missing = value === null || value === undefined;
  return (
    <div className={`rounded-md border p-3 ${missing ? 'bg-destructive/5 border-destructive/30' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums">
        {missing ? '—' : `${money ? '€' : ''}${Number(value).toLocaleString('en-IE', { maximumFractionDigits: 2 })}${suffix || ''}`}
      </div>
    </div>
  );
}

function EditableTable({
  columns, rows, onChange, emptyLabel,
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  onChange: (rowIdx: number, colKey: string, value: string) => void;
  emptyLabel: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-6 text-center">{emptyLabel}</p>;
  return (
    <div className="overflow-auto border rounded-md max-h-[420px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>{columns.map(c => <TableHead key={c.key} className="whitespace-nowrap text-xs">{c.label}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, ri) => (
            <TableRow key={ri}>
              {columns.map(c => (
                <TableCell key={c.key} className="p-1">
                  <Input
                    className={`h-8 text-xs min-w-[110px] ${r[c.key] === null || r[c.key] === undefined ? 'border-destructive/40' : ''}`}
                    value={asText(r[c.key])}
                    onChange={e => onChange(ri, c.key, e.target.value)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
