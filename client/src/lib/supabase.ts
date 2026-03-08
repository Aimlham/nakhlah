import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function initSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return null;
  }
}

const supabaseClient = initSupabase();

let _supabaseEnabled: boolean | null = null;

export async function isSupabaseEnabled(): Promise<boolean> {
  if (_supabaseEnabled !== null) return _supabaseEnabled;
  if (!supabaseClient) {
    _supabaseEnabled = false;
    return false;
  }
  try {
    const res = await fetch("/api/config");
    if (res.ok) {
      const data = await res.json();
      _supabaseEnabled = data.supabaseEnabled === true;
    } else {
      _supabaseEnabled = false;
    }
  } catch {
    _supabaseEnabled = false;
  }
  return _supabaseEnabled;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (_supabaseEnabled === false) return null;
  return supabaseClient;
}

export async function getAccessToken(): Promise<string | null> {
  if (!(await isSupabaseEnabled()) || !supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token ?? null;
}
