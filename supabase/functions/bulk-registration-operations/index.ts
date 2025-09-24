import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { operation, registrationIds, rejectionReason, priority, adminUserId } = await req.json();
    
    if (!operation || !registrationIds || !Array.isArray(registrationIds) || registrationIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing bulk operation: ${operation} for ${registrationIds.length} registrations`);

    let results = [];
    let errors = [];

    if (operation === 'approve') {
      // Process each registration approval
      for (const registrationId of registrationIds) {
        try {
          console.log(`Processing approval for registration: ${registrationId}`);
          
          // Call the existing approve-pending-registration function
          const { data, error } = await supabaseAdmin.functions.invoke('approve-pending-registration', {
            body: {
              registrationId,
              adminUserId
            }
          });

          if (error) {
            console.error(`Error approving registration ${registrationId}:`, error);
            errors.push({ registrationId, error: error.message });
          } else {
            results.push({ registrationId, success: true });
          }

          // Add small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Unexpected error processing registration ${registrationId}:`, error);
          errors.push({ registrationId, error: (error as any)?.message || 'Unknown error' });
        }
      }

    } else if (operation === 'reject') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return new Response(
          JSON.stringify({ error: 'Rejection reason is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete rejected registrations instead of just updating status
      const { data, error } = await supabaseAdmin
        .from('pending_registrations')
        .delete()
        .in('id', registrationIds)
        .select('id');

      if (error) {
        return new Response(
          JSON.stringify({ error: `Failed to reject registrations: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      results = data.map(item => ({ registrationId: item.id, success: true }));

    } else if (operation === 'priority_update') {
      if (!priority || !['low', 'normal', 'high', 'urgent'].includes(priority)) {
        return new Response(
          JSON.stringify({ error: 'Invalid priority level' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Bulk update for priority
      const { data, error } = await supabaseAdmin
        .from('pending_registrations')
        .update({
          priority_level: priority,
          admin_notes: `Priority updated to ${priority} via bulk operation`,
          updated_at: new Date().toISOString()
        })
        .in('id', registrationIds)
        .select('id');

      if (error) {
        return new Response(
          JSON.stringify({ error: `Failed to update priorities: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      results = data.map(item => ({ registrationId: item.id, success: true }));

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the bulk operation
    if (adminUserId) {
      try {
        await supabaseAdmin
          .from('bulk_operations')
          .insert({
            operation_type: `bulk_${operation}`,
            performed_by: adminUserId,
            registration_ids: registrationIds,
            operation_data: {
              rejectionReason: rejectionReason || null,
              priority: priority || null,
              results: results.length,
              errors: errors.length
            }
          });
      } catch (logError) {
        console.warn('Failed to log bulk operation:', logError);
        // Don't fail the main operation if logging fails
      }
    }

    // Return results
    const response = {
      success: true,
      operation,
      processed: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`Bulk operation ${operation} completed:`, {
      processed: results.length,
      failed: errors.length
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in bulk operations:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});