import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Crown, Phone, MessageCircle, MapPin, Store, Factory, Bookmark, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const PRO_FEATURES = [
  { icon: Eye, text: "عرض بيانات المورد كاملة" },
  { icon: Phone, text: "رقم التواصل المباشر مع المورد" },
  { icon: MessageCircle, text: "رقم الواتساب للتواصل الفوري" },
  { icon: MapPin, text: "موقع المورد على الخريطة" },
  { icon: Store, text: "وصول كامل للموردين المحليين" },
  { icon: Factory, text: "وصول كامل للمصانع المحلية" },
  { icon: Bookmark, text: "حفظ المنتجات والموردين والمصانع" },
  { icon: CheckCircle2, text: "عرض التفاصيل الكاملة لكل عرض" },
];

export default function PricingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/payments/create", { plan: "pro" });
      const data = await res.json();
      const url = data.invoiceUrl || data.redirectUrl;
      if (url && data.invoiceId) {
        sessionStorage.setItem("nakhlah_pending_invoice", data.invoiceId);
        window.location.href = url;
      } else if (url) {
        window.location.href = url;
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
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2 sm:space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-pricing-title">
          فعّل وصولك إلى نخلة برو
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          الوصول الكامل لبيانات الموردين والمصانع المحليين في السعودية. تواصل مباشر، حفظ غير محدود، وكل ما تحتاجه لإطلاق متجر دروبشيبينج محلي ناجح.
        </p>
      </div>

      <div className="flex justify-center">
        <Card
          className="relative border-primary border-2 w-full max-w-md shadow-lg shadow-primary/5"
          data-testid="card-plan-pro"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="px-3 py-1">الباقة الوحيدة</Badge>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-2">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">نخلة برو</h2>
              <p className="text-sm text-muted-foreground">وصول كامل لجميع الموردين والمصانع</p>
              <div className="flex items-baseline justify-center gap-1 pt-3">
                <span className="text-4xl sm:text-5xl font-bold" data-testid="text-price-pro">99</span>
                <span className="text-muted-foreground">ر.س - دفعة واحدة</span>
              </div>
            </div>

            <ul className="space-y-3">
              {PRO_FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <li key={i} className="flex items-center gap-3 text-sm sm:text-base" data-testid={`feature-${i}`}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="leading-relaxed">{f.text}</span>
                  </li>
                );
              })}
            </ul>

            <Button
              className="w-full h-12 rounded-xl text-base font-bold"
              size="lg"
              onClick={handleUpgrade}
              disabled={loading}
              data-testid="button-plan-pro"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Crown className="w-4 h-4 me-2" />}
              احصل عليه الآن - 99 ر.س (دفعة واحدة)
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">
        جميع المدفوعات تتم عبر بوابة Moyasar الآمنة. تدعم مدى، فيزا، وماستركارد.
        الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة.
      </p>
    </div>
  );
}
