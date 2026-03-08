import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function initSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
      },
    });
  } catch {
    return null;
  }
}

const supabaseClient = initSupabase();

export function isSupabaseAvailable(): boolean {
  return supabaseClient !== null;
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token ?? null;
}
