import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONSUMER_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'proton.me', 'protonmail.com',
];

const PORTAL_URL = 'https://members.hessconsortium.app';

function domainFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const parts = String(email).trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1].replace(/[>,;\s]/g, '') || null;
}

function domainFromWebsite(website?: string | null): string | null {
  if (!website) return null;
  try {
    const raw = String(website).trim();
    if (!raw) return null;
    const host = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase();
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function allowedDomains(primaryEmail?: string | null, orgEmail?: string | null, website?: string | null): string[] {
  const out: string[] = [];
  for (const d of [domainFromEmail(primaryEmail), domainFromEmail(orgEmail), domainFromWebsite(website)]) {
    if (!d) continue;
    if (CONSUMER_EMAIL_DOMAINS.includes(d)) continue;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

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

    // Authenticate caller
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Not authenticated' }, 401);

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'Not authenticated' }, 401);
    const caller = userData.user;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'create');
    const organizationId = String(body.organizationId || '');

    if (!organizationId) return json({ error: 'organizationId is required' }, 400);

    // Verify caller is the primary contact of this organization
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .select('id, name, email, website, contact_person_id')
      .eq('id', organizationId)
      .maybeSingle();
    if (orgErr) throw orgErr;
    if (!org) return json({ error: 'Organization not found' }, 404);

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (!callerProfile || org.contact_person_id !== callerProfile.id) {
      return json({ error: 'Only the primary contact for this institution can send invitations.' }, 403);
    }

    const domains = allowedDomains(callerProfile.email || caller.email, org.email, org.website);
    if (domains.length === 0) {
      return json({ error: 'No institutional email domain is on file for your organization. Please contact HESS staff.' }, 400);
    }

    const sendEmail = async (email: string, inviteToken: string, expiresAt: Date, firstName?: string) => {
      const link = `${PORTAL_URL}/auth?invitation=${inviteToken}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #4b2e83;">You're invited to the HESS Member Portal</h2>
          <p>Hello${firstName ? ` ${firstName}` : ''},</p>
          <p><strong>${callerProfile.first_name} ${callerProfile.last_name}</strong>, the primary contact for
          <strong>${org.name}</strong>, has invited you to create your own account on the HESS Consortium Member Portal.</p>
          <p>Your account will give you access to the member information your institution shares with the consortium.
          Only the primary contact can update the institution record or view billing information.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${link}" style="background-color: #4b2e83; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Create Your Account</a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation expires on ${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
          <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
          <p>Best regards,<br>HESS Consortium Team</p>
        </div>`;

      const { error: emailErr } = await supabaseAdmin.functions.invoke('centralized-email-delivery', {
        body: {
          type: 'custom',
          to: email,
          subject: `Invitation to the HESS Member Portal - ${org.name}`,
          template: html,
          data: { organization_name: org.name },
        },
      });
      if (emailErr) console.error('[invite-organization-user] email send failed', emailErr);
      return !emailErr;
    };

    if (action === 'resend') {
      const invitationId = String(body.invitationId || '');
      if (!invitationId) return json({ error: 'invitationId is required' }, 400);

      const { data: invitation, error: invErr } = await supabaseAdmin
        .from('organization_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invitation) return json({ error: 'Invitation not found' }, 404);
      if (invitation.used_at) return json({ error: 'This invitation has already been accepted.' }, 400);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await supabaseAdmin
        .from('organization_invitations')
        .update({ expires_at: expiresAt.toISOString(), status: 'pending', revoked_at: null })
        .eq('id', invitationId);

      const sent = await sendEmail(invitation.email, invitation.invitation_token, expiresAt, invitation.invited_first_name);
      return json({ success: true, emailSent: sent });
    }

    if (action === 'revoke') {
      const invitationId = String(body.invitationId || '');
      if (!invitationId) return json({ error: 'invitationId is required' }, 400);

      const { error: revokeErr } = await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .is('used_at', null);
      if (revokeErr) throw revokeErr;
      return json({ success: true });
    }

    if (action === 'delete') {
      const invitationId = String(body.invitationId || '');
      if (!invitationId) return json({ error: 'invitationId is required' }, 400);

      const { data: invitation, error: invErr } = await supabaseAdmin
        .from('organization_invitations')
        .select('id, email, used_at')
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (invErr) throw invErr;
      if (!invitation) return json({ error: 'Invitation not found' }, 404);

      let accountRemoved = false;

      // If the colleague already created an account, remove their portal access too.
      if (invitation.used_at) {
        const { data: colleagueProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, user_id, email')
          .ilike('email', invitation.email)
          .maybeSingle();

        if (colleagueProfile) {
          if (colleagueProfile.id === org.contact_person_id || colleagueProfile.id === callerProfile.id) {
            return json({ error: 'This person is the primary contact and cannot be removed here.' }, 400);
          }
          const { data: otherOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('contact_person_id', colleagueProfile.id)
            .maybeSingle();
          if (otherOrg) {
            return json({ error: 'This person is the primary contact for an institution and cannot be removed here.' }, 400);
          }

          if (colleagueProfile.user_id) {
            const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(colleagueProfile.user_id);
            if (delAuthErr) console.error('[invite-organization-user] auth delete failed', delAuthErr);
          }
          await supabaseAdmin.from('profiles').delete().eq('id', colleagueProfile.id);
          accountRemoved = true;
        }
      }

      const { error: delErr } = await supabaseAdmin
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('organization_id', organizationId);
      if (delErr) throw delErr;

      return json({ success: true, accountRemoved });
    }

    // Default action: create invitation
    const email = String(body.email || '').trim().toLowerCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const canEditOrganization = body.canEditOrganization === true;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'A valid email address is required.' }, 400);
    }
    if (!firstName || !lastName) {
      return json({ error: 'First and last name are required.' }, 400);
    }

    const emailDomain = domainFromEmail(email);
    if (!emailDomain || !domains.includes(emailDomain)) {
      return json({
        error: `Invitations must use an email address at ${domains.map((d) => `@${d}`).join(' or ')}.`,
      }, 400);
    }

    // Reject addresses that already have an account
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (existingProfile) {
      return json({ error: 'That person already has a portal account.' }, 400);
    }

    // Reject an outstanding pending invitation for the same address
    const { data: existingInvite } = await supabaseAdmin
      .from('organization_invitations')
      .select('id, used_at, status')
      .eq('organization_id', organizationId)
      .ilike('email', email)
      .is('used_at', null)
      .neq('status', 'revoked')
      .maybeSingle();
    if (existingInvite) {
      return json({ error: 'An invitation is already pending for that email address.' }, 400);
    }

    const inviteToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        invitation_token: inviteToken,
        invited_by: caller.id,
        invited_first_name: firstName,
        invited_last_name: lastName,
        status: 'pending',
        can_edit_organization: canEditOrganization,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    const sent = await sendEmail(email, inviteToken, expiresAt, firstName);

    return json({ success: true, invitationId: inserted.id, emailSent: sent });
  } catch (error: any) {
    console.error('[invite-organization-user] error', error);
    return json({ error: error?.message || 'Unexpected error' }, 500);
  }
});
