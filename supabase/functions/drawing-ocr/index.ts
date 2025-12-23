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

    // Skip the first annotation (it's the full text), process individual words/blocks
    const results: OCRResult[] = [];
    
    for (let i = 1; i < annotations.length; i++) {
      const annotation = annotations[i] as TextAnnotation;
      const vertices = annotation.boundingPoly?.vertices || [];
      
      if (vertices.length >= 4) {
        // Calculate bounding box from vertices
        const xs = vertices.map(v => v.x || 0);
        const ys = vertices.map(v => v.y || 0);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        // Calculate rotation from vertices (if text is rotated)
        const dx = (vertices[1]?.x || 0) - (vertices[0]?.x || 0);
        const dy = (vertices[1]?.y || 0) - (vertices[0]?.y || 0);
        const rotation = Math.atan2(dy, dx) * (180 / Math.PI);

        results.push({
          text: annotation.description,
          boundingBox: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          },
          confidence: 0.9, // Vision API doesn't always return confidence for TEXT_DETECTION
          rotation: Math.abs(rotation) > 5 ? rotation : 0,
        });
      }
    }

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
