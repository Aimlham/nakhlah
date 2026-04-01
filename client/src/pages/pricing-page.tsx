import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const plans = [
  {
    key: null,
    name: "مجانية",
    priceDisplay: "مجاناً",
    period: "للأبد",
    description: "ابدأ بأبحاث المنتجات الأساسية",
    features: [
      "50 مشاهدة منتج/شهرياً",
      "بيانات اتجاهات أساسية",
      "حفظ حتى 10 منتجات",
      "دعم مجتمعي",
    ],
    cta: "باقتك الحالية",
    popular: false,
    current: true,
  },
  {
    key: "pro",
    name: "احترافية",
    priceDisplay: "109",
    period: "ر.س / شهرياً",
    description: "وصول كامل للبائعين المحترفين",
    features: [
      "مشاهدات غير محدودة",
      "تحليل ذكاء اصطناعي كامل",
      "حفظ منتجات غير محدود",
      "دعم ذو أولوية",
      "فلاتر وترتيب متقدم",
      "تصدير بيانات المنتجات",
      "تنبيهات رواج يومية",
    ],
    cta: "ترقية للاحترافية",
    popular: true,
    current: false,
  },
  {
    key: "enterprise",
    name: "مؤسسات",
    priceDisplay: "371",
    period: "ر.س / شهرياً",
    description: "للفرق والوكالات",
    features: [
      "كل مزايا الاحترافية",
      "وصول API",
      "تكاملات مخصصة",
      "تعاون فريق (5 مقاعد)",
      "مدير حساب مخصص",
      "تقارير بعلامتك التجارية",
      "تغذية بيانات مخصصة",
      "ضمان مستوى الخدمة",
    ],
    cta: "ترقية للمؤسسات",
    popular: false,
    current: false,
  },
];

export default function PricingPage() {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleUpgrade(planKey: string) {
    setLoadingPlan(planKey);
    try {
      const res = await apiRequest("POST", "/api/payments/create", { plan: planKey });
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
      setLoadingPlan(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-pricing-title">الأسعار</h1>
        <p className="text-muted-foreground">اختر الباقة المناسبة لاحتياجاتك.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`hover-elevate relative ${plan.popular ? "border-primary border-2" : ""}`}
            data-testid={`card-plan-${plan.key ?? "free"}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="no-default-active-elevate">الأكثر شعبية</Badge>
              </div>
            )}
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-bold" data-testid={`text-price-${plan.key ?? "free"}`}>
                    {plan.priceDisplay}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.current ? "secondary" : plan.popular ? "default" : "outline"}
                disabled={plan.current || loadingPlan === plan.key}
                onClick={() => plan.key && handleUpgrade(plan.key)}
                data-testid={`button-plan-${plan.key ?? "free"}`}
              >
                {loadingPlan === plan.key ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : null}
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground max-w-xl">
        جميع المدفوعات تتم عبر بوابة Moyasar الآمنة. تدعم مدى، فيزا، وماستركارد.
        الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة.
      </p>
    </div>
  );
}
