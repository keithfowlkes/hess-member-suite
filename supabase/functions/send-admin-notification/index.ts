import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdminNotificationRequest {
  type: 'new_registration' | 'member_update' | 'contact_transfer' | 'test';
  recipients?: string[];
  registrationData?: any;
  updateData?: any;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[send-admin-notification] Function invoked');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: AdminNotificationRequest = await req.json();
    console.log('[send-admin-notification] Request data:', { 
      type: requestData.type,
      hasRecipients: !!requestData.recipients,
      recipientCount: requestData.recipients?.length || 0
    });

    let recipients = requestData.recipients || [];

    // If no recipients provided, get them from system settings
    if (recipients.length === 0) {
      const { data: notificationSetting, error: settingError } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'notification_emails')
        .single();

      if (settingError) {
        console.error('[send-admin-notification] Error fetching notification emails:', settingError);
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch notification recipients',
          details: settingError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (notificationSetting?.setting_value) {
        try {
          recipients = JSON.parse(notificationSetting.setting_value);
        } catch (parseError) {
          console.error('[send-admin-notification] Error parsing notification emails:', parseError);
          recipients = [];
        }
      }
    }

    if (recipients.length === 0) {
      console.log('[send-admin-notification] No recipients configured');
      return new Response(JSON.stringify({ 
        error: 'No notification recipients configured',
        message: 'Please configure notification email addresses in system settings'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare email content based on notification type
    let subject = '';
    let emailType = '';
    let templateData: any = {};

    switch (requestData.type) {
      case 'new_registration':
        subject = 'New Member Registration Pending Review';
        emailType = 'admin_new_registration';
        templateData = {
          user_name: 'Administrator',
          organization_name: requestData.registrationData?.organization_name || 'Unknown Organization',
          submitted_email: requestData.registrationData?.email || 'Unknown Email',
          registration_type: 'New Member Registration'
        };
        break;

      case 'member_update':
        subject = 'Member Profile Update Pending Review';
        emailType = 'admin_member_update';
        templateData = {
          user_name: 'Administrator',
          organization_name: requestData.updateData?.organization_name || 'Unknown Organization',
          submitted_email: requestData.updateData?.submitted_email || 'Unknown Email',
          update_type: 'Member Profile Update'
        };
        break;

      case 'contact_transfer':
        subject = 'Organization Contact Transfer Pending Review';
        emailType = 'admin_contact_transfer';
        templateData = {
          user_name: 'Administrator',
          organization_name: requestData.updateData?.organization_name || 'Unknown Organization',
          submitted_email: requestData.updateData?.new_contact_email || 'Unknown Email',
          transfer_type: 'Contact Transfer Request'
        };
        break;

      case 'test':
        subject = 'HESS Consortium - Notification System Test';
        emailType = 'admin_test_notification';
        templateData = {
          user_name: 'Administrator',
          test_message: requestData.message || 'This is a test notification from the HESS Consortium notification system.'
        };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log('[send-admin-notification] Sending notification:', {
      type: requestData.type,
      subject,
      emailType,
      recipientCount: recipients.length
    });

    // Send notification using centralized email delivery
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('centralized-email-delivery', {
      body: {
        type: emailType,
        to: recipients,
        subject,
        data: templateData
      }
    });

    if (emailError) {
      console.error('[send-admin-notification] Email delivery error:', emailError);
      return new Response(JSON.stringify({ 
        error: 'Failed to send notification',
        details: emailError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[send-admin-notification] Notification sent successfully:', emailResult);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Notification sent to ${recipients.length} recipient(s)`,
      recipients: recipients.length,
      type: requestData.type
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[send-admin-notification] Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);