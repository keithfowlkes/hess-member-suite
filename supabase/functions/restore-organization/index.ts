import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireAdmin, getServiceClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;
    const { deletionId } = await req.json();
    if (!deletionId) return json({ error: 'Missing deletionId' }, 400);

    const db = getServiceClient();
    const { data: rec, error } = await db.from('organization_deletions').select('*').eq('id', deletionId).single();
    if (error || !rec) return json({ error: 'Deletion record not found' }, 404);
    if (rec.restored_at) return json({ error: 'Already restored' }, 400);

    const { data: existing } = await db.from('organizations').select('id').eq('id', rec.organization_id).maybeSingle();
    if (existing) return json({ error: 'Organization already exists in membership' }, 400);

    const snap: any = rec.snapshot ?? {};
    const today = new Date().toISOString().split('T')[0];
    let orgRow: any;
    if (snap.organization) {
      orgRow = { ...snap.organization, contact_person_id: null, membership_status: 'active', updated_at: new Date().toISOString() };
    } else {
      orgRow = {
        id: rec.organization_id,
        name: rec.organization_name,
        email: rec.contact_email,
        country: 'United States',
        organization_type: 'member',
        membership_status: 'active',
        membership_start_date: today,
        annual_fee_amount: 0,
        notes: `Restored from member cancellations on ${today}. Original details were not saved; please complete the profile.`,
      };
    }
    const { error: insErr } = await db.from('organizations').insert(orgRow);
    if (insErr) return json({ error: insErr.message }, 500);

    let invoicesRestored = 0;
    if (Array.isArray(snap.invoices) && snap.invoices.length) {
      const { error: invErr, data: invData } = await db.from('invoices').upsert(snap.invoices, { onConflict: 'id', ignoreDuplicates: true }).select('id');
      if (invErr) console.error('Invoice restore error', invErr);
      invoicesRestored = invData?.length ?? 0;
    }

    await db.from('organization_deletions').update({ restored_at: new Date().toISOString(), restored_by: auth.userId }).eq('id', deletionId);
    await db.from('audit_log').insert({
      action: 'organization_restored', entity_type: 'organization', entity_id: rec.organization_id,
      user_id: auth.userId, details: { organizationName: rec.organization_name, invoicesRestored },
    });
    return json({ success: true, invoicesRestored, fullRestore: !!snap.organization });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
