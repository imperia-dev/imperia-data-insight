// Shared authentication and authorization helpers for edge functions.
//
// Usage:
//   const auth = await requireRole(req, ['owner', 'master', 'admin']);
//   if (!auth.ok) return auth.response;
//   const { userId, role, supabase } = auth;
//
// `supabase` is a service-role client (use for privileged DB operations after
// the role check has already validated the caller).

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

export type AppRole =
  | "owner"
  | "master"
  | "admin"
  | "operation"
  | "translator"
  | "customer"
  | "financeiro";

export interface AuthSuccess {
  ok: true;
  userId: string;
  role: AppRole | null;
  supabase: SupabaseClient;
}

export interface AuthFailure {
  ok: false;
  response: Response;
}

export type AuthResult = AuthSuccess | AuthFailure;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Verifies the request bears a valid Supabase JWT. Returns the user id and
 * a service-role Supabase client on success.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);

  // Fetch highest-priority role for this user from user_roles
  const { data: roleRow } = await serviceClient
    .rpc("get_user_role", { user_id: data.user.id });

  return {
    ok: true,
    userId: data.user.id,
    role: (roleRow as AppRole | null) ?? null,
    supabase: serviceClient,
  };
}

/**
 * Same as requireAuth but additionally verifies the caller has one of the
 * allowed roles. Returns a 403 response otherwise.
 */
export async function requireRole(
  req: Request,
  allowedRoles: AppRole[],
): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth;

  if (!auth.role || !allowedRoles.includes(auth.role)) {
    return { ok: false, response: jsonError("Forbidden", 403) };
  }

  return auth;
}
