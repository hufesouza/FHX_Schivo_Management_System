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
    
    if (!comment || comment.trim().length === 0) {
      return new Response(
        JSON.stringify({ action: null, reason: 'Empty comment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an assistant that helps manufacturing engineers by interpreting their meeting comments and creating actionable tasks.

Given a comment from a daily meeting about a specific topic and customer, generate a clear, actionable task description.

Rules:
1. The action should be concise (max 100 characters)
2. Start with a verb (e.g., "Get", "Order", "Follow up", "Check", "Confirm", "Schedule")
3. Be specific about what needs to be done
4. If the comment doesn't warrant an action (e.g., just a status update like "OK" or "Done"), respond with null
5. Focus on the next step the engineer needs to take

Examples:
- Comment: "waiting for tube material" → Action: "Get tube material from supplier"
- Comment: "need to check drawing revision" → Action: "Check and confirm drawing revision with customer"
- Comment: "OK" → null (no action needed)
- Comment: "price pending" → Action: "Follow up on pricing with commercial team"
- Comment: "tooling delayed" → Action: "Follow up on tooling delivery status"`;

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
    
    // Check if the AI returned null or a variation of it
    if (!generatedText || generatedText.toLowerCase() === 'null' || generatedText === '""' || generatedText === "''") {
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
