import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VERSIONED SYSTEM PROMPT - v1.0
// This prompt version is logged for 21 CFR Part 11 compliance
const AI_PROMPT_VERSION = "v1.0";

const systemPrompt = `You are an expert CNC machining engineer and technical drawing interpreter. 
Analyze the provided machining drawing and job parameters to determine the most appropriate manufacturing approach.

Your task:
1. Interpret the drawing to identify all machining features
2. Determine which machine type/group is most appropriate
3. Estimate a baseline cycle time on a reference high-speed 3-axis mill
4. Identify any warnings or special considerations

You must output STRICT JSON in this exact schema:
{
  "part_name": "string - extracted or inferred part name",
  "material_detected": "string - detected or confirmed material",
  "overall_dimensions_mm": { "x": number, "y": number, "z": number },
  "features_summary": {
    "holes": [{ "diameter": number, "qty": number, "tolerance_note": "string" }],
    "pockets": number,
    "slots": number,
    "threads": [{ "size": "string", "qty": number }],
    "radii": ["string"],
    "datums": ["A", "B", "C"],
    "special_requirements": ["string"]
  },
  "suggested_machine_group": "string - one of: Horiz, Hurco, Integrex, Maho, Matsuura, Mazak, Mori3000, Roders, RodersDeburr, SLH",
  "suitability_notes": "string - explanation of why this machine group was chosen",
  "operations": [
    { "op_number": 10, "description": "string", "side": "string" }
  ],
  "baseline_cycle_time_min_reference_machine": number,
  "reference_machine_type": "High-speed 3-axis mill (10000 RPM, 8000 mm/min feed)",
  "warnings": ["string"]
}

Machine group selection guide:
- Horiz (Horizontal mills): Large prismatic parts, pallet work, high volume
- Hurco (3-axis mills): General purpose prismatic parts, simpler geometry
- Integrex (Mill-turn): Parts requiring both turning and milling, complex multi-axis
- Maho/Matsuura (5-axis mills): Complex contoured surfaces, 5-axis geometry
- Mazak (Lathes): Turned parts, cylindrical components
- Mori3000 (5-axis): High precision 5-axis work
- Roders (High-speed): Small detailed parts, fine features, plastics
- RodersDeburr: Secondary deburring operations
- SLH (Sliding head): Small turned parts, Swiss-type work

Always provide conservative cycle time estimates. Include setup considerations in warnings.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client for audit logging
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { drawingBase64, drawingMimeType, jobInputs, machines, userId, userEmail } = await req.json();
    
    // Get OpenAI API key - SECURE SERVER-SIDE ONLY
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured. Please add it in project secrets.");
    }

    console.log("=== IlluminAI Quotation Request ===");
    console.log("Prompt Version:", AI_PROMPT_VERSION);
    console.log("API Mode: OpenAI API (No Training)");
    console.log("User ID:", userId);
    console.log("Part Name:", jobInputs.partName || 'Not specified');
    console.log("Material:", jobInputs.material || 'Not specified');
    console.log("Number of machines:", machines?.length || 0);

    // Fetch compliance settings
    const { data: complianceSettings } = await supabase
      .from('compliance_settings')
      .select('setting_key, setting_value');
    
    const settings = complianceSettings?.reduce((acc: any, s: any) => {
      acc[s.setting_key] = s.setting_value;
      return acc;
    }, {}) || {};

    const enableAuditLogs = settings.enable_audit_logs !== 'false';
    const storeDrawings = settings.store_uploaded_drawings === 'true';

    // Build deterministic request payload for audit (without drawing data for privacy)
    const auditRequestPayload = {
      partName: jobInputs.partName,
      material: jobInputs.material,
      blankType: jobInputs.blankType,
      blankDimensions: {
        length: jobInputs.blankLength,
        width: jobInputs.blankWidth,
        thickness: jobInputs.blankThickness,
        diameter: jobInputs.blankDiameter,
      },
      orderQuantity: jobInputs.orderQuantity,
      productionType: jobInputs.productionType,
      toleranceLevel: jobInputs.toleranceLevel,
      surfaceFinish: jobInputs.surfaceFinish,
      notesToAi: jobInputs.notesToAi,
      machineGroups: machines?.map((m: any) => m.group_name) || [],
      hasDrawing: !!drawingBase64,
      drawingMimeType: drawingMimeType || null,
    };

    // Log drawing upload action if enabled
    if (enableAuditLogs && drawingBase64) {
      await supabase.from('quotation_audit_trail').insert({
        user_id: userId,
        user_email: userEmail,
        action_type: 'drawing_upload',
        part_name: jobInputs.partName,
        material: jobInputs.material,
        ai_prompt_version: AI_PROMPT_VERSION,
        request_payload: { drawingMimeType, hasDrawing: true },
        drawing_stored: storeDrawings,
      });
    }

    // Build user message with job context
    const jobContext = `
