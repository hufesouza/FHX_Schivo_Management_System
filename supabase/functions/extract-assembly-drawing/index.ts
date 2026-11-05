import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText, type ModelMessage } from "npm:ai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "../_shared/run-id.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SYSTEM_PROMPT = `You extract structured engineering data from assembly drawing PDFs of ANY layout.

You will receive the full PDF of an engineering assembly drawing (possibly multipage, possibly scanned).
Different companies use completely different title blocks and BOM table layouts. Never assume a fixed layout.

Extract:
1. Title block: drawing number, revision, description/title.
2. BOM tables: there may be SEPARATE Left and Right BOM tables (or one table with L/R columns). A merged cell spanning multiple rows with an assembly number identifies the PARENT assembly of those rows, not a child component.
3. For each BOM row: item/callout number, component/material number, description, quantity, which side it applies to (left, right, or common), and any referenced drawing number for that component.
4. Finished good / assembly numbers defined by this drawing, including Left and Right versions and any variant suffixes.
5. Referenced drawing numbers anywhere on the drawing.
6. Assembly notes and process requirements (verbatim wording), including variant-specific requirements.

Rules:
1. NEVER merge components merely because they share a drawing number.
2. BOM item numbers are local to their parent assembly and table.
3. If a value is not present or you are not confident, use null. NEVER invent or guess values.
4. Preserve the ORIGINAL wording of every note in "notes[].text".
5. Quantities: plain numbers only.
6. For each BOM row, record the page number (1-based) where the table appears.
7. List fields you were unsure about in "low_confidence".
8. Respond with JSON only, matching the schema exactly. No markdown, no commentary.

JSON schema:
{
  "drawing_number": string|null,
  "revision": string|null,
  "description": string|null,
  "assemblies": [
    {
      "part_number": string,
      "description": string|null,
      "side": "left"|"right"|"common",
      "kind": "finished_good"|"subassembly"
    }
  ],
  "bom_tables": [
    {
      "parent_part_number": string,
      "side": "left"|"right"|"common",
      "page": number|null,
      "rows": [
        {
          "item_number": string,
          "component_number": string|null,
          "description": string|null,
          "quantity": number|null,
          "referenced_drawing": string|null,
          "page": number|null
        }
      ]
    }
  ],
  "referenced_drawings": string[],
  "notes": [
    {
      "text": string,
      "page": number|null,
      "applies_to": "left"|"right"|"common"|null,
      "is_process_instruction": boolean
    }
  ],
  "low_confidence": string[]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured" }, 500);

    const body = await req.json();
    const fileName: string = body.fileName ?? "drawing.pdf";
    const pdfBase64: string = body.pdfBase64 ?? "";
    const extractedText: string = body.extractedText ?? "";

    if (!pdfBase64 && !extractedText.trim()) {
      return json({ error: "No drawing content provided" }, 400);
    }

    const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(req));
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: LOVABLE_API_KEY,
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const content: Array<Record<string, unknown>> = [];
    if (pdfBase64) {
      content.push({ type: "file", filename: fileName, data: pdfBase64, mediaType: "application/pdf" });
    }
    if (extractedText.trim()) {
      content.push({ type: "text", text: `Plain text extracted from the PDF (may be incomplete for scanned pages):\n\n${extractedText.slice(0, 60000)}` });
    }
    content.push({ type: "text", text: "Extract the engineering data from this drawing PDF and return JSON only." });

    const messages: ModelMessage[] = [{ role: "user", content: content as never }];

    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system: SYSTEM_PROMPT,
      messages,
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          store: false,
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }

    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return json({ error: "AI returned a malformed response", raw: cleaned.slice(0, 2000) }, 502);
    }

    return json({ extraction: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extraction failed";
    const status = /429|rate/i.test(message) ? 429 : /402|credit/i.test(message) ? 402 : 500;
    return json({ error: message }, status);
  }
});
