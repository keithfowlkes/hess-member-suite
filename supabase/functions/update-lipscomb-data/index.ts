import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Update Fowlkes University with the correct data
    const { data, error } = await supabaseClient
      .from('organizations')
      .update({
        identity_management: 'Fischer Identity',
        door_access: 'CBORD',
        document_management: 'Adobe Document Cloud',
        voip: 'Microsoft Teams Voice',
        network_infrastructure: 'Extreme Networks',
        payment_platform: 'Flywire',
        meal_plan_management: 'CBORD',
        approximate_date_joined_hess: '2025-10-01',
        secondary_contact_phone: '8595163571',
        updated_at: new Date().toISOString()
      })
      .eq('name', 'Fowlkes University')
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fowlkes University data updated successfully',
        data 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
