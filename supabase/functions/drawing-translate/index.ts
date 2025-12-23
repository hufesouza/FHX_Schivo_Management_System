import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranslationRequest {
  texts: string[];
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Record<string, string>;
  doNotTranslate?: string[];
}

interface TranslationResult {
  original: string;
  translated: string;
  wasSkipped: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, sourceLanguage, targetLanguage, glossary = {}, doNotTranslate = [] }: TranslationRequest = await req.json();

    if (!texts || texts.length === 0) {
      throw new Error('No texts provided for translation');
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('Lovable API key not configured');
    }

    console.log(`Translating ${texts.length} text segments from ${sourceLanguage} to ${targetLanguage}`);

    // Build do-not-translate patterns (part numbers, tolerances, etc.)
    const skipPatterns = [
      /^[A-Z]{2,4}[-\s]?\d{3,}/i, // Part numbers like "ABC-12345"
      /^[±]?\d+(\.\d+)?$/, // Pure numbers with optional tolerance
      /^[ØΦφ]\s?\d+/, // Diameter symbols
      /^Ra\s?\d+/, // Surface roughness
      /^[A-Z][-]?[A-Z]$/i, // Dimension references like "A-A"
      /^\d+[xX×]\d+/, // Multiplied dimensions
      ...doNotTranslate.map(pattern => new RegExp(`^${pattern}$`, 'i')),
    ];

    // Filter texts that should be translated
    const textsToTranslate: string[] = [];
    const skipIndices: Set<number> = new Set();

    texts.forEach((text, index) => {
      const trimmed = text.trim();
      
      // Skip empty strings
      if (!trimmed) {
        skipIndices.add(index);
        return;
      }
      
      // Check if it matches any skip pattern
      const shouldSkip = skipPatterns.some(pattern => pattern.test(trimmed));
      if (shouldSkip) {
        skipIndices.add(index);
        return;
      }

      // Check glossary for exact matches
      if (glossary[trimmed.toLowerCase()]) {
        skipIndices.add(index);
        return;
      }

      textsToTranslate.push(trimmed);
    });

    console.log(`${textsToTranslate.length} texts need translation, ${skipIndices.size} will be skipped`);

    let translations: string[] = [];

    if (textsToTranslate.length > 0) {
      // Build glossary context for AI
      const glossaryContext = Object.entries(glossary)
        .map(([term, translation]) => `"${term}" → "${translation}"`)
        .join(', ');

      const languageMap: Record<string, string> = {
        'auto': 'auto-detect',
        'pt-br': 'Brazilian Portuguese',
        'pt-pt': 'European Portuguese', 
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
        'it': 'Italian',
        'en': 'English',
      };

      const sourceLangName = languageMap[sourceLanguage.toLowerCase()] || sourceLanguage;
      const targetLangName = languageMap[targetLanguage.toLowerCase()] || targetLanguage;

      const systemPrompt = `You are a technical translator specializing in engineering and manufacturing drawings. 
Translate the following technical terms from ${sourceLangName} to ${targetLangName}.
${glossaryContext ? `Use this glossary for specific terms: ${glossaryContext}` : ''}

Important rules:
1. Keep translations concise - they must fit in small spaces on technical drawings
2. Preserve any numbers, units, symbols, and measurements exactly as they are
3. Use standard engineering terminology in ${targetLangName}
4. If a term is already in ${targetLangName} or is a universal technical term, keep it unchanged
5. Return ONLY the translated text, no explanations

Translate each line separately. Return translations in the same order, one per line.`;

      const userPrompt = textsToTranslate.join('\n');

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('Payment required. Please add credits to continue.');
        }
        const errorText = await response.text();
        console.error('Translation API error:', errorText);
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content || '';
      translations = translatedText.split('\n').map((t: string) => t.trim());

      // Pad translations if needed
      while (translations.length < textsToTranslate.length) {
        translations.push(textsToTranslate[translations.length]);
      }
    }

    // Build final results array
    const results: TranslationResult[] = [];
    let translationIndex = 0;

    texts.forEach((text, index) => {
      const trimmed = text.trim();
      
      if (skipIndices.has(index)) {
        // Check if it's a glossary term
        const glossaryTranslation = glossary[trimmed.toLowerCase()];
        results.push({
          original: text,
          translated: glossaryTranslation || text,
          wasSkipped: !glossaryTranslation,
        });
      } else {
        results.push({
          original: text,
          translated: translations[translationIndex] || text,
          wasSkipped: false,
        });
        translationIndex++;
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalTranslated: texts.length - skipIndices.size,
        totalSkipped: skipIndices.size,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
