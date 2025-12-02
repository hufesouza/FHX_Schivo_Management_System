import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const testUsers = [
  { email: 'hufesouza@gmail.com', role: 'engineering' },
  { email: 'hufesouza+ops@gmail.com', role: 'operations' },
  { email: 'hufesouza+qa@gmail.com', role: 'quality' },
  { email: 'hufesouza+npi@gmail.com', role: 'npi' },
  { email: 'hufesouza+sc@gmail.com', role: 'supply_chain' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];

    for (const user of testUsers) {
      // Create user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: '123456789',
        email_confirm: true,
      });

      if (authError) {
        // If user already exists, try to get their ID
        if (authError.message.includes('already been registered')) {
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === user.email);
          
          if (existingUser) {
            // Check if role already exists
            const { data: existingRole } = await supabaseAdmin
              .from('user_roles')
              .select('*')
              .eq('user_id', existingUser.id)
              .single();

            if (!existingRole) {
              // Assign role
              await supabaseAdmin.from('user_roles').insert({
                user_id: existingUser.id,
                role: user.role,
              });
            }

            results.push({ email: user.email, role: user.role, status: 'exists - role checked' });
          }
        } else {
          results.push({ email: user.email, error: authError.message });
        }
        continue;
      }

      if (authData.user) {
        // Assign role
        const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
          user_id: authData.user.id,
          role: user.role,
        });

        if (roleError) {
          results.push({ email: user.email, role: user.role, status: 'created', roleError: roleError.message });
        } else {
          results.push({ email: user.email, role: user.role, status: 'created with role' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
