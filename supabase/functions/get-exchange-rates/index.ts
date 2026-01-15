import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch exchange rates from Frankfurter API (uses ECB data - reliable and free)
    // Base currency is EUR
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CAD"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Return rates with EUR as base (EUR = 1.0)
    const rates = {
      EUR: 1.0,
      USD: data.rates.USD,
      GBP: data.rates.GBP,
      CAD: data.rates.CAD,
      date: data.date,
      source: "European Central Bank via Frankfurter API"
    };

    return new Response(JSON.stringify(rates), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching exchange rates:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Return fallback rates if API fails
    return new Response(
      JSON.stringify({
        EUR: 1.0,
        USD: 1.08,
        GBP: 0.86,
        CAD: 1.47,
        date: new Date().toISOString().split('T')[0],
        source: "Fallback rates",
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
