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

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentYear = today.getUTCFullYear();
    const currentYY = currentYear % 100;

    const systemPrompt = `You are a date extraction assistant. Today's date is ${todayIso}.
Your task is to find and extract the date mentioned in the action text and return it in ISO format YYYY-MM-DD.

Rules:
1. Look for dates in formats like "15/01", "15/01/26", "15-01-26", "15 Jan", "January 15", "15/1/2026".
2. Dates typically appear at the START of the action (e.g., "15/01 - Follow up").
3. Day/Month order is DAY/MONTH (European format). "15/01" = 15 January.
4. If NO year is given, assume the most recent past or current year so the date is on or before today (${todayIso}). Never return a future date unless the text explicitly states a future year.
5. If a 2-digit year is given: treat 00-${String(currentYY).padStart(2,'0')} as 20xx, anything higher as 19xx. Current 2-digit year is ${currentYY}.
6. If no date is found, return exactly: null
7. Return ONLY the date string (YYYY-MM-DD) or null. No extra text.

Examples (assuming today is ${todayIso}):
- "15/01 - Chase supplier" -> ${currentYear}-01-15
- "15/01/26 - waiting" -> 2026-01-15
- "Follow up on 23 Jan" -> ${currentYear}-01-23
- "Complete review by end of month" -> null`;

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
