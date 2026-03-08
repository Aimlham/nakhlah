import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase, supabaseConfigured, getAccessToken } from "./supabase";
import { apiRequest } from "./queryClient";

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (supabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            fullName: (session.user.user_metadata?.full_name as string) ?? null,
          });
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email ?? "",
              fullName: (session.user.user_metadata?.full_name as string) ?? null,
            });
          } else {
            setUser(null);
          }
        }
      );

      return () => subscription.unsubscribe();
    }

    fetch("/api/auth/me", { credentials: "include" })
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (supabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      setUser({
        id: data.user.id,
        email: data.user.email ?? "",
        fullName: (data.user.user_metadata?.full_name as string) ?? null,
      });
      return;
    }

    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data.user);
  }, []);

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    if (supabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw new Error(error.message);
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          fullName: fullName,
        });
      }
      return;
    }

    const res = await apiRequest("POST", "/api/auth/signup", { email, password, fullName });
    const data = await res.json();
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    if (supabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
