import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user from the auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Only admins can send invitations");
    }

    const { email, role }: InviteRequest = await req.json();

    if (!email || !role) {
      throw new Error("Email and role are required");
    }

    console.log(`Creating invitation for ${email} with role ${role}`);

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("invitations")
      .insert({
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    console.log("Invitation created:", invitation.id);

    // Build the invite URL - get the origin from headers
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    // Extract base URL from referer if origin is not available
    let baseUrl = origin;
    if (!baseUrl && referer) {
      try {
        const refererUrl = new URL(referer);
        baseUrl = `${refererUrl.protocol}//${refererUrl.host}`;
      } catch {
        baseUrl = null;
      }
    }
    
    if (!baseUrl) {
      throw new Error("Could not determine application URL");
    }
    
    const inviteUrl = `${baseUrl}/auth?token=${invitation.token}`;
    console.log("Invite URL generated:", inviteUrl);

    // Return the invite link for manual sharing (email sending disabled)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation created successfully",
        inviteUrl: inviteUrl,
        email: email,
        role: role
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});