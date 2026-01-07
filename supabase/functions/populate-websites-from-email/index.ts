import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch organizations without websites that have an email
    const { data: organizations, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, email, contact_person_id')
      .or('website.is.null,website.eq.')
      .eq('membership_status', 'active');

    if (fetchError) throw fetchError;

    if (!organizations || organizations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No organizations need website updates' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    let failed = 0;
    const results: { name: string; email: string; website: string }[] = [];

    for (const org of organizations) {
      try {
        // Get email from org or from profile
        let email = org.email;
        
        if (!email && org.contact_person_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', org.contact_person_id)
            .single();
          
          email = profile?.email;
        }

        if (!email || !email.includes('@')) {
          console.log(`No valid email for ${org.name}`);
          failed++;
          continue;
        }

        // Extract domain from email
        const domain = email.split('@')[1];
        
        if (!domain) {
          console.log(`Could not extract domain from ${email}`);
          failed++;
          continue;
        }

        // Format as website URL
        const website = `https://www.${domain}`;

        // Update the organization
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ website })
          .eq('id', org.id);

        if (updateError) {
          console.error(`Failed to update ${org.name}:`, updateError);
          failed++;
        } else {
          console.log(`Updated ${org.name}: ${website}`);
          results.push({ name: org.name, email, website });
          updated++;
        }

      } catch (error) {
        console.error(`Error processing ${org.name}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Website population from email completed',
        total: organizations.length,
        updated,
        failed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
