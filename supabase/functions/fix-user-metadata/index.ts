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

    const { email, fixAll = false } = await req.json().catch(() => ({ email: null, fixAll: false }));

    console.log(`Starting user metadata fix (email: ${email}, fixAll: ${fixAll})`);

    // Get profiles to fix
    let profiles;
    if (email) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, organization")
        .ilike("email", email);
      if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
      profiles = data;
    } else if (fixAll) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, user_id, email, first_name, last_name, organization");
      if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);
      profiles = data;
    } else {
      throw new Error("Must provide email or set fixAll=true");
    }

    const results = {
      total: 0,
      fixed: 0,
      failed: 0,
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

      results.total++;

      const currentMetadata = authUser.user.user_metadata || {};
      const rawMetadata = authUser.user.raw_user_meta_data || {};
      
      console.log(`User ${profile.email}:`);
      console.log(`  Auth email: ${authUser.user.email}`);
      console.log(`  user_metadata: ${JSON.stringify(currentMetadata)}`);
      console.log(`  raw_user_meta_data: ${JSON.stringify(rawMetadata)}`);

      // Check if metadata needs updating
      const needsUpdate = 
        currentMetadata.email !== profile.email ||
        rawMetadata.email !== profile.email ||
        authUser.user.email !== profile.email;

      if (needsUpdate) {
        // Update both email and user_metadata
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          profile.user_id,
          { 
            email: profile.email,
            user_metadata: {
              ...currentMetadata,
              email: profile.email,
              first_name: profile.first_name,
              last_name: profile.last_name,
              organization: profile.organization,
            }
          }
        );

        if (updateError) {
          console.error(`Failed to update ${profile.email}: ${updateError.message}`);
          results.details.push({
            email: profile.email,
            organization: profile.organization,
            status: "failed",
            error: updateError.message,
          });
          results.failed++;
        } else {
          console.log(`Fixed metadata for: ${profile.email}`);
          results.details.push({
            email: profile.email,
            organization: profile.organization,
            oldAuthEmail: authUser.user.email,
            oldMetadata: currentMetadata,
            status: "fixed",
          });
          results.fixed++;
        }
      } else {
        results.details.push({
          email: profile.email,
          organization: profile.organization,
          status: "already_correct",
        });
      }
    }

    console.log(`Fix complete: ${results.fixed} fixed, ${results.failed} failed`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in fix-user-metadata:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
