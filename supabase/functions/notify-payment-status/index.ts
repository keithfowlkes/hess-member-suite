import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_id, organization_name, status, paid_date } = await req.json();

    if (!invoice_id || !organization_name || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: invoice_id, organization_name, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if fee notifications are enabled (system setting)
    const { data: feeSetting } = await supabaseAdmin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'conference_hub_fee_notifications')
      .maybeSingle();

    if (!feeSetting || feeSetting.setting_value !== 'true') {
      console.log('Conference Hub fee notifications are disabled');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Fee notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Conference Hub application details
    const { data: app, error: appError } = await supabaseAdmin
      .from('external_applications')
      .select('id, app_url, is_active')
      .eq('app_identifier', 'conference-hub')
      .eq('is_active', true)
      .single();

    if (appError || !app) {
      console.log('Conference Hub app not found or inactive');
      return new Response(
        JSON.stringify({ success: false, error: 'Conference Hub application not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the webhook URL - Conference Hub should expose a /api/payment-webhook endpoint
    const webhookUrl = `${app.app_url.replace(/\/$/, '')}/functions/v1/receive-payment-status`;

    const payload = {
      source: 'hess-member-portal',
      event: 'payment_status_update',
      timestamp: new Date().toISOString(),
      data: {
        invoice_id,
        organization_name,
        status, // 'paid', 'sent', 'overdue', etc.
        paid_date: paid_date || null,
      }
    };

    console.log('Sending payment notification to Conference Hub:', webhookUrl);
    console.log('Payload:', JSON.stringify(payload));

    // Send the notification to Conference Hub
    // The Conference Hub should have an edge function or endpoint to receive this
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'hess-member-portal',
          'X-Event': 'payment_status_update',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('Conference Hub response:', response.status, responseText);

      // Log the notification attempt
      await supabaseAdmin
        .from('external_app_access_log')
        .insert({
          app_id: app.id,
          action: 'payment_notification_sent',
          scopes_requested: ['fees:notify'],
          ip_address: 'server',
          user_agent: 'hess-payment-notifier',
        });

      return new Response(
        JSON.stringify({
          success: response.ok,
          status_code: response.status,
          message: response.ok
            ? `Payment notification sent for ${organization_name}`
            : `Conference Hub returned status ${response.status}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError: any) {
      console.error('Failed to reach Conference Hub:', fetchError.message);

      // Log the failed attempt
      await supabaseAdmin
        .from('external_app_access_log')
        .insert({
          app_id: app.id,
          action: 'payment_notification_failed',
          scopes_requested: ['fees:notify'],
          ip_address: 'server',
          user_agent: `error: ${fetchError.message}`,
        });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Could not reach Conference Hub: ${fetchError.message}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in notify-payment-status:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
