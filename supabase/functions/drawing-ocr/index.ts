import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TextAnnotation {
  description: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
}

interface WordInfo {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerY: number;
}

interface OCRResult {
  text: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  rotation?: number;
}

// Group words that are on the same line (similar Y position and close X proximity)
function groupWordsIntoLines(words: WordInfo[]): OCRResult[] {
  if (words.length === 0) return [];

  // Sort by Y first, then X
  const sorted = [...words].sort((a, b) => {
    if (Math.abs(a.centerY - b.centerY) < a.height * 0.5) {
      return a.x - b.x;
    }
    return a.centerY - b.centerY;
  });

  const lines: WordInfo[][] = [];
  let currentLine: WordInfo[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const word = sorted[i];
    const lastWord = currentLine[currentLine.length - 1];
    
    // Check if word is on the same line (similar Y and reasonable X gap)
    const sameLineY = Math.abs(word.centerY - lastWord.centerY) < Math.max(word.height, lastWord.height) * 0.6;
    const horizontalGap = word.x - (lastWord.x + lastWord.width);
    const reasonableGap = horizontalGap < Math.max(word.width, lastWord.width) * 2;

    if (sameLineY && reasonableGap) {
      currentLine.push(word);
    } else {
      lines.push(currentLine);
      currentLine = [word];
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Convert grouped lines to OCR results
  return lines.map(lineWords => {
    const minX = Math.min(...lineWords.map(w => w.x));
    const minY = Math.min(...lineWords.map(w => w.y));
    const maxX = Math.max(...lineWords.map(w => w.x + w.width));
    const maxY = Math.max(...lineWords.map(w => w.y + w.height));
    
    const text = lineWords.map(w => w.text).join(' ');

    return {
      text,
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      confidence: 0.9,
      rotation: 0,
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, pageNumber, dpi = 300 } = await req.json();

    if (!imageBase64) {
      throw new Error('No image data provided');
    }

    const apiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    console.log(`Processing page ${pageNumber} with OCR at ${dpi} DPI`);

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 500,
                },
              ],
              imageContext: {
                languageHints: ['pt', 'pt-BR', 'fr', 'de', 'es', 'en'],
              },
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', errorText);
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const annotations = visionData.responses?.[0]?.textAnnotations || [];

    console.log(`Found ${annotations.length} text annotations`);

    // Extract individual words with positions
    const words: WordInfo[] = [];
    
    for (let i = 1; i < annotations.length; i++) {
      const annotation = annotations[i] as TextAnnotation;
      const vertices = annotation.boundingPoly?.vertices || [];
      
      if (vertices.length >= 4) {
        const xs = vertices.map(v => v.x || 0);
        const ys = vertices.map(v => v.y || 0);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        words.push({
          text: annotation.description,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          centerY: (minY + maxY) / 2,
        });
      }
    }

    console.log(`Extracted ${words.length} words, grouping into lines...`);

    // Group words into lines
    const results = groupWordsIntoLines(words);

    console.log(`Grouped into ${results.length} text lines/blocks`);

    // Get full text for context
    const fullText = annotations[0]?.description || '';

    return new Response(
      JSON.stringify({
        success: true,
        pageNumber,
        results,
        fullText,
        totalDetections: results.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OCR error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
