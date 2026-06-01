import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function unauthorizedResponse(message = 'Unauthorized', status = 401) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Resolve the calling user from the Authorization header. Returns { userId } on success.
 * Returns a Response on failure (caller should return it directly).
 */
export async function requireAuthenticatedUser(
  req: Request
): Promise<{ userId: string; token: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorizedResponse('Missing Authorization header');
  }
  const token = authHeader.replace('Bearer ', '');

  // Use anon client with caller's JWT to validate the user
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data?.user?.id) {
    return unauthorizedResponse('Invalid or expired token');
  }
  return { userId: data.user.id, token };
}

/**
 * Resolve the calling user and verify they have the admin role.
 * Returns { userId, isAdmin: true } on success, or a Response on failure.
 */
export async function requireAdmin(
  req: Request
): Promise<{ userId: string; token: string } | Response> {
  const authResult = await requireAuthenticatedUser(req);
  if (authResult instanceof Response) return authResult;

  const service = getServiceClient();
  const { data: roleRow, error } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', authResult.userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) {
    console.error('Admin role check failed:', error);
    return unauthorizedResponse('Authorization check failed', 500);
  }
  if (!roleRow) {
    return unauthorizedResponse('Forbidden: admin role required', 403);
  }
  return authResult;
}
