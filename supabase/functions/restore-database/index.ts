import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RestoreRequest {
  backup: {
    metadata: {
      timestamp: string;
      version: string;
      tables: string[];
    };
    [table: string]: any;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: userRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || userRoles?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { backup }: RestoreRequest = await req.json();

    if (!backup || !backup.metadata) {
      throw new Error("Invalid backup file format");
    }

    console.log(`Starting restore from backup dated: ${backup.metadata.timestamp}`);
    console.log(`Tables to restore: ${backup.metadata.tables.join(", ")}`);

    const results: Record<string, { success: boolean; rowCount?: number; error?: string }> = {};

    // Restore each table
    for (const table of backup.metadata.tables) {
      try {
        if (!backup[table] || backup[table].error) {
          console.log(`Skipping table ${table}: No valid data in backup`);
          results[table] = {
            success: false,
            error: "No valid data in backup"
          };
          continue;
        }

        const data = backup[table];
        
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`Skipping table ${table}: Empty or invalid data`);
          results[table] = {
            success: true,
            rowCount: 0
          };
          continue;
        }

        console.log(`Restoring ${data.length} rows to table: ${table}`);

        // Delete existing data
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

        if (deleteError) {
          console.error(`Error deleting from table ${table}:`, deleteError);
          results[table] = {
            success: false,
            error: `Delete failed: ${deleteError.message}`
          };
          continue;
        }

        // Insert backup data in batches of 100
        const batchSize = 100;
        let totalInserted = 0;

        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          const { error: insertError } = await supabase
            .from(table)
            .insert(batch);

          if (insertError) {
            console.error(`Error inserting batch to table ${table}:`, insertError);
            throw new Error(`Insert failed: ${insertError.message}`);
          }

          totalInserted += batch.length;
          console.log(`Inserted ${totalInserted}/${data.length} rows to ${table}`);
        }

        results[table] = {
          success: true,
          rowCount: totalInserted
        };

        console.log(`Successfully restored ${totalInserted} rows to ${table}`);
      } catch (err: any) {
        console.error(`Failed to restore table ${table}:`, err);
        results[table] = {
          success: false,
          error: err.message || String(err)
        };
      }
    }

    // Log the restore operation
    await supabase.from('audit_log').insert({
      action: 'database_restore',
      entity_type: 'system',
      user_id: user.id,
      details: {
        backup_timestamp: backup.metadata.timestamp,
        tables_restored: backup.metadata.tables.length,
        results: results
      }
    });

    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;

    console.log(`Restore completed: ${successCount}/${totalCount} tables restored successfully`);

    return new Response(
      JSON.stringify({
        success: successCount === totalCount,
        results,
        message: `Restore completed: ${successCount}/${totalCount} tables restored successfully`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: any) {
    console.error("Restore error:", error);
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
