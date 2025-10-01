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

    // Update Lipscomb University with the correct data
    const { data, error } = await supabaseClient
      .from('organizations')
      .update({
        identity_management: 'Microsoft Entra ID',
        door_access: 'None',
        document_management: 'None',
        voip: 'None',
        network_infrastructure: 'None',
        updated_at: new Date().toISOString()
      })
      .eq('name', 'Lipscomb University')
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lipscomb University data updated successfully',
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
