import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action_text } = await req.json();
    
    console.log('parse-action-date called:', { action_text });
    
    if (!action_text || action_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ date: null, reason: 'Empty action text' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a date extraction assistant. Your task is to find and extract any date mentioned in the action text.

Rules:
1. Look for dates in various formats: "15/01/25", "15 Jan 2025", "January 15", "15-01-2025", etc.
2. Dates often appear at the START of action text (e.g., "15/01/25 - Follow up with customer")
3. Return the date in ISO format: YYYY-MM-DD
4. If the year is 2-digit (e.g., "25"), assume 2025 for values 00-50, 1900s for 51-99
5. If no date is found, return exactly: null
6. Return ONLY the date string or null, nothing else

Examples:
- "15/01/25 - Chase material supplier" -> 2025-01-15
- "Follow up on 23 Jan" -> 2025-01-23
- "29/01/25 - waiting for tubes delivery" -> 2025-01-29
- "Complete review by end of month" -> null
- "Chase customer for feedback" -> null`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: action_text }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ date: null, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ date: null, error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim();
    
    console.log('AI response:', { generatedText });
    
    // Check if the AI returned null
    if (!generatedText || generatedText.toLowerCase() === 'null') {
      return new Response(
        JSON.stringify({ date: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(generatedText)) {
      console.log('Invalid date format returned:', generatedText);
      return new Response(
        JSON.stringify({ date: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify it's a valid date
    const parsedDate = new Date(generatedText);
    if (isNaN(parsedDate.getTime())) {
      console.log('Invalid date value:', generatedText);
      return new Response(
        JSON.stringify({ date: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ date: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-action-date function:', error);
    return new Response(
      JSON.stringify({ date: null, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
