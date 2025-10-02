import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Scheduled backup check initiated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if backups are enabled
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'backup_schedule_enabled',
        'backup_schedule_frequency',
        'backup_schedule_time',
        'backup_schedule_day_of_week',
        'backup_schedule_day_of_month'
      ]);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    // Parse settings into a map
    const settingsMap = new Map(
      settings?.map((s: any) => [s.setting_key, s.setting_value]) || []
    );

    // Check if backups are enabled
    if (settingsMap.get('backup_schedule_enabled') !== 'true') {
      console.log('⏸️ Automated backups are disabled');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Backups are disabled',
          skipped: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get current time info
    const now = new Date();
    const currentHour = now.getHours();
    const currentDayOfWeek = now.getDay() || 7; // Convert Sunday from 0 to 7
    const currentDayOfMonth = now.getDate();

    // Parse schedule time
    const scheduleTime = settingsMap.get('backup_schedule_time') || '02:00';
    const [scheduleHour] = scheduleTime.split(':').map(Number);

    // Check if it's the right hour (with 1-hour window since cron runs hourly)
    const isCorrectTime = currentHour === scheduleHour;

    if (!isCorrectTime) {
      console.log(`⏭️ Not the scheduled time. Current: ${currentHour}:00, Scheduled: ${scheduleHour}:00`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Not the scheduled time',
          skipped: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Check frequency-specific conditions
    const frequency = settingsMap.get('backup_schedule_frequency') || 'daily';

    if (frequency === 'weekly') {
      const scheduledDayOfWeek = parseInt(settingsMap.get('backup_schedule_day_of_week') || '1');
      if (currentDayOfWeek !== scheduledDayOfWeek) {
        console.log(`⏭️ Not the scheduled day of week. Current: ${currentDayOfWeek}, Scheduled: ${scheduledDayOfWeek}`);
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Not the scheduled day of week',
            skipped: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    } else if (frequency === 'monthly') {
      const scheduledDayOfMonth = parseInt(settingsMap.get('backup_schedule_day_of_month') || '1');
      if (currentDayOfMonth !== scheduledDayOfMonth) {
        console.log(`⏭️ Not the scheduled day of month. Current: ${currentDayOfMonth}, Scheduled: ${scheduledDayOfMonth}`);
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Not the scheduled day of month',
            skipped: true
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
    }

    console.log('✅ Schedule check passed, performing backup...');

    const tables = [
      'organizations',
      'profiles',
      'user_roles',
      'pending_registrations',
      'member_registration_updates',
      'organization_profile_edit_requests',
      'organization_reassignment_requests',
      'communications',
      'custom_software_entries',
      'invoices',
      'system_field_options',
      'system_settings',
      'system_messages',
      'user_messages',
      'organization_invitations',
      'audit_log'
    ];

    const backup: Record<string, any[]> = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        tables: tables,
        backup_type: "scheduled"
      }
    };

    let totalRows = 0;

    // Backup each table
    for (const table of tables) {
      try {
        console.log(`📦 Backing up table: ${table}`);
        
        const { data, error } = await supabase
          .from(table)
          .select("*");

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          backup[table] = { error: error.message };
        } else {
          backup[table] = data || [];
          totalRows += data?.length || 0;
          console.log(`✅ Backed up ${data?.length || 0} rows from ${table}`);
        }
      } catch (err) {
        console.error(`Failed to backup table ${table}:`, err);
        backup[table] = { error: String(err) };
      }
    }

    // Calculate backup size (approximate JSON size)
    const backupJson = JSON.stringify(backup);
    const backupSize = new Blob([backupJson]).size;

    // Store backup in database
    const { error: insertError } = await supabase
      .from('database_backups')
      .insert({
        backup_data: backup,
        backup_size: backupSize,
        backup_type: 'scheduled',
        table_count: tables.length,
        row_count: totalRows
      });

    if (insertError) {
      console.error("Error storing backup:", insertError);
      throw insertError;
    }

    console.log(`✅ Scheduled backup completed: ${tables.length} tables, ${totalRows} rows, ${(backupSize / 1024 / 1024).toFixed(2)} MB`);

    // Log the backup operation
    await supabase.from('audit_log').insert({
      action: 'scheduled_database_backup',
      entity_type: 'system',
      details: {
        table_count: tables.length,
        row_count: totalRows,
        backup_size: backupSize,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Scheduled backup completed successfully",
        stats: {
          table_count: tables.length,
          row_count: totalRows,
          backup_size: backupSize
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: any) {
    console.error("Scheduled backup error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
