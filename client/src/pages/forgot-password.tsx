import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, ArrowLeft, Mail } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("خدمة المصادقة غير متوفرة");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw new Error(error.message);
      setSent(true);
    } catch (err: any) {
      toast({
        title: "حدث خطأ",
        description: err.message || "تعذر إرسال رابط إعادة التعيين. حاول مرة أخرى.",
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
            <CardTitle>نسيت كلمة المرور؟</CardTitle>
            <CardDescription>
              {sent
                ? "تم إرسال رابط إعادة التعيين بنجاح"
                : "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                    <Mail className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-reset-sent">
                  تم إرسال رابط إعادة تعيين كلمة المرور إلى <strong>{email}</strong>. تحقق من بريدك الإلكتروني واتبع التعليمات.
                </p>
                <Button variant="outline" className="w-full" asChild data-testid="link-back-to-login">
                  <Link href="/login">
                    <ArrowLeft className="w-4 h-4 ms-2" />
                    العودة لتسجيل الدخول
                  </Link>
                </Button>
              </div>
            ) : (
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
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-send-reset">
                  {loading && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                  إرسال رابط إعادة التعيين
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary font-medium" data-testid="link-to-login">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
