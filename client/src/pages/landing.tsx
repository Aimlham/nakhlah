import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TrendingUp, Target, Link2, Package,
  ArrowLeft, CheckCircle2, BarChart3, Shield, Globe,
  Moon, Sun,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ScoreBadge } from "@/components/score-badge";
import nakhlahLogo from "@assets/nakhlah-logo.png";

function LandingNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="flex items-center justify-between gap-1 px-6 py-4 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <img src={nakhlahLogo} alt="نخلة" className="w-8 h-8 rounded-md object-contain" />
        <span className="text-lg font-bold tracking-tight">نخلة</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="تبديل المظهر" data-testid="button-landing-theme">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/login" data-testid="link-login">تسجيل الدخول</Link>
        </Button>
        <Button asChild>
          <Link href="/signup" data-testid="link-signup">ابدأ الآن</Link>
        </Button>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 px-6 overflow-visible">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 dark:from-primary/10 dark:to-primary/5" />
      <div className="relative max-w-4xl mx-auto text-center space-y-6">
        <Badge variant="secondary" className="no-default-active-elevate">
          أبحاث منتجات بالذكاء الاصطناعي
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
          اكتشف المنتجات الرابحة{" "}
          <span className="text-primary">قبل أن تنتشر</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          توقف عن التخمين. استخدم تحليل الاتجاهات بالذكاء الاصطناعي وتقييم الفرص
          والرؤى التسويقية للعثور على منتجات مربحة لمتجرك الإلكتروني.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
          <Button size="lg" asChild>
            <Link href="/signup" data-testid="link-hero-signup">
              اشترك الآن
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features" data-testid="link-hero-features">شاهد كيف يعمل</Link>
          </Button>
        </div>
        <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 99 ريال فقط - دفعة واحدة</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> وصول كامل لجميع المزايا</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> بدون رسوم متكررة</span>
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <Card className="border-2">
          <CardContent className="p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "LED Sunset Projection Lamp",
                  category: "Home & Living",
                  score: 88,
                  supplier: "$8.50",
                  sell: "$34.99",
                  margin: "75.7%",
                  gradient: "from-orange-400 to-rose-400",
                },
                {
                  title: "Mini Portable Thermal Printer",
                  category: "Electronics",
                  score: 86,
                  supplier: "$15.40",
                  sell: "$49.99",
                  margin: "69.2%",
                  gradient: "from-blue-400 to-cyan-400",
                },
                {
                  title: "Cloud-Shaped LED Mirror",
                  category: "Home Decor",
                  score: 85,
                  supplier: "$12.80",
                  sell: "$44.99",
                  margin: "71.5%",
                  gradient: "from-violet-400 to-purple-400",
                },
              ].map((p, i) => (
                <div key={i} className="space-y-3">
                  <div className={`h-32 rounded-md bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                    <Package className="w-8 h-8 text-white/60" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{p.title}</h4>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <ScoreBadge label="التقييم" score={p.score} />
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{p.margin}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>المورّد: {p.supplier}</span>
                    <span>البيع: {p.sell}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: TrendingUp,
      title: "كشف الاتجاهات",
      description: "تحليل فوري للاتجاهات عبر المنصات الكبرى لاكتشاف المنتجات الصاعدة قبل تشبّع السوق.",
    },
    {
      icon: Target,
      title: "تقييم الفرص",
      description: "خوارزمية متقدمة تجمع بين سرعة الرواج ومستوى التشبّع وإمكانية الربح في تقييم واحد.",
    },
    {
      icon: BarChart3,
      title: "رؤى تسويقية بالذكاء الاصطناعي",
      description: "احصل على زوايا إعلانية وعبارات تسويقية وتحليل للجمهور المستهدف لكل منتج.",
    },
    {
      icon: Link2,
      title: "روابط مباشرة للموردين",
      description: "وصول فوري إلى موردين موثوقين بأسعار تنافسية للتوريد المباشر.",
    },
    {
      icon: Globe,
      title: "تغطية متعددة المنصات",
      description: "منتجات من AliExpress و1688 ومنصات توريد كبرى أخرى حول العالم.",
    },
    {
      icon: Shield,
      title: "بيانات موثوقة",
      description: "تحديث يومي مع تسعير موثق وحسابات هوامش الربح ومقاييس التشبّع.",
    },
  ];

  return (
    <section id="features" className="py-20 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tight">كل ما تحتاجه لاكتشاف المنتجات الرابحة</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            أدوات قوية مصممة خصيصاً لبائعي التجارة الإلكترونية والدروبشيبنغ.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="hover-elevate">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const features = [
    "مشاهدات غير محدودة للمنتجات",
    "تحليل ذكاء اصطناعي كامل",
    "حفظ غير محدود للمنتجات",
    "مكتبة إعلانات TikTok",
    "روابط موردين AliExpress و CJ",
    "فلاتر متقدمة",
    "دعم ذو أولوية",
  ];

  return (
    <section id="pricing" className="py-20 px-6">
      <div className="max-w-lg mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tight">سعر واحد. وصول كامل.</h2>
          <p className="text-muted-foreground">كل ما تحتاجه لاكتشاف المنتجات الرابحة.</p>
        </div>
        <Card className="hover-elevate relative border-primary border-2">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="no-default-active-elevate">نخلة برو</Badge>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">99</span>
                <span className="text-xl text-muted-foreground">ريال</span>
                <span className="text-sm text-muted-foreground">- دفعة واحدة</span>
              </div>
            </div>
            <ul className="space-y-3">
              {features.map((f, j) => (
                <li key={j} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" size="lg" asChild>
              <Link href="/signup" data-testid="link-pricing-signup">اشترك الآن</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "كيف تكتشف نخلة المنتجات الرائجة؟",
      a: "نحلل البيانات من منصات التجارة الإلكترونية المتعددة واتجاهات وسائل التواصل الاجتماعي وأنماط البحث لتحديد المنتجات ذات إمكانات النمو العالية والتشبّع المنخفض في السوق.",
    },
    {
      q: "ما هو تقييم الفرصة؟",
      a: "تقييم الفرصة هو مقياسنا الخاص الذي يجمع بين سرعة الرواج وتشبّع السوق وإمكانية هامش الربح في تقييم واحد من 0 إلى 100. التقييمات الأعلى تشير إلى فرص أفضل.",
    },
    {
      q: "هل يمكنني ربط متجري الخاص؟",
      a: "نحن نعمل على تكاملات مع Shopify وWooCommerce ومنصات كبرى أخرى. ترقبوا التحديثات!",
    },
    {
      q: "ما مدى دقة أسعار البيع المقترحة؟",
      a: "اقتراحات الأسعار لدينا مبنية على تحليل السوق لمنتجات مشابهة عبر منصات متعددة. وهي نقطة انطلاق - ننصح باختبار نقاط سعر مختلفة لجمهورك المحدد.",
    },
    {
      q: "هل الدفع شهري أم لمرة واحدة؟",
      a: "الدفع لمرة واحدة فقط بمبلغ 99 ريال، وتحصل على وصول دائم لجميع الموردين والمصانع بدون أي رسوم متكررة أو تجديد شهري.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl font-bold tracking-tight">الأسئلة الشائعة</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-start" data-testid={`button-faq-${i}`}>
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          مستعد لاكتشاف منتجك الرابح القادم؟
        </h2>
        <p className="text-lg text-muted-foreground">
          انضم إلى آلاف بائعي التجارة الإلكترونية الذين يستخدمون نخلة لاكتشاف منتجات مربحة كل يوم.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup" data-testid="link-final-cta">
            ابدأ مجاناً
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={nakhlahLogo} alt="نخلة" className="w-4 h-4 object-contain" />
          <span className="font-semibold">نخلة</span>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; 2026 نخلة. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <DemoSection />
      <FeaturesSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
