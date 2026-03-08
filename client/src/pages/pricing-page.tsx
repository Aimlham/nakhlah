import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "مجاناً للأبد",
    description: "ابدأ بأبحاث المنتجات الأساسية",
    features: [
      "50 مشاهدة منتج/شهرياً",
      "بيانات رواج أساسية",
      "حفظ حتى 10 منتجات",
      "دعم مجتمعي",
    ],
    cta: "باقتك الحالية",
    popular: false,
    current: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/شهرياً",
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
    name: "Enterprise",
    price: "$99",
    period: "/شهرياً",
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
    cta: "تواصل مع المبيعات",
    popular: false,
    current: false,
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-pricing-title">الأسعار</h1>
        <p className="text-muted-foreground">اختر الباقة المناسبة لاحتياجاتك.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl">
        {plans.map((plan, i) => (
          <Card
            key={i}
            className={`hover-elevate relative ${plan.popular ? "border-primary border-2" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="no-default-active-elevate">الأكثر شعبية</Badge>
              </div>
            )}
            <CardContent className="p-6 space-y-5">
              <div>
                <h3 className="font-semibold text-lg">
                  {plan.name === "Free" ? "مجانية" : plan.name === "Pro" ? "احترافية" : "مؤسسات"}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-bold">{plan.price}</span>
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
                disabled={plan.current}
                data-testid={`button-plan-${plan.name.toLowerCase()}`}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
