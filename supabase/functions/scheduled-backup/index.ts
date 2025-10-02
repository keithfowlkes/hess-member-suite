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
    console.log("Starting scheduled database backup...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
        console.log(`Backing up table: ${table}`);
        
        const { data, error } = await supabase
          .from(table)
          .select("*");

        if (error) {
          console.error(`Error backing up table ${table}:`, error);
          backup[table] = { error: error.message };
        } else {
          backup[table] = data || [];
          totalRows += data?.length || 0;
          console.log(`Backed up ${data?.length || 0} rows from ${table}`);
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

    console.log(`Scheduled backup completed: ${tables.length} tables, ${totalRows} rows, ${(backupSize / 1024 / 1024).toFixed(2)} MB`);

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