Job Parameters:
- Part Name: ${jobInputs.partName || 'Not specified'}
- Material: ${jobInputs.material || 'Not specified'}
- Blank Type: ${jobInputs.blankType || 'Not specified'}
- Blank Size: ${jobInputs.blankType === 'Round bar' 
    ? `Diameter ${jobInputs.blankDiameter}mm x Length ${jobInputs.blankLength}mm`
    : `${jobInputs.blankLength}mm x ${jobInputs.blankWidth}mm x ${jobInputs.blankThickness}mm`}
- Order Quantity: ${jobInputs.orderQuantity || 1}
- Production Type: ${jobInputs.productionType || 'Prototype'}
- Tolerance Level: ${jobInputs.toleranceLevel || 'Medium'}
- Surface Finish: ${jobInputs.surfaceFinish || 'Standard'}
- Additional Notes: ${jobInputs.notesToAi || 'None'}

Available Machine Groups:
${machines?.map((m: any) => `- ${m.group_name}: ${m.description} (${m.machine_type})`).join('\n') || 'Standard CNC machines'}

Please analyze the attached drawing and provide the technical interpretation.`;

    // Build messages array for OpenAI
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: drawingBase64 
          ? [
              { type: "text", text: jobContext },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:${drawingMimeType};base64,${drawingBase64}`,
                  detail: "high"
                }
              }
            ]
          : jobContext
      }
    ];

    console.log("Calling OpenAI API (gpt-4o)...");

    // Call OpenAI API directly - NO ChatGPT UI, NO training on this data
    // OpenAI API Terms: API data is not used for training
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "OpenAI API authentication failed. Please check API key." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    console.log("OpenAI response received, parsing JSON...");

    // Parse JSON response (OpenAI json_object mode ensures valid JSON)
    let interpretation;
    try {
      interpretation = JSON.parse(content);
      console.log("Successfully parsed interpretation:", interpretation.part_name);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw content:", content);
      
      // Log failed interpretation attempt
      if (enableAuditLogs) {
        await supabase.from('quotation_audit_trail').insert({
          user_id: userId,
          user_email: userEmail,
          action_type: 'ai_interpretation',
          part_name: jobInputs.partName,
          material: jobInputs.material,
          ai_prompt_version: AI_PROMPT_VERSION,
          request_payload: auditRequestPayload,
          response_summary: { error: 'JSON parse failed', rawLength: content.length },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to parse AI response as JSON",
        rawContent: content
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful AI interpretation
    if (enableAuditLogs) {
      await supabase.from('quotation_audit_trail').insert({
        user_id: userId,
        user_email: userEmail,
        action_type: 'ai_interpretation',
        part_name: interpretation.part_name || jobInputs.partName,
        material: interpretation.material_detected || jobInputs.material,
        machine_group: interpretation.suggested_machine_group,
        ai_prompt_version: AI_PROMPT_VERSION,
        request_payload: auditRequestPayload,
        response_summary: {
          partName: interpretation.part_name,
          suggestedMachine: interpretation.suggested_machine_group,
          baselineCycleTime: interpretation.baseline_cycle_time_min_reference_machine,
          operationsCount: interpretation.operations?.length || 0,
          warningsCount: interpretation.warnings?.length || 0,
        },
        cycle_time_result: interpretation.baseline_cycle_time_min_reference_machine,
        drawing_stored: storeDrawings,
      });
    }

    // Drawing is processed transiently - not stored unless storeDrawings is true
    // After this point, drawing data is discarded from memory
    console.log("Drawing processed transiently:", storeDrawings ? "Stored" : "Not stored (deleted from memory)");

    return new Response(JSON.stringify({ 
      success: true, 
      interpretation,
      metadata: {
        apiMode: "openai_api_no_training",
        promptVersion: AI_PROMPT_VERSION,
        drawingStored: storeDrawings,
        auditLogged: enableAuditLogs,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in interpret-drawing:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});