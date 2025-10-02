import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackupRequest {
  tables: string[];
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

    const { tables }: BackupRequest = await req.json();

    console.log(`Starting backup of ${tables.length} tables`);

    const backup: Record<string, any[]> = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        tables: tables
      }
    };

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
          console.log(`Backed up ${data?.length || 0} rows from ${table}`);
        }
      } catch (err) {
        console.error(`Failed to backup table ${table}:`, err);
        backup[table] = { error: String(err) };
      }
    }

    console.log("Backup completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        backup,
        message: "Database backup completed successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error: any) {
    console.error("Backup error:", error);
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
