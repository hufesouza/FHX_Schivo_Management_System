import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client for audit logging
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { 
      baselineCycleTime,
      machineId,
      orderQuantity,
      operationsCount,
      userId,
      userEmail,
      partName,
      material,
      quotationId
    } = await req.json();

    console.log("=== Cycle Time Recalculation ===");
    console.log("Machine ID:", machineId);
    console.log("Baseline time:", baselineCycleTime);
    console.log("Order quantity:", orderQuantity);

    // Fetch machine details
    const { data: machine, error: machineError } = await supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();

    if (machineError || !machine) {
      throw new Error("Machine not found");
    }

    // Fetch compliance settings
    const { data: complianceSettings } = await supabase
      .from('compliance_settings')
      .select('setting_key, setting_value');
    
    const settings = complianceSettings?.reduce((acc: any, s: any) => {
      acc[s.setting_key] = s.setting_value;
      return acc;
    }, {}) || {};

    const enableAuditLogs = settings.enable_audit_logs !== 'false';

    // Calculate cycle time using machine parameters
    const performanceFactor = machine.performance_factor || 1;
    const toolChanges = operationsCount * 6; // Default 6 tools per operation
    const toolChangeTime = machine.tool_change_time || 5; // seconds
    const loadUnloadTime = machine.load_unload_time || 60; // seconds
    const probingTime = machine.probing_time || 30; // seconds

    // Formula: (baseline * performance) + tool changes + load/unload + probing
    const cycleTimeMinutes = (baselineCycleTime * performanceFactor) +
      (toolChanges * toolChangeTime / 60) +
      (loadUnloadTime / 60) +
      (probingTime / 60);

    const cycleTime = Math.round(cycleTimeMinutes * 100) / 100;
    const totalTime = Math.round(cycleTime * orderQuantity * 100) / 100;

    // Check machine suitability
    const suitabilityWarnings: { type: string; message: string }[] = [];

    // Log machine selection and calculation
    if (enableAuditLogs) {
      await supabase.from('quotation_audit_trail').insert({
        user_id: userId,
        user_email: userEmail,
        action_type: 'machine_selection',
        quotation_id: quotationId,
        part_name: partName,
        material: material,
        machine_group: machine.group_name,
        machine_id: machineId,
        ai_prompt_version: settings.ai_prompt_version || 'v1.0',
        request_payload: {
          baselineCycleTime,
          orderQuantity,
          operationsCount,
        },
        response_summary: {
          selectedMachine: machine.group_name,
          resource: machine.resource,
          performanceFactor,
          toolChangeTime,
          loadUnloadTime,
          probingTime,
        },
        cycle_time_result: cycleTime,
      });

      await supabase.from('quotation_audit_trail').insert({
        user_id: userId,
        user_email: userEmail,
        action_type: 'cycle_time_calculation',
        quotation_id: quotationId,
        part_name: partName,
        material: material,
        machine_group: machine.group_name,
        machine_id: machineId,
        ai_prompt_version: settings.ai_prompt_version || 'v1.0',
        request_payload: {
          baselineCycleTime,
          performanceFactor,
          toolChanges,
          toolChangeTimeSeconds: toolChangeTime,
          loadUnloadTimeSeconds: loadUnloadTime,
          probingTimeSeconds: probingTime,
          orderQuantity,
        },
        response_summary: {
          cycleTimePerPart: cycleTime,
          totalTimeAllParts: totalTime,
          formula: "(baseline * performance) + (toolChanges * toolChangeTime/60) + (loadUnload/60) + (probing/60)",
        },
        cycle_time_result: cycleTime,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      cycleTime,
      totalTime,
      machine: {
        id: machine.id,
        resource: machine.resource,
        group_name: machine.group_name,
        description: machine.description,
        machine_type: machine.machine_type,
        performance_factor: performanceFactor,
        tool_change_time: toolChangeTime,
        load_unload_time: loadUnloadTime,
        probing_time: probingTime,
        suitable_for_prismatic: machine.suitable_for_prismatic,
        suitable_for_turned: machine.suitable_for_turned,
        suitable_for_5axis: machine.suitable_for_5axis,
        suitable_for_small_detailed: machine.suitable_for_small_detailed,
      },
      suitabilityWarnings,
      calculationDetails: {
        baselineCycleTime,
        performanceFactor,
        toolChanges,
        toolChangeContribution: Math.round((toolChanges * toolChangeTime / 60) * 100) / 100,
        loadUnloadContribution: Math.round((loadUnloadTime / 60) * 100) / 100,
        probingContribution: Math.round((probingTime / 60) * 100) / 100,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in recalculate-cycle-time:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});