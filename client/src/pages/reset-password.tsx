import { useState, useEffect, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("خدمة المصادقة غير متوفرة");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) {
          setError("رابط إعادة التعيين غير صالح أو منتهي الصلاحية");
        } else {
          setSessionReady(true);
        }
      });
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    if (accessToken && type === "recovery") {
      setSessionReady(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else if (!code && !accessToken) {
        setTimeout(() => {
          if (!sessionReady) {
            setError("رابط إعادة التعيين غير صالح أو منتهي الصلاحية");
          }
        }, 5000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("خدمة المصادقة غير متوفرة");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setSuccess(true);
    } catch (err: any) {
      toast({
        title: "حدث خطأ",
        description: err.message || "تعذر تحديث كلمة المرور. حاول مرة أخرى.",
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
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight">TrendDrop</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {success ? "تم التحديث بنجاح" : error ? "رابط غير صالح" : "إعادة تعيين كلمة المرور"}
            </CardTitle>
            <CardDescription>
              {success
                ? "تم تغيير كلمة المرور بنجاح"
                : error
                ? error
                : "أدخل كلمة المرور الجديدة"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-reset-success">
                  تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
                </p>
                <Button className="w-full" onClick={() => navigate("/dashboard")} data-testid="button-go-dashboard">
                  الذهاب إلى لوحة التحكم
                </Button>
              </div>
            ) : error ? (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-reset-error">
                  {error}
                </p>
                <Button variant="outline" className="w-full" asChild data-testid="link-back-to-forgot">
                  <Link href="/forgot-password">
                    طلب رابط جديد
                  </Link>
                </Button>
              </div>
            ) : !sessionReady ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground" data-testid="text-verifying">
                  جارٍ التحقق من الرابط...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="أدخل كلمة المرور الجديدة"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="أعد إدخال كلمة المرور"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-reset-password">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  تحديث كلمة المرور
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
