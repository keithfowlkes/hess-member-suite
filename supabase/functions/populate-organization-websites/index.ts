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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch organizations without websites
    const { data: organizations, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, city, state')
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

    for (const org of organizations) {
      try {
        const searchQuery = `What is the official website URL for ${org.name}${org.city ? ` in ${org.city}` : ''}${org.state ? `, ${org.state}` : ''}? Please respond with ONLY the URL, nothing else.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that finds official website URLs for organizations. Respond with ONLY the URL, no additional text or explanation.'
              },
              {
                role: 'user',
                content: searchQuery
              }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.error(`Rate limit exceeded for ${org.name}`);
            failed++;
            continue;
          }
          throw new Error(`AI gateway error: ${response.status}`);
        }

        const data = await response.json();
        const website = data.choices?.[0]?.message?.content?.trim();

        if (website && (website.startsWith('http://') || website.startsWith('https://'))) {
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ website })
            .eq('id', org.id);

          if (updateError) {
            console.error(`Failed to update ${org.name}:`, updateError);
            failed++;
          } else {
            console.log(`Updated ${org.name}: ${website}`);
            updated++;
          }
        } else {
          console.log(`No valid website found for ${org.name}`);
          failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${org.name}:`, error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Website population completed',
        total: organizations.length,
        updated,
        failed
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
