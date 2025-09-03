import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'invitation' | 'approval' | 'rejection' | 'transfer' | 'welcome' | 'member_approval' | 'overdue_reminder' | 'welcome_approved';
  to: string;
  organizationName: string;
  token?: string;
  adminMessage?: string;
  memberName?: string;
  secondaryEmail?: string;
  organizationData?: {
    primary_contact_name: string;
    secondary_first_name?: string;
    secondary_last_name?: string;
    secondary_contact_title?: string;
    secondary_contact_email?: string;
    primary_contact_title?: string;
    student_fte?: number;
    address_line_1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    website?: string;
    student_information_system?: string;
    financial_system?: string;
    financial_aid?: string;
    hcm_hr?: string;
    payroll_system?: string;
    purchasing_system?: string;
    housing_management?: string;
    learning_management?: string;
    admissions_crm?: string;
    alumni_advancement_crm?: string;
    primary_office_apple?: boolean;
    primary_office_asus?: boolean;
    primary_office_dell?: boolean;
    primary_office_hp?: boolean;
    primary_office_microsoft?: boolean;
    primary_office_other?: boolean;
    primary_office_other_details?: string;
    other_software_comments?: string;
  };
  transferDetails?: {
    currentContact: string;
    newContact: string;
  };
  invoiceData?: {
    invoice_number: string;
    amount: number;
    due_date: string;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  console.log('Organization emails function called');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, organizationName, token, adminMessage, memberName, secondaryEmail, organizationData, transferDetails, invoiceData }: EmailRequest = await req.json();
    console.log('Email request:', { type, to, organizationName });

    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('//', '//app.');

    let subject: string;
    let html: string;

    switch (type) {
      case 'invitation':
        subject = `Invitation to manage ${organizationName} - HESS Consortium`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">HESS Consortium</h1>
            <h2>Organization Account Invitation</h2>
            <p>Hello,</p>
            <p>You have been invited to manage the account for <strong>${organizationName}</strong> on the HESS Consortium member portal.</p>
            <p>Click the link below to accept this invitation and create your account:</p>
            <a href="${appUrl}/invite?token=${token}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Accept Invitation
            </a>
            <p>This invitation will expire in 7 days.</p>
            <p>If you have any questions, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'approval':
        subject = `Welcome to HESS Consortium - ${organizationName} Approved!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Welcome to HESS Consortium!</h1>
            <p>Congratulations! Your organization <strong>${organizationName}</strong> has been approved for membership.</p>
            <p>You can now access the full member portal with all features and resources.</p>
            <a href="${appUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Access Member Portal
            </a>
            ${adminMessage ? `<p><strong>Message from admin:</strong><br>${adminMessage}</p>` : ''}
            <p>Welcome to the consortium!</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'rejection':
        subject = `HESS Consortium Application Update - ${organizationName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">HESS Consortium</h1>
            <p>Thank you for your interest in joining HESS Consortium.</p>
            <p>After careful review, we are unable to approve the application for <strong>${organizationName}</strong> at this time.</p>
            ${adminMessage ? `<p><strong>Reason:</strong><br>${adminMessage}</p>` : ''}
            <p>If you have questions about this decision, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'transfer':
        subject = `Organization Transfer Request - ${organizationName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">HESS Consortium</h1>
            <h2>Organization Transfer Request</h2>
            <p>Hello,</p>
            <p>You have been selected as the new primary contact for <strong>${organizationName}</strong>.</p>
            ${transferDetails ? `<p>Current contact: ${transferDetails.currentContact}<br>New contact: ${transferDetails.newContact}</p>` : ''}
            <p>Click the link below to accept this transfer and create/link your account:</p>
            <a href="${appUrl}/transfer?token=${token}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Accept Transfer
            </a>
            <p>This transfer request will expire in 7 days.</p>
            <p>If you have questions, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'member_approval':
        subject = `Welcome to HESS Consortium - ${organizationName} Approved!`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #16a34a;">Welcome to HESS Consortium!</h1>
            <p>Dear ${memberName || 'Member'},</p>
            <p>Great news! Your organization <strong>${organizationName}</strong> has been approved for membership in the HESS Consortium.</p>
            <p>You can now access the full member portal with all available features and resources.</p>
            <a href="${appUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Access Member Portal
            </a>
            ${adminMessage ? `<p><strong>Message from admin:</strong><br>${adminMessage}</p>` : ''}
            <p>We're excited to have you as part of our consortium!</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'welcome':
        subject = `Welcome to HESS Consortium - ${organizationName}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to HESS Consortium!</h1>
            <p>Thank you for registering <strong>${organizationName}</strong> with HESS Consortium.</p>
            <p>Your application is currently under review. We will notify you once it has been processed.</p>
            <p>You can check your application status by logging into the member portal:</p>
            <a href="${appUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Member Portal
            </a>
            <p>If you have questions, please contact us at support@hessconsortium.org.</p>
            <p>Best regards,<br>HESS Consortium Team</p>
          </div>
        `;
        break;

      case 'overdue_reminder':
        subject = `Payment Reminder - ${organizationName} Membership Fee Overdue`;
        
        const invoiceDetails = invoiceData ? `
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">Outstanding Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoiceData.invoice_number}</p>
            <p><strong>Amount Due:</strong> $${invoiceData.amount.toLocaleString()}</p>
            <p><strong>Original Due Date:</strong> ${new Date(invoiceData.due_date).toLocaleDateString()}</p>
          </div>
        ` : '';

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0; font-size: 2rem;">PAYMENT REMINDER</h1>
              <p style="color: #666; margin: 10px 0;">HESS Consortium Membership Fee</p>
            </div>
            
            <p>Dear ${organizationName} Team,</p>
            
            <p>This is a friendly reminder that your HESS Consortium membership fee is currently <strong style="color: #dc2626;">overdue</strong>.</p>
            
            ${invoiceDetails}
            
            <div style="background: #f9fafb; padding: 20px; border-left: 4px solid #dc2626; margin: 30px 0;">
              <h3 style="color: #dc2626; margin-bottom: 10px;">Immediate Action Required</h3>
              <p>To maintain your active membership status and avoid any service interruptions, please:</p>
              <ul>
                <li>Process your payment as soon as possible</li>
                <li>Contact us if you have any payment-related questions</li>
                <li>Update your membership information if needed</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" 
                 style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Access Member Portal
              </a>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
              <h3 style="color: #374151; margin-bottom: 15px;">Need Help?</h3>
              <p>If you have questions about your membership or need assistance with payment, please don't hesitate to contact us:</p>
              <p>
                <strong>Email:</strong> billing@hessconsortium.org<br>
                <strong>Phone:</strong> [Contact Number]
              </p>
            </div>
            
            <div style="text-align: center; padding: 15px; background: #fef2f2; border-radius: 8px; margin-top: 30px;">
              <p style="color: #dc2626; margin: 0; font-weight: bold;">Thank you for your prompt attention to this matter.</p>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">HESS Consortium Team</p>
            </div>
          </div>
        `;
        break;

      case 'welcome_approved':
        subject = `Welcome to HESS Consortium - ${organizationName}`;
        
        const primaryContactName = organizationData?.primary_contact_name || 'Member';
        const submissionDetails = organizationData ? `
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Organization:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationName}</td></tr>
            ${organizationData.primary_contact_title ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Primary Contact Title:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.primary_contact_title}</td></tr>` : ''}
            ${organizationData.student_fte ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Student FTE:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.student_fte}</td></tr>` : ''}
            ${organizationData.address_line_1 ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Address:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.address_line_1}${organizationData.city ? `, ${organizationData.city}` : ''}${organizationData.state ? `, ${organizationData.state}` : ''}${organizationData.zip_code ? ` ${organizationData.zip_code}` : ''}</td></tr>` : ''}
            ${organizationData.phone ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.phone}</td></tr>` : ''}
            ${organizationData.email ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.email}</td></tr>` : ''}
            ${organizationData.website ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Website:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.website}</td></tr>` : ''}
            ${organizationData.secondary_first_name && organizationData.secondary_last_name ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Secondary Contact:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.secondary_first_name} ${organizationData.secondary_last_name}${organizationData.secondary_contact_title ? ` (${organizationData.secondary_contact_title})` : ''}</td></tr>` : ''}
            ${organizationData.secondary_contact_email ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Secondary Email:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.secondary_contact_email}</td></tr>` : ''}
          </table>
          
          <h3 style="color: #2563eb; margin-top: 30px;">Systems Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${organizationData.student_information_system ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Student Information System:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.student_information_system}</td></tr>` : ''}
            ${organizationData.financial_system ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Financial System:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.financial_system}</td></tr>` : ''}
            ${organizationData.financial_aid ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Financial Aid:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.financial_aid}</td></tr>` : ''}
            ${organizationData.hcm_hr ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>HCM/HR:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.hcm_hr}</td></tr>` : ''}
            ${organizationData.payroll_system ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Payroll System:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.payroll_system}</td></tr>` : ''}
            ${organizationData.purchasing_system ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Purchasing System:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.purchasing_system}</td></tr>` : ''}
            ${organizationData.housing_management ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Housing Management:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.housing_management}</td></tr>` : ''}
            ${organizationData.learning_management ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Learning Management:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.learning_management}</td></tr>` : ''}
            ${organizationData.admissions_crm ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Admissions CRM:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.admissions_crm}</td></tr>` : ''}
            ${organizationData.alumni_advancement_crm ? `<tr><td style="padding: 4px 0; border-bottom: 1px solid #eee;"><strong>Alumni/Advancement CRM:</strong></td><td style="padding: 4px 0; border-bottom: 1px solid #eee;">${organizationData.alumni_advancement_crm}</td></tr>` : ''}
          </table>
        ` : '';
        
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <center>
              <img src="http://www.hessconsortium.org/new/wp-content/uploads/2023/03/HESSlogoMasterFLAT.png" alt="HESS LOGO" style="width:230px; height:155px;">
            </center>
            
            <p>${primaryContactName},</p>
            
            <p>Thank you for your registration for HESS Consortium membership. I want to welcome you and ${organizationName} personally to membership in the HESS Consortium!</p>
            
            <p>I've CCed Gwen Pechan, HESS Board President and CIO at Flagler College to welcome you also.</p>
            
            <p>If you have a few minutes, I would love to fill you in on the work we are doing together in the Consortium and with our business partners.</p>
            
            <p>We will make sure to get your contact information into our member listserv asap.</p>
            
            <p>Also, make sure to register for an account on our HESS Online Leadership Community collaboration website to download the latest information and join in conversation with HESS CIOs. You will definitely want to sign up online at <a href="https://www.hessconsortium.org/community">https://www.hessconsortium.org/community</a> and invite your staff to participate also.</p>
            
            <p>You now have access to our HESS / Coalition Educational Discount Program with Insight for computer and network hardware, peripherals and cloud software. Please create an institutional portal account at <a href="https://www.insight.com/HESS">www.insight.com/HESS</a> online now. We hope you will evaluate these special Insight discount pricing and let us know how it looks compared to your current suppliers.</p>
            
            <p>After you have joined the HESS OLC (mentioned above), click the Member Discounts icon at the top of the page to see all of the discount programs you have access to as a HESS member institution.</p>
            
            <p>Again, welcome to our quickly growing group of private, non-profit institutions in technology!</p>
            
            <img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="margin: 20px 0;">
            
            <p>Keith Fowlkes, M.A., M.B.A.<br>
            Executive Director and Founder<br>
            The HESS Consortium<br>
            keith.fowlkes@hessconsortium.org | 859.516.3571</p>
            
            <hr style="margin: 40px 0; border: none; border-top: 2px solid #2563eb;">
            
            <h2 style="color: #2563eb;">Their submitted information is listed below.</h2>
            ${submissionDetails}
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // For welcome_approved emails, also CC Gwen Pechan and secondary contact
    let emailTo = [to];
    let cc: string[] = [];
    
    if (type === 'welcome_approved') {
      cc.push('gpechan@flagler.edu'); // Gwen Pechan
      if (secondaryEmail && secondaryEmail !== to) {
        emailTo.push(secondaryEmail);
      }
    }

    const emailResponse = await resend.emails.send({
      from: "HESS Consortium <noreply@hessconsortium.org>",
      to: emailTo,
      cc: cc.length > 0 ? cc : undefined,
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email action in audit log
    await supabase.from('audit_log').insert({
      action: `email_sent_${type}`,
      entity_type: 'email',
      details: { to, organizationName, type }
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in organization-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);