import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SYSTEM_PROMPT = `You extract structured purchase order data from documents of ANY layout.

You will receive either the plain text of a purchase order, page images of it, or both.
Different customers use completely different templates, wording and languages. Never assume a fixed layout.
Identify fields by their labels, table headers, and document context.

Field synonyms (non-exhaustive — use judgement):
- Customer PO Number: "PO No", "Purchase Order", "Order No", "Order Number", "PO#", "Bestellnummer".
- PO Date: "Order Date", "Date", "Issued", "Document date".
- Part Number: "Part No", "Item Number", "PN", "Product Code", "Material", "SKU", "Customer Part".
- Part Revision: "Rev", "Rev.", "Revision", "Iss", "Issue", "Drawing Rev", "Version", or a revision suffix on the part number (e.g. "12345-A Rev B" -> part_number "12345-A", part_revision "B").
- Part Description: "Description", "Item Description", "Designation", "Material description".
- Quantity: "Qty", "Order Qty", "Quantity Ordered", "Pcs", "Units".
- Due Date: "Delivery Date", "Required Date", "Requested Delivery", "Need By", "Ship Date", "Dock Date".
- Unit Price: "Price", "Unit Cost", "Price Each", "Rate".
- Total Price: "Amount", "Extended Price", "Line Total", "Net Value".
- NRE (is_nre): true when the line is a Non-Recurring Engineering charge rather than a manufactured part — "NRE", "Non-Recurring Engineering", tooling charge, fixture cost, programming/setup charge, one-off engineering fee, first article engineering, freight/service only lines. Otherwise false.
- Requirements / Special Requirements: certificates, material certs, packaging, inspection, FAI, traceability, quality clauses, notes on the line or in the terms.

Rules:
1. Return one entry in "lines" for EVERY line item in the purchase order.
2. Dates: output ISO YYYY-MM-DD. Ambiguous numeric dates are DAY/MONTH/YEAR (European format).
3. Numbers: plain numbers only — no currency symbols, no thousand separators. Use a dot as decimal separator.
4. If a value is not present or you are not confident, use null. NEVER invent or guess values.
5. If a line has no due date but the PO has a single global delivery date, use that global date for every line.
6. If unit price is missing but total price and quantity exist, you may compute unit price (and vice versa).
7. Currency: ALWAYS report it as a 3-letter ISO 4217 code (EUR, USD, GBP, CHF, JPY...). Infer it from currency symbols ($, €, £), from wording ("Total USD", "Preis in EUR"), from the customer address/country, or from the price column header. Only use null when there is genuinely no price information at all.
8. List the names of fields you were unsure about in "low_confidence" (e.g. ["po_number","lines[0].due_date"]).
8. Respond with JSON only, matching the schema exactly. No markdown, no commentary.

JSON schema:
{
  "customer_name": string|null,
  "po_number": string|null,
  "po_date": string|null,
  "currency": string|null,
  "notes": string|null,
  "requirements": string|null,
  "special_requirements": string|null,
  "lines": [
    {
      "line_number": number|null,
      "part_number": string|null,
      "part_revision": string|null,
      "part_description": string|null,
      "quantity": number|null,
      "due_date": string|null,
      "unit_price": number|null,
      "total_price": number|null,
      "notes": string|null,
      "requirements": string|null,
      "special_requirements": string|null,
      "is_nre": boolean
    }
  ],
  "low_confidence": string[]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return json({ error: 'AI is not configured' }, 500);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Invalid request body' }, 400);

    const text: string = typeof body.text === 'string' ? body.text.slice(0, 120000) : '';
    const images: string[] = Array.isArray(body.images)
      ? body.images.filter((i: unknown) => typeof i === 'string' && (i as string).startsWith('data:image/')).slice(0, 8)
      : [];
    const fileName: string = typeof body.fileName === 'string' ? body.fileName : 'document';

    if (!text.trim() && images.length === 0) {
      return json({ error: 'Nothing to analyse in this file' }, 400);
    }

    const userContent: Record<string, unknown>[] = [
      {
        type: 'text',
        text: `File name: ${fileName}\nToday: ${new Date().toISOString().slice(0, 10)}\n\n${
          text.trim() ? `Document text:\n"""\n${text}\n"""` : 'No extractable text — read the page images.'
        }`,
      },
      ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error', response.status, errText);
      if (response.status === 429) return json({ error: 'AI rate limit reached, please retry shortly' }, 429);
      if (response.status === 402) return json({ error: 'AI credits exhausted' }, 402);
      return json({ error: 'Document analysis failed' }, 502);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? '';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = String(raw).match(/\{[\s\S]*\}/);
      if (!match) return json({ error: 'Could not read the purchase order' }, 502);
      parsed = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsed.lines)) parsed.lines = [];
    if (!Array.isArray(parsed.low_confidence)) parsed.low_confidence = [];

    return json(parsed);
  } catch (error) {
    console.error('extract-purchase-order error', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
