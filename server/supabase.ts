import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function initSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  try {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (err) {
    console.warn("[supabase] Failed to initialize admin client:", (err as Error).message);
    return null;
  }
}

export const supabaseAdmin = initSupabaseAdmin();
export const supabaseConfigured = supabaseAdmin !== null;

export async function verifySupabaseToken(
  token: string
): Promise<{ id: string; email: string; fullName: string | null } | null> {
  if (!supabaseAdmin) return null;
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string) ?? null,
  };
}
