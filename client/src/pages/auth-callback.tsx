import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getSupabaseClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      navigate("/login", { replace: true });
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          clearTimeout(timeout);
          window.history.replaceState({}, "", "/products");
          navigate("/products", { replace: true });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error: err }) => {
      if (err) {
        setError(err.message);
        return;
      }
      if (session) {
        window.history.replaceState({}, "", "/products");
        navigate("/products", { replace: true });
      }
    });

    timeout = setTimeout(() => {
      setError("انتهت مهلة تسجيل الدخول. حاول مرة أخرى.");
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium" data-testid="text-auth-error">{error}</p>
          <a href="/login" className="text-primary underline" data-testid="link-back-login">
            العودة لتسجيل الدخول
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground" data-testid="text-auth-loading">جارٍ تسجيل الدخول...</p>
      </div>
    </div>
  );
}
