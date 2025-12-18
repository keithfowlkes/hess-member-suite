import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { dryRun = true } = await req.json().catch(() => ({ dryRun: true }));

    console.log(`Starting email mismatch repair (dryRun: ${dryRun})`);

    // Find all mismatched accounts
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, email, first_name, last_name, organization");

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const results = {
      total: 0,
      repaired: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };

    for (const profile of profiles || []) {
      if (!profile.user_id) continue;

      // Get the auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

      if (authError || !authUser?.user) {
        console.log(`No auth user found for profile ${profile.id}`);
        continue;
      }

      const authEmail = authUser.user.email;
      const profileEmail = profile.email;

      // Check if there's a mismatch
      if (authEmail && profileEmail && authEmail.toLowerCase() !== profileEmail.toLowerCase()) {
        results.total++;

        if (dryRun) {
          results.details.push({
            organization: profile.organization,
            profileEmail,
            authEmail,
            status: "would_repair",
          });
          results.skipped++;
        } else {
          // Update auth.users email to match profile email
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            profile.user_id,
            { email: profileEmail }
          );

          if (updateError) {
            console.error(`Failed to update ${profileEmail}: ${updateError.message}`);
            results.details.push({
              organization: profile.organization,
              profileEmail,
              authEmail,
              status: "failed",
              error: updateError.message,
            });
            results.failed++;
          } else {
            console.log(`Repaired: ${authEmail} -> ${profileEmail}`);
            results.details.push({
              organization: profile.organization,
              profileEmail,
              authEmail,
              status: "repaired",
            });
            results.repaired++;

            // Log the repair action
            await supabaseAdmin.from("audit_log").insert({
              action: "email_mismatch_repair",
              entity_type: "profile",
              entity_id: profile.id,
              details: {
                old_auth_email: authEmail,
                new_auth_email: profileEmail,
                organization: profile.organization,
              },
            });
          }
        }
      }
    }

    console.log(`Repair complete: ${results.repaired} repaired, ${results.failed} failed, ${results.skipped} skipped`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in repair-email-mismatches:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
