import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdvanceWorkflowRequest {
  work_order_id: string;
  current_stage: string;
  next_assignee_id: string;
}

// Workflow order
const WORKFLOW_STAGES = ['header', 'engineering', 'operations', 'quality', 'npi', 'supply_chain', 'completed'];

const STAGE_TO_DEPARTMENT: Record<string, string> = {
  'engineering': 'engineering',
  'operations': 'operations',
  'quality': 'quality',
  'npi': 'npi',
  'supply_chain': 'supply_chain',
};

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  'header': 'Header',
  'engineering': 'Engineering Review',
  'operations': 'Operations Review',
  'quality': 'Quality Review',
  'npi': 'NPI Final Review',
  'supply_chain': 'Supply Chain Administration',
  'completed': 'Completed',
};

serve(async (req) => {
  console.log("=== ADVANCE-WORKFLOW REQUEST RECEIVED ===");
  console.log("Method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract JWT token
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the JWT using the admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    console.log("Auth result - user:", !!user, "error:", authError?.message);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("User authenticated:", user.id);

    const { work_order_id, current_stage, next_assignee_id }: AdvanceWorkflowRequest = await req.json();

    console.log(`Advancing workflow for work order ${work_order_id} from ${current_stage} to next assignee ${next_assignee_id}`);

    // Get work order details
    const { data: workOrder, error: woError } = await supabaseAdmin
      .from("work_orders")
      .select("*")
      .eq("id", work_order_id)
      .single();

    if (woError || !workOrder) {
      console.error("Work order not found:", woError);
      return new Response(JSON.stringify({ error: "Work order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine next stage
    const currentIndex = WORKFLOW_STAGES.indexOf(current_stage);
    const nextStage = WORKFLOW_STAGES[currentIndex + 1];

    if (!nextStage) {
      return new Response(JSON.stringify({ error: "Already at final stage" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Close current task if exists
    const { error: closeTaskError } = await supabaseAdmin
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("work_order_id", work_order_id)
      .eq("status", "pending");

    if (closeTaskError) {
      console.error("Error closing task:", closeTaskError);
    }

    // Update work order stage and status
    const updateData: Record<string, string> = {
      current_stage: nextStage,
    };

    if (nextStage === 'completed') {
      updateData.status = 'completed';
    } else if (workOrder.status === 'draft') {
      updateData.status = 'in_review';
    }

    const { error: updateError } = await supabaseAdmin
      .from("work_orders")
      .update(updateData)
      .eq("id", work_order_id);

    if (updateError) {
      console.error("Error updating work order:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update work order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If not completed, create new task and send email
    if (nextStage !== 'completed') {
      const department = STAGE_TO_DEPARTMENT[nextStage];

      // Create task for next assignee
      const { error: taskError } = await supabaseAdmin
        .from("tasks")
        .insert({
          work_order_id,
          assigned_to: next_assignee_id,
          assigned_by: user.id,
          department,
          status: "pending",
        });

      if (taskError) {
        console.error("Error creating task:", taskError);
      }

      // Get assignee email
      const { data: assigneeProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", next_assignee_id)
        .single();

      if (profileError || !assigneeProfile) {
        console.error("Assignee profile not found:", profileError);
      } else {
        // Get base URL
        const origin = req.headers.get("origin");
        const referer = req.headers.get("referer");
        let baseUrl = origin;
        if (!baseUrl && referer) {
          try {
            const refererUrl = new URL(referer);
            baseUrl = `${refererUrl.protocol}//${refererUrl.host}`;
          } catch {
            baseUrl = null;
          }
        }

        const reviewUrl = baseUrl ? `${baseUrl}/work-order/${work_order_id}` : "#";

        // Send notification email using Resend API
        try {
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY) {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "Blue Review <onboarding@resend.dev>",
                to: [assigneeProfile.email],
                subject: `Blue Review Task: ${workOrder.work_order_number || 'New Review'} - ${STAGE_DISPLAY_NAMES[nextStage]}`,
                html: `
                  <h1>New Task Assigned</h1>
                  <p>Hello ${assigneeProfile.full_name || 'Team Member'},</p>
                  <p>A Blue Review has been assigned to you for the <strong>${STAGE_DISPLAY_NAMES[nextStage]}</strong> stage.</p>
                  <h2>Review Details:</h2>
                  <ul>
                    <li><strong>Work Order:</strong> ${workOrder.work_order_number || 'Not assigned'}</li>
                    <li><strong>Customer:</strong> ${workOrder.customer || 'Not specified'}</li>
                    <li><strong>Part:</strong> ${workOrder.part_and_rev || 'Not specified'}</li>
                  </ul>
                  <p><a href="${reviewUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">Review Now</a></p>
                  <p>Best regards,<br>Blue Review System</p>
                `,
              }),
            });
            const emailResult = await emailResponse.json();
            console.log("Email sent successfully:", emailResult);
          } else {
            console.warn("RESEND_API_KEY not configured, skipping email");
          }
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }
    }

    console.log(`Workflow advanced to ${nextStage}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        next_stage: nextStage,
        is_completed: nextStage === 'completed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in advance-workflow:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
