import { useState, useEffect, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import nakhlahLogo from "@assets/nakhlah-logo.png";
import { SiGoogle } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseAvailable } from "@/lib/supabase";

const supabaseAvailable = isSupabaseAvailable();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const authError = params.get("auth_error");
    if (authError) {
      toast({
        title: "فشل تسجيل الدخول",
        description: authError,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/login");
    }
  }, [searchString, toast]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description: err.message || "تعذّر تسجيل الدخول بحساب Google.",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description: err.message || "بيانات غير صحيحة. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <img src={nakhlahLogo} alt="نخلة" className="w-10 h-10 rounded-md object-contain" />
          <span className="text-2xl font-bold tracking-tight">نخلة</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>مرحباً بعودتك</CardTitle>
            <CardDescription>سجّل دخولك للمتابعة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {supabaseAvailable && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={googleLoading || loading}
                  onClick={handleGoogleLogin}
                  data-testid="button-google-login"
                >
                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SiGoogle className="w-4 h-4" />}
                  المتابعة بحساب Google
                </Button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">أو</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="أدخل بريدك الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="أدخل كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
              {supabaseAvailable && (
                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary" data-testid="link-forgot-password">
                    نسيت كلمة المرور؟
                  </Link>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading || googleLoading} data-testid="button-login">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                تسجيل الدخول
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="text-primary font-medium" data-testid="link-to-signup">
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  );
}
