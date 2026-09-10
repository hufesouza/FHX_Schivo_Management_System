import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrdersLayout } from '@/components/orders/OrdersLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Sparkles, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { readDocument, SUPPORTED_EXTENSIONS } from '@/utils/documentReader';
import { supabase } from '@/integrations/supabase/client';
import { ensureCustomer, useOrders } from '@/hooks/useOrderTracker';
import { MachineSelect } from '@/components/orders/MachineSelect';
import { StatusSelect } from '@/components/orders/StatusSelect';
import { dueBucket, type OrderStatus } from '@/types/orderTracker';
import { fmtOriginal, getEurRate, normaliseCurrency, toEur } from '@/utils/currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DraftLine {
  key: string;
  line_number: number | null;
  part_number: string;
  part_description: string;
  quantity: number | null;
  due_date: string | null;
  unit_price: number | null;
  total_price: number | null;
  original_unit_price: number | null;
  original_total_price: number | null;
  notes: string;
  requirements: string;
  special_requirements: string;
  status: OrderStatus;
  machine_id: string | null;
}

interface Draft {
  customer_name: string;
  po_number: string;
  po_date: string | null;
  notes: string;
  requirements: string;
  special_requirements: string;
  /** Currency of the uploaded document. Prices are stored in EUR. */
  currency: string;
  fx_rate_to_eur: number;
  lines: DraftLine[];
  low_confidence: string[];
}

const asNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
};
const asStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const asDate = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

const newLine = (): DraftLine => ({
  key: crypto.randomUUID(),
  line_number: null, part_number: '', part_description: '', quantity: null,
  due_date: null, unit_price: null, total_price: null,
  original_unit_price: null, original_total_price: null,
  notes: '', requirements: '', special_requirements: '',
  status: 'New', machine_id: null,
});

