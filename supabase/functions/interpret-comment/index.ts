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
    const { comment, topic, customer } = await req.json();
    
    console.log('interpret-comment called:', { comment, topic, customer });
    
    if (!comment || comment.trim().length === 0) {
      console.log('Empty comment, skipping');
      return new Response(
        JSON.stringify({ action: null, reason: 'Empty comment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalized = comment.trim().toLowerCase();
    const noActionPhrases = new Set([
      'ok',
      'okay',
      'done',
      'completed',
      'complete',
      'all good',
      'no issues',
      'no issue',
      'n/a',
      'na',
    ]);

    // Only skip action creation for very short "no-op" updates
    if (noActionPhrases.has(normalized)) {
      console.log('No-op comment, skipping');
      return new Response(
        JSON.stringify({ action: null, reason: 'No action needed for this comment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You turn daily manufacturing meeting comments into ONE actionable follow-up task.

Goal: Even if the comment is a status update (shipment, rework, waiting, due dates), convert it into a next-step action (confirm, chase, update, schedule, verify).

Output rules:
- Return ONLY the action text (no quotes, no labels)
- Start with a verb (Confirm / Follow up / Check / Update / Schedule / Escalate)
- Be specific (include item/order/batch when present)
- Keep it short (max 120 characters)

Only return the literal word null if the comment is clearly a no-op like "OK"/"Done" with no follow-up needed.

Examples:
- "waiting for tube material" -> Follow up with supplier for tube material ETA
- "shipment between today and tomorrow" -> Confirm shipment timing and update the tracker
- "rework completed" -> Update status to rework completed and confirm next shipment date
- "OK" -> null`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Customer: ${customer}\nTopic: ${topic}\nComment: "${comment}"\n\nGenerate an action task or respond with just "null" if no action is needed.` 
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted.' }),
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
    
    // Check if the AI returned null or a variation of it
    if (!generatedText || generatedText.toLowerCase() === 'null' || generatedText === '""' || generatedText === "''") {
      console.log('No action needed for comment');
      return new Response(
        JSON.stringify({ action: null, reason: 'No action needed for this comment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up the response - remove quotes if wrapped
    let action = generatedText.replace(/^["']|["']$/g, '').trim();
    
    // Truncate if too long
    if (action.length > 150) {
      action = action.substring(0, 147) + '...';
    }

    console.log('Generated action:', action);
    return new Response(
      JSON.stringify({ action, topic, customer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in interpret-comment function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
