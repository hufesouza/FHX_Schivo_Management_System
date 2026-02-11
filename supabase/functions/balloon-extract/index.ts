import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExtractedFeature {
  balloon_id: number;
  feature_type: string;
  original_text: string;
  nominal: number | null;
  tol_minus: number | null;
  tol_plus: number | null;
  unit: string;
  page_number: number;
  zone: string;
  notes: string;
  is_ctq: boolean;
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
}

async function ocrPage(imageBase64: string, apiKey: string): Promise<{ fullText: string; words: Array<{ text: string; x: number; y: number; w: number; h: number }> }> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: cleanBase64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 500 }],
          imageContext: { languageHints: ['en', 'pt', 'de', 'fr'] },
        }],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vision API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const annotations = data.responses?.[0]?.textAnnotations || [];
  const fullText = annotations[0]?.description || '';
  
  const words = [];
  for (let i = 1; i < annotations.length; i++) {
    const a = annotations[i];
    const vertices = a.boundingPoly?.vertices || [];
    if (vertices.length >= 4) {
      const xs = vertices.map((v: any) => v.x || 0);
      const ys = vertices.map((v: any) => v.y || 0);
      words.push({
        text: a.description,
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      });
    }
  }

  return { fullText, words };
}

async function extractFeaturesWithAI(
  ocrText: string,
  words: Array<{ text: string; x: number; y: number; w: number; h: number }>,
  pageNumber: number,
  standard: string,
  preferredUnit: string,
  lovableApiKey: string
): Promise<ExtractedFeature[]> {
  const systemPrompt = `You are an expert engineering drawing analyst. You extract inspectable characteristics from technical drawings OCR text.

You MUST identify ALL of the following types:
- Linear dimensions (length, width, height, depth)
- Angular dimensions
- Diameters (Ø or DIA)
- Radii (R)
- Chamfers (C or chamfer callouts)
- GD&T callouts (flatness, parallelism, perpendicularity, concentricity, runout, position, profile, etc.)
- Thread callouts (M10x1.5, 1/4-20 UNC, etc.)
- Surface finish/roughness (Ra, Rz, etc.)
- Notes with inspectable requirements

Standard: ${standard}
Preferred unit: ${preferredUnit}

For each feature, extract:
- feature_type: one of [linear_dimension, angular_dimension, diameter, radius, chamfer, gdt, thread, surface_finish, note]
- original_text: exact text from drawing
- nominal: numeric value (null if not applicable)
- tol_minus: negative tolerance (null if not specified)
- tol_plus: positive tolerance (null if not specified)
- unit: mm or in
- confidence: 0-1 how confident you are
- notes: any additional context

Do NOT include title block text, revision info, material specs, or non-inspectable annotations.
Deduplicate: if same dimension appears multiple times in similar location, include only once.`;

  const wordsContext = words.slice(0, 200).map(w => `"${w.text}" at (${w.x},${w.y},${w.w},${w.h})`).join('\n');

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract all inspectable features from this engineering drawing page ${pageNumber}.\n\nFull OCR text:\n${ocrText}\n\nWord positions:\n${wordsContext}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "report_features",
          description: "Report all extracted inspectable features from the drawing",
          parameters: {
            type: "object",
            properties: {
              features: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    feature_type: { type: "string", enum: ["linear_dimension", "angular_dimension", "diameter", "radius", "chamfer", "gdt", "thread", "surface_finish", "note"] },
                    original_text: { type: "string" },
                    nominal: { type: "number" },
                    tol_minus: { type: "number" },
                    tol_plus: { type: "number" },
                    unit: { type: "string", enum: ["mm", "in"] },
                    confidence: { type: "number" },
                    notes: { type: "string" },
                    bbox_x: { type: "number" },
                    bbox_y: { type: "number" },
                    bbox_w: { type: "number" },
                    bbox_h: { type: "number" },
                  },
                  required: ["feature_type", "original_text", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["features"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "report_features" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limited - please try again later");
    if (response.status === 402) throw new Error("AI credits exhausted");
    const t = await response.text();
    console.error("AI error:", response.status, t);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const aiData = await response.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    console.error("No tool call in AI response");
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    console.error("Failed to parse AI response");
    return [];
  }

  return (parsed.features || []).map((f: any, idx: number) => ({
    balloon_id: idx + 1,
    feature_type: f.feature_type || 'dimension',
    original_text: f.original_text || '',
    nominal: f.nominal ?? null,
    tol_minus: f.tol_minus ?? null,
    tol_plus: f.tol_plus ?? null,
    unit: f.unit || preferredUnit,
    page_number: pageNumber,
    zone: '',
    notes: f.notes || '',
    is_ctq: false,
    confidence: f.confidence || 0.5,
    bbox_x: f.bbox_x || 0,
    bbox_y: f.bbox_y || 0,
    bbox_w: f.bbox_w || 0,
    bbox_h: f.bbox_h || 0,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, pages, standard, preferredUnit } = await req.json();

    if (!jobId || !pages || !Array.isArray(pages) || pages.length === 0) {
      throw new Error('Missing jobId or pages');
    }

    const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    if (!visionApiKey) throw new Error('Google Cloud Vision API key not configured');

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update job status
    await supabase.from('balloon_jobs').update({ 
      status: 'processing', 
      current_step: 'extraction',
      total_pages: pages.length 
    }).eq('id', jobId);

    const allFeatures: ExtractedFeature[] = [];
    let globalBalloonId = 1;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`Processing page ${i + 1}/${pages.length}`);

      // OCR
      const { fullText, words } = await ocrPage(page.imageBase64, visionApiKey);
      console.log(`OCR found ${words.length} words on page ${i + 1}`);

      if (fullText.trim().length < 5) {
        console.log(`Page ${i + 1} has insufficient text, skipping`);
        continue;
      }

      // AI extraction
      const features = await extractFeaturesWithAI(
        fullText, words, i + 1, standard || 'ASME Y14.5', preferredUnit || 'mm', lovableApiKey
      );

      // Re-number balloons globally
      for (const f of features) {
        f.balloon_id = globalBalloonId++;
        allFeatures.push(f);
      }
    }

    // Store features in DB
    if (allFeatures.length > 0) {
      const rows = allFeatures.map(f => ({
        job_id: jobId,
        balloon_id: f.balloon_id,
        feature_type: f.feature_type,
        original_text: f.original_text,
        nominal: f.nominal,
        tol_minus: f.tol_minus,
        tol_plus: f.tol_plus,
        unit: f.unit,
        page_number: f.page_number,
        zone: f.zone,
        notes: f.notes,
        is_ctq: f.is_ctq,
        confidence: f.confidence,
        bbox_x: f.bbox_x,
        bbox_y: f.bbox_y,
        bbox_w: f.bbox_w,
        bbox_h: f.bbox_h,
      }));

      const { error: insertError } = await supabase.from('balloon_features').insert(rows);
      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to store features: ${insertError.message}`);
      }
    }

    // Update job status
    await supabase.from('balloon_jobs').update({ 
      status: 'review', 
      current_step: 'review' 
    }).eq('id', jobId);

    return new Response(
      JSON.stringify({
        success: true,
        totalFeatures: allFeatures.length,
        features: allFeatures,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Balloon extract error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
