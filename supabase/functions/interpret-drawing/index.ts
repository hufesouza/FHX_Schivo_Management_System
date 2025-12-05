import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  try {
    const { drawingBase64, drawingMimeType, jobInputs, machines } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing drawing interpretation request");
    console.log("Job inputs:", JSON.stringify(jobInputs));
    console.log("Number of machines:", machines?.length || 0);

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

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: drawingBase64 
          ? [
              { type: "text", text: jobContext },
              { 
                type: "image_url", 
                image_url: { url: `data:${drawingMimeType};base64,${drawingBase64}` }
              }
            ]
          : jobContext
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing JSON...");

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    try {
      const interpretation = JSON.parse(jsonStr);
      console.log("Successfully parsed interpretation:", interpretation.part_name);
      
      return new Response(JSON.stringify({ 
        success: true, 
        interpretation 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw content:", content);
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to parse AI response as JSON",
        rawContent: content
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
