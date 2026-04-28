import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { changeLogId } = await req.json();
    if (!changeLogId) {
      return new Response(JSON.stringify({ error: 'changeLogId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: log } = await supabase
      .from('npi_change_log').select('*').eq('id', changeLogId).single();

    if (!log) throw new Error('Change log not found');

    const { data: recipients } = await supabase
      .from('npi_email_recipients').select('*').eq('is_active', true);

    if (!recipients || recipients.length === 0) {
      await supabase.from('npi_change_log').update({
        email_sent: false, email_error: 'No recipients configured',
      }).eq('id', changeLogId);
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const to = recipients.filter((r: any) => r.role === 'planning_owner').map((r: any) => r.email);
    const cc = recipients.filter((r: any) => r.role !== 'planning_owner').map((r: any) => r.email);

    const fieldLabel = log.field_changed === 'committed_date' ? 'Committed Date' : 'Machine Allocation';
    const subject = `[NPI Capacity Planner] ${fieldLabel} changed — ${log.part_number}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:8px;">
          NPI ${fieldLabel} Change Notification
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;width:40%;">Customer</td>
              <td style="padding:8px;">${log.customer_name || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Part Number</td>
              <td style="padding:8px;">${log.part_number || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Project</td>
              <td style="padding:8px;">${log.project_name || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Field Changed</td>
              <td style="padding:8px;">${fieldLabel}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Previous Value</td>
              <td style="padding:8px;color:#dc2626;">${log.previous_value || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">New Value</td>
              <td style="padding:8px;color:#16a34a;font-weight:bold;">${log.new_value || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Reason / Comment</td>
              <td style="padding:8px;">${log.reason || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Updated By</td>
              <td style="padding:8px;">${log.changed_by_name || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold;">Date / Time</td>
              <td style="padding:8px;">${new Date(log.created_at).toLocaleString()}</td></tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#6b7280;">
          Automated notification from NPI Capacity Planner.
        </p>
      </div>`;

    // Send via Resend API (uses onboarding@resend.dev — no domain verification needed)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NPI Capacity Planner <onboarding@resend.dev>',
        to: to.length ? to : cc,
        cc: to.length ? cc : undefined,
        subject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      await supabase.from('npi_change_log').update({
        email_sent: false, email_error: JSON.stringify(result),
      }).eq('id', changeLogId);
      throw new Error(`Email send failed: ${JSON.stringify(result)}`);
    }

    await supabase.from('npi_change_log').update({
      email_sent: true, email_sent_at: new Date().toISOString(),
    }).eq('id', changeLogId);

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('npi-notify-change error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
