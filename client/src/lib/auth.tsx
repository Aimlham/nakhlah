import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
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

const AUTH_USER_KEY = "nakhlah_auth_user";

function saveUserToStorage(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

function loadUserFromStorage(): AuthUser | null {
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadUserFromStorage());
  const [isLoading, setIsLoading] = useState(true);
  const initDone = useRef(false);
  const explicitLogout = useRef(false);

  function updateUser(u: AuthUser | null) {
    setUser(u);
    saveUserToStorage(u);
  }

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    function setUserFromSession(session: any) {
      if (cancelled || !session?.user) return;
      const u: AuthUser = {
        id: session.user.id,
        email: session.user.email ?? "",
        fullName: (session.user.user_metadata?.full_name as string) ?? null,
      };
      updateUser(u);
    }

    async function init() {
      const supabase = getSupabaseClient();

      if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (cancelled) return;
            if (session?.user) {
              setUserFromSession(session);
            } else if (event === "SIGNED_OUT" || explicitLogout.current) {
              updateUser(null);
              explicitLogout.current = false;
            }
          }
        );
        unsubscribe = () => subscription.unsubscribe();

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserFromSession(session);
        } else {
          const stored = loadUserFromStorage();
          if (!stored) {
            updateUser(null);
          }
        }
        initDone.current = true;
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.user) updateUser(data.user);
          else updateUser(null);
        }
      } catch {}
      initDone.current = true;
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
      updateUser(data.user);
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
    updateUser(data.user);
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
    updateUser(data.user);
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
    explicitLogout.current = true;

    if (supabase) {
      await supabase.auth.signOut();
      updateUser(null);
      return;
    }

    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    updateUser(null);
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
