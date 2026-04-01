import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const PRO_FEATURES = [
  "وصول كامل لجميع المنتجات الرابحة",
  "تحليل ذكاء اصطناعي لكل منتج",
  "رابط مورّد مباشر من AliExpress",
  "حفظ منتجات غير محدود",
  "فلاتر وترتيب متقدم",
  "إعلانات TikTok الرابحة",
  "تنبيهات رواج يومية",
  "دعم ذو أولوية",
];

export default function PricingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/payments/create", { plan: "pro" });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast({ title: "خطأ", description: "تعذر إنشاء جلسة الدفع", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "خطأ في الدفع",
        description: err.message?.includes("503")
          ? "خدمة الدفع غير متاحة حالياً"
          : "تعذر الاتصال ببوابة الدفع، حاول مجدداً",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-pricing-title">الاشتراك</h1>
        <p className="text-muted-foreground">اشترك للوصول الكامل لمنصة نخلة.</p>
      </div>

      <div className="flex justify-center">
        <Card
          className="hover-elevate relative border-primary border-2 w-full max-w-sm"
          data-testid="card-plan-pro"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="no-default-active-elevate">الباقة الوحيدة</Badge>
          </div>

          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">نخلة برو</h2>
              <p className="text-sm text-muted-foreground mt-1">وصول كامل لجميع المزايا</p>
              <div className="flex items-baseline justify-center gap-1 mt-4">
                <span className="text-4xl font-bold" data-testid="text-price-pro">99</span>
                <span className="text-muted-foreground">ر.س / شهرياً</span>
              </div>
            </div>

            <ul className="space-y-3">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              size="lg"
              onClick={handleUpgrade}
              disabled={loading}
              data-testid="button-plan-pro"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              اشترك الآن
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        جميع المدفوعات تتم عبر بوابة Moyasar الآمنة. تدعم مدى، فيزا، وماستركارد.
        الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة.
      </p>
    </div>
  );
}
