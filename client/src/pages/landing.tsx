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
  Zap, TrendingUp, Target, Link2, Package,
  ArrowRight, CheckCircle2, BarChart3, Shield, Globe,
  Moon, Sun,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ScoreBadge } from "@/components/score-badge";

function LandingNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="flex items-center justify-between gap-1 px-6 py-4 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
          <Zap className="w-4 h-4" />
        </div>
        <span className="text-lg font-bold tracking-tight">TrendDrop</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="icon" variant="ghost" onClick={toggleTheme} data-testid="button-landing-theme">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/login" data-testid="link-login">Log in</Link>
        </Button>
        <Button asChild>
          <Link href="/signup" data-testid="link-signup">Get Started</Link>
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
          AI-Powered Product Research
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
          Discover Winning Products{" "}
          <span className="text-primary">Before They Go Viral</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Stop guessing. Use AI-powered trend analysis, opportunity scoring, and marketing 
          insights to find profitable products for your e-commerce store.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
          <Button size="lg" asChild>
            <Link href="/signup" data-testid="link-hero-signup">
              Start Free Trial
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features" data-testid="link-hero-features">See How It Works</Link>
          </Button>
        </div>
        <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 50 free product searches</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancel anytime</span>
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
                    <ScoreBadge label="Score" score={p.score} />
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{p.margin}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Supplier: {p.supplier}</span>
                    <span>Sell: {p.sell}</span>
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
      title: "Trend Detection",
      description: "Real-time trend analysis across major platforms to spot rising products before they saturate.",
    },
    {
      icon: Target,
      title: "Opportunity Scoring",
      description: "Proprietary algorithm combining trend velocity, saturation level, and profit potential into one score.",
    },
    {
      icon: BarChart3,
      title: "AI Marketing Insights",
      description: "Get AI-generated ad angles, hooks, and target audience analysis for every product.",
    },
    {
      icon: Link2,
      title: "Direct Supplier Links",
      description: "One-click access to verified suppliers with competitive pricing for instant sourcing.",
    },
    {
      icon: Globe,
      title: "Multi-Platform Coverage",
      description: "Products sourced from AliExpress, 1688, and other major supplier platforms worldwide.",
    },
    {
      icon: Shield,
      title: "Reliable Data",
      description: "Updated daily with verified pricing, margin calculations, and saturation metrics.",
    },
  ];

  return (
    <section id="features" className="py-20 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Everything You Need to Find Winners</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Powerful tools designed specifically for e-commerce sellers and dropshippers.
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
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: ["50 product views/month", "Basic trend data", "Save up to 10 products", "Community support"],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      features: ["Unlimited product views", "Full AI analysis", "Unlimited saves", "Priority support", "Advanced filters", "Export data"],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      features: ["Everything in Pro", "API access", "Custom integrations", "Team collaboration", "Dedicated account manager", "White-label reports"],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground">Start free, upgrade when you're ready.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <Card
              key={i}
              className={`hover-elevate relative ${plan.popular ? "border-primary border-2" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="no-default-active-elevate">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-6 space-y-5">
                <div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
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
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/signup">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "How does TrendDrop find trending products?",
      a: "We analyze data from multiple e-commerce platforms, social media trends, and search patterns to identify products with high growth potential and low market saturation.",
    },
    {
      q: "What is the Opportunity Score?",
      a: "The Opportunity Score is our proprietary metric that combines trend velocity, market saturation, and profit margin potential into a single 0-100 score. Higher scores indicate better opportunities.",
    },
    {
      q: "Can I connect to my own store?",
      a: "Not yet in the MVP, but we're building integrations with Shopify, WooCommerce, and other major platforms. Stay tuned!",
    },
    {
      q: "How accurate are the suggested selling prices?",
      a: "Our pricing suggestions are based on market analysis of similar products across multiple platforms. They serve as a starting point - we recommend testing different price points for your specific audience.",
    },
    {
      q: "Is there a free trial?",
      a: "Yes! Our Free plan gives you access to 50 product views per month with basic trend data. No credit card required to get started.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left" data-testid={`button-faq-${i}`}>
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
          Ready to Find Your Next Winning Product?
        </h2>
        <p className="text-lg text-muted-foreground">
          Join thousands of e-commerce sellers who use TrendDrop to discover profitable products every day.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup" data-testid="link-final-cta">
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
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
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-semibold">TrendDrop</span>
        </div>
        <p className="text-sm text-muted-foreground">
          2026 TrendDrop. All rights reserved.
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
