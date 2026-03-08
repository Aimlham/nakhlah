import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { isSupabaseAvailable, getSupabaseClient, getAccessToken } from "./supabase";

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    function setUserFromSession(session: any) {
      if (cancelled || !session?.user) return;
      setUser({
        id: session.user.id,
        email: session.user.email ?? "",
        fullName: (session.user.user_metadata?.full_name as string) ?? null,
      });
    }

    async function init() {
      const supabase = getSupabaseClient();

      if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (cancelled) return;
            if (session?.user) {
              setUserFromSession(session);
            } else {
              setUser(null);
            }
          }
        );
        unsubscribe = () => subscription.unsubscribe();

        const { data: { session } } = await supabase.auth.getSession();
        setUserFromSession(session);
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.user) setUser(data.user);
        }
      } catch {}
      if (!cancelled) setIsLoading(false);
    }

    init();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();

    if (supabase) {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "فشل تسجيل الدخول");

      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      setUser(data.user);
      return;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "فشل تسجيل الدخول");
    setUser(data.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    const supabase = getSupabaseClient();

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "فشل إنشاء الحساب");

    if (supabase && data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }
    setUser(data.user);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const supabase = getSupabaseClient();

    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });
      if (error) throw new Error(error.message);
      return;
    }

    throw new Error("Google sign-in requires Supabase");
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseClient();

    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
