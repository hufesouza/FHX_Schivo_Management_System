import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file provided in request');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Determine media type
    let mediaType = file.type;
    if (file.type === 'application/pdf') {
      mediaType = 'application/pdf';
    } else if (file.type.startsWith('image/')) {
      mediaType = file.type;
    }

    console.log(`Sending to AI with media type: ${mediaType}`);

    // Use Gemini to extract part information
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a technical drawing analyzer. Extract part information from engineering drawings/documents.
Look for:
- Part Number: Usually in title block, labeled as "Part No.", "P/N", "Part Number", "Drawing No.", or similar
- Description: Part name, title, or description from the title block
- Revision: Revision letter/number, often labeled as "Rev", "Revision", or shown in revision block

Be thorough - check title blocks, headers, revision blocks, and any text on the drawing.
If you cannot find a specific field, return null for that field.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the Part Number, Description, and Revision from this engineering drawing. Return ONLY the extracted values.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_part_details',
              description: 'Extract part details from an engineering drawing',
              parameters: {
                type: 'object',
                properties: {
                  part_number: {
                    type: 'string',
                    description: 'The part number from the drawing title block or header',
                    nullable: true
                  },
                  description: {
                    type: 'string', 
                    description: 'The part description or name from the drawing',
                    nullable: true
                  },
                  revision: {
                    type: 'string',
                    description: 'The revision letter or number',
                    nullable: true
                  }
                },
                required: ['part_number', 'description', 'revision']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_part_details' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_part_details') {
      console.error('No valid tool call in response');
      return new Response(
        JSON.stringify({ 
          part_number: null, 
          description: null, 
          revision: null,
          message: 'Could not extract part details from the drawing'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', extractedData);

    return new Response(
      JSON.stringify({
        part_number: extractedData.part_number || null,
        description: extractedData.description || null,
        revision: extractedData.revision || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing drawing:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process drawing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
