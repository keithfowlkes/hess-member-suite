import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'accept');
    const token = String(body.token || '').trim();
    if (!token) return json({ error: 'Invitation token is required.' }, 400);

    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('organization_invitations')
      .select('*, organizations!inner(id, name)')
      .eq('invitation_token', token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invitation) return json({ error: 'This invitation link is not valid.' }, 404);

    if (invitation.used_at) return json({ error: 'This invitation has already been used.' }, 400);
    if (invitation.status === 'revoked' || invitation.revoked_at) {
      return json({ error: 'This invitation has been revoked.' }, 400);
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return json({ error: 'This invitation has expired. Please ask your primary contact to resend it.' }, 400);
    }

    const organizationName = (invitation as any).organizations?.name || '';

    if (action === 'lookup') {
      return json({
        success: true,
        invitation: {
          email: invitation.email,
          firstName: invitation.invited_first_name || '',
          lastName: invitation.invited_last_name || '',
          organizationName,
        },
      });
    }

    // action === 'accept'
    const password = String(body.password || '');
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: String(body.firstName || '').trim() || invitation.invited_first_name || '',
        last_name: String(body.lastName || '').trim() || invitation.invited_last_name || '',
        organization: organizationName,
      },
    });

    if (createErr || !created?.user) {
      console.error('[accept-organization-invitation] create user failed', createErr);
      return json({ error: createErr?.message || 'Could not create the account.' }, 400);
    }

    await supabaseAdmin
      .from('organization_invitations')
      .update({ used_at: new Date().toISOString(), status: 'accepted' })
      .eq('id', invitation.id);

    return json({ success: true, email: invitation.email, organizationName });
  } catch (error: any) {
    console.error('[accept-organization-invitation] error', error);
    return json({ error: error?.message || 'Unexpected error' }, 500);
  }
});
