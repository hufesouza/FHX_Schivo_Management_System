import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlagData {
  topic: string;
  customer: string;
  status: 'green' | 'amber' | 'red' | 'none';
  comment: string;
}

interface ActionData {
  action: string;
  owner_name: string | null;
  priority: string;
  due_date: string | null;
  status: string;
}

interface RecognitionData {
  recognized_user_name: string;
  reason: string;
  recognized_by_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { flags, actions, recognitions, meetingDate } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the meeting context
    const flagsList = (flags as FlagData[])
      .filter(f => f.status !== 'none' && (f.comment || f.status !== 'green'))
      .map(f => {
        const statusEmoji = f.status === 'green' ? '🟢' : f.status === 'amber' ? '🟡' : '🔴';
        return `${statusEmoji} ${f.customer} - ${f.topic}: ${f.comment || 'No comment'}`;
      })
      .join('\n');

    const actionsList = (actions as ActionData[])
      .map(a => {
        const priorityEmoji = a.priority === 'critical' ? '🔴' : a.priority === 'high' ? '🟠' : a.priority === 'medium' ? '🟡' : '🟢';
        return `${priorityEmoji} ${a.action} (Owner: ${a.owner_name || 'Unassigned'}, Status: ${a.status}, Due: ${a.due_date || 'Not set'})`;
      })
      .join('\n');

    const recognitionsList = (recognitions as RecognitionData[])
      .map(r => `🌟 ${r.recognized_user_name}: ${r.reason} (by ${r.recognized_by_name})`)
      .join('\n');

    const systemPrompt = `You are a manufacturing operations assistant that creates concise, actionable meeting summaries for daily stand-up meetings.

Your task is to:
1. Summarize the key discussion points and status updates
2. Highlight critical issues requiring immediate attention
3. Identify patterns or recurring themes
4. Provide 2-3 key takeaways

Keep the summary:
- Brief and scannable (bullet points preferred)
- Focused on actionable insights
- Professional but friendly
- Under 300 words

Format your response as:
## Key Takeaways
- [2-3 most important points]

## Issues Requiring Attention
- [List amber/red items needing follow-up]

## Positive Updates
- [Green items and recognitions]

## Recommended Next Steps
- [1-2 suggested actions]`;

    const userPrompt = `Here is the data from the daily meeting on ${meetingDate}:

STATUS FLAGS:
${flagsList || 'No status flags recorded.'}

ACTION ITEMS:
${actionsList || 'No action items recorded.'}

RECOGNITIONS:
${recognitionsList || 'No recognitions.'}

Please generate a structured summary of this meeting.`;

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
          { role: 'user', content: userPrompt }
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
    const summary = data.choices?.[0]?.message?.content?.trim();

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in meeting-summary function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