export default function OrdersUpload() {
  const navigate = useNavigate();
  const { save } = useOrders();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<'idle' | 'reading' | 'analysing' | 'review' | 'saving'>('idle');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyse = useCallback(async (f: File) => {
    setError(null);
    setDraft(null);
    setFile(f);
    try {
      setStage('reading');
      const read = await readDocument(f);
      if (!read.text.trim() && read.images.length === 0) {
        throw new Error('No readable content found in this file.');
      }
      setStage('analysing');
      const { data, error: fnError } = await supabase.functions.invoke('extract-purchase-order', {
        body: { text: read.text, images: read.images, fileName: f.name },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data || (data as { error?: string }).error) {
        throw new Error((data as { error?: string })?.error || 'Analysis failed');
      }
      const d = data as Record<string, unknown>;
      const currency = normaliseCurrency(asStr(d.currency)) || 'EUR';
      const rate = await getEurRate(currency);
      const rawLines = Array.isArray(d.lines) ? (d.lines as Record<string, unknown>[]) : [];
      const lines: DraftLine[] = (rawLines.length ? rawLines : [{}]).map((l, i) => {
        const origUnit = asNum(l.unit_price);
        const origTotal = asNum(l.total_price);
        return {
          key: crypto.randomUUID(),
          line_number: asNum(l.line_number) ?? i + 1,
          part_number: asStr(l.part_number),
          part_description: asStr(l.part_description),
          quantity: asNum(l.quantity),
          due_date: asDate(l.due_date),
          unit_price: toEur(origUnit, rate),
          total_price: toEur(origTotal, rate),
          original_unit_price: origUnit,
          original_total_price: origTotal,
          notes: asStr(l.notes),
          requirements: asStr(l.requirements),
          special_requirements: asStr(l.special_requirements),
          status: 'New' as OrderStatus,
          machine_id: null,
        };
      });
      setDraft({
        customer_name: asStr(d.customer_name),
        po_number: asStr(d.po_number),
        po_date: asDate(d.po_date),
        notes: asStr(d.notes),
        requirements: asStr(d.requirements),
        special_requirements: asStr(d.special_requirements),
        currency,
        fx_rate_to_eur: rate,
        lines,
        low_confidence: Array.isArray(d.low_confidence) ? (d.low_confidence as string[]) : [],
      });
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyse this file');
      setStage('idle');
    }
  }, []);

  const setLine = (key: string, patch: Partial<DraftLine>) =>
    setDraft((d) => d && { ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });

  /** Re-converts every line when the user corrects the document currency. */
  const changeCurrency = async (raw: string) => {
    const code = normaliseCurrency(raw) || 'EUR';
    const rate = await getEurRate(code);
    setDraft((d) =>
      d && {
        ...d,
        currency: code,
        fx_rate_to_eur: rate,
        lines: d.lines.map((l) => {
          const origUnit = l.original_unit_price ?? l.unit_price;
          const origTotal = l.original_total_price ?? l.total_price;
          return {
            ...l,
            original_unit_price: origUnit,
            original_total_price: origTotal,
            unit_price: toEur(origUnit, rate),
            total_price: toEur(origTotal, rate),
          };
        }),
      },
    );
  };

  const confirm = async () => {
    if (!draft) return;
    if (!draft.customer_name.trim()) return toast.error('Customer name is required');
    if (draft.lines.length === 0) return toast.error('Add at least one line item');

    setStage('saving');
    try {
      const customer_id = await ensureCustomer(draft.customer_name);

      let file_path: string | null = null;
      if (file) {
        const safe = file.name.replace(/[^\w.\-]+/g, '_');
        const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage.from('purchase-orders').upload(path, file, {
          contentType: file.type || 'application/octet-stream',
        });
        if (!upErr) file_path = path;
      }

      const { data: po, error: poErr } = await supabase
        .from('ot_purchase_orders')
        .insert({
          customer_id,
          customer_name: draft.customer_name.trim(),
          po_number: draft.po_number || null,
          po_date: draft.po_date,
          file_path,
          file_name: file?.name || null,
          file_type: file?.type || null,
          notes: draft.notes || null,
          currency: draft.currency || 'EUR',
          fx_rate_to_eur: draft.fx_rate_to_eur,
        })
        .select('id')
        .single();
      if (poErr) throw poErr;

      const payload = draft.lines.map((l) => ({
        purchase_order_id: po.id,
        customer_id,
        customer_name: draft.customer_name.trim(),
        po_number: draft.po_number || null,
        po_date: draft.po_date,
        line_number: l.line_number,
        part_number: l.part_number || null,
        part_description: l.part_description || null,
        quantity: l.quantity,
        due_date: l.due_date,
        unit_price: l.unit_price,
        total_price: l.total_price,
        notes: l.notes || draft.notes || null,
        requirements: l.requirements || draft.requirements || null,
        special_requirements: l.special_requirements || draft.special_requirements || null,
        status: l.status,
        machine_id: l.machine_id,
        currency: draft.currency || 'EUR',
        original_unit_price: l.original_unit_price,
        original_total_price: l.original_total_price,
        fx_rate_to_eur: draft.fx_rate_to_eur,
      }));

      const { error: ordErr } = await supabase.from('ot_orders').insert(payload as never);
      if (ordErr) throw ordErr;

      toast.success(`${payload.length} order${payload.length === 1 ? '' : 's'} created`);
      setDraft(null);
      setFile(null);
      setStage('idle');
      navigate('/orders/list');
    } catch (e) {
      setStage('review');
      toast.error(e instanceof Error ? e.message : 'Could not create the orders');
    }
  };

  const busy = stage === 'reading' || stage === 'analysing';

  return (
    <OrdersLayout
      title="Upload purchase order"
      subtitle="PDF, Excel, CSV, Word or image — the layout does not matter"
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">1. Choose the purchase order file</CardTitle>
          <CardDescription>
            The file is read in your browser, analysed automatically, and the original is stored with the order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              busy ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) analyse(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept={SUPPORTED_EXTENSIONS}
              disabled={busy}
              onChange={(e) => e.target.files?.[0] && analyse(e.target.files[0])}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="flex flex-col items-center gap-3">
              {busy ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-medium">
                    {stage === 'reading' ? `Reading ${file?.name}…` : 'Analysing the purchase order…'}
                  </p>
                  <p className="text-sm text-muted-foreground">This can take up to a minute for scanned documents.</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Drag and drop a purchase order, or click to browse</p>
                  <p className="text-sm text-muted-foreground">{SUPPORTED_EXTENSIONS.replace(/\./g, '').toUpperCase()}</p>
                  <Button variant="secondary" size="sm">Select file</Button>
                </>
              )}
            </div>
          </div>
          {error && (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </p>
          )}
          {file && !busy && draft && (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {file.name} analysed — review the details below.
            </p>
          )}
        </CardContent>
      </Card>

      {draft && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> 2. Review the purchase order
              </CardTitle>
              {draft.low_confidence.length > 0 && (
                <CardDescription className="text-amber-600">
                  Please double-check: {draft.low_confidence.join(', ')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Customer name</Label>
                <Input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} />
              </div>
              <div>
                <Label>Customer PO number</Label>
                <Input value={draft.po_number} onChange={(e) => setDraft({ ...draft, po_number: e.target.value })} />
              </div>
              <div>
                <Label>PO date</Label>
                <Input type="date" value={draft.po_date || ''} onChange={(e) => setDraft({ ...draft, po_date: e.target.value || null })} />
              </div>
              <div>
                <Label>Currency on the document</Label>
                <Input
                  value={draft.currency}
                  onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
                  onBlur={(e) => changeCurrency(e.target.value)}
                  placeholder="EUR"
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <p className="text-sm text-muted-foreground">
                  {draft.currency === 'EUR'
                    ? 'Prices are already in euro.'
                    : `Prices converted to euro at 1 ${draft.currency} = € ${draft.fx_rate_to_eur.toFixed(4)}. The original amounts are kept on each order.`}
                </p>
              </div>
              <div className="sm:col-span-3">
                <Label>Notes</Label>
                <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </div>
              <div className="sm:col-span-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Customer requirements</Label>
                  <Textarea rows={2} value={draft.requirements} onChange={(e) => setDraft({ ...draft, requirements: e.target.value })} />
                </div>
                <div>
                  <Label>Special requirements</Label>
                  <Textarea rows={2} value={draft.special_requirements} onChange={(e) => setDraft({ ...draft, special_requirements: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  3. Line items — {draft.lines.length} order{draft.lines.length === 1 ? '' : 's'} will be created
                </CardTitle>
                <CardDescription>Each line becomes its own order record linked to this purchase order.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, lines: [...draft.lines, newLine()] })}>
                <Plus className="mr-2 h-4 w-4" /> Add line
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {draft.lines.map((l, idx) => {
                const b = dueBucket(l.due_date);
                return (
                  <div key={l.key} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        Line {l.line_number ?? idx + 1}
                        <span className={cn('ml-2 rounded border px-1.5 py-0.5 text-[10px] font-medium', b.className)}>{b.label}</span>
                      </p>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                        onClick={() => setDraft({ ...draft, lines: draft.lines.filter((x) => x.key !== l.key) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <Label>Part number</Label>
                        <Input value={l.part_number} onChange={(e) => setLine(l.key, { part_number: e.target.value })} />
                      </div>
                      <div>
                        <Label>Rev</Label>
                        <Input value={l.part_revision} onChange={(e) => setLine(l.key, { part_revision: e.target.value })} />
                      </div>
                      <div className="lg:col-span-2">
                        <Label>Description</Label>
                        <Input value={l.part_description} onChange={(e) => setLine(l.key, { part_description: e.target.value })} />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" step="any" value={l.quantity ?? ''}
                          onChange={(e) => {
                            const q = asNum(e.target.value);
                            setLine(l.key, {
                              quantity: q,
                              total_price: q !== null && l.unit_price !== null ? Number((q * l.unit_price).toFixed(2)) : l.total_price,
                            });
                          }} />
                      </div>
                      <div>
                        <Label>Due date</Label>
                        <Input type="date" value={l.due_date || ''} onChange={(e) => setLine(l.key, { due_date: e.target.value || null })} />
                      </div>
                      <div>
                        <Label>Unit price (€)</Label>
                        <Input type="number" step="any" value={l.unit_price ?? ''}
                          onChange={(e) => {
                            const u = asNum(e.target.value);
                            setLine(l.key, {
                              unit_price: u,
                              total_price: u !== null && l.quantity !== null ? Number((u * l.quantity).toFixed(2)) : l.total_price,
                            });
                          }} />
                      </div>
                      <div>
                        <Label>Total price (€)</Label>
                        <Input type="number" step="any" value={l.total_price ?? ''} onChange={(e) => setLine(l.key, { total_price: asNum(e.target.value) })} />
                      </div>
                      {draft.currency !== 'EUR' && (
                        <div className="sm:col-span-2 lg:col-span-2 self-end text-xs text-muted-foreground">
                          On the document: {fmtOriginal(l.original_unit_price, draft.currency)} each ·{' '}
                          {fmtOriginal(l.original_total_price, draft.currency)} total
                        </div>
                      )}
                      <div>
                        <Label>Status</Label>
                        <StatusSelect value={l.status} onChange={(s) => setLine(l.key, { status: s })} />
                      </div>
                      <div>
                        <Label>Machine</Label>
                        <MachineSelect value={l.machine_id} onChange={(m) => setLine(l.key, { machine_id: m })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Line notes</Label>
                        <Input value={l.notes} onChange={(e) => setLine(l.key, { notes: e.target.value })} />
                      </div>
                      <div>
                        <Label>Requirements</Label>
                        <Input value={l.requirements} onChange={(e) => setLine(l.key, { requirements: e.target.value })} />
                      </div>
                      <div>
                        <Label>Special requirements</Label>
                        <Input value={l.special_requirements} onChange={(e) => setLine(l.key, { special_requirements: e.target.value })} />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => { setDraft(null); setFile(null); }}>Discard</Button>
                <Button onClick={confirm} disabled={stage === 'saving' || save.isPending}>
                  {stage === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Confirm and create {draft.lines.length} order{draft.lines.length === 1 ? '' : 's'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </OrdersLayout>
  );
}
