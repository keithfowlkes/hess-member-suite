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

    // First, get the organization and profile IDs
    const { data: org } = await supabaseClient
      .from('organizations')
      .select('id, contact_person_id')
      .eq('name', 'Fowlkes University')
      .single()

    if (!org) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { headers: { 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Update the profiles table
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        payment_platform: 'Flywire',
        meal_plan_management: 'CBORD',
        identity_management: 'Fischer Identity',
        door_access: 'None',
        document_management: 'DocuWare',
        secondary_contact_phone: '3433433434',
        updated_at: new Date().toISOString()
      })
      .eq('id', org.contact_person_id)

    if (profileError) throw profileError

    // Update the organizations table
    const { data, error } = await supabaseClient
      .from('organizations')
      .update({
        payment_platform: 'Flywire',
        meal_plan_management: 'CBORD',
        identity_management: 'Fischer Identity',
        door_access: 'None',
        document_management: 'DocuWare',
        secondary_contact_phone: '3433433434',
        approximate_date_joined_hess: '2014-01-01',
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
