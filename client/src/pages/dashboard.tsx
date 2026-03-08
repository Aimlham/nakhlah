import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Package, TrendingUp, Star, Bookmark, Flame, CalendarPlus,
  ArrowLeft, Eye, Heart, Play, Calendar, ExternalLink,
  Search, Megaphone, Zap, RefreshCw, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/kpi-card";
import { ScoreBadge } from "@/components/score-badge";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMargin, formatCompactNumber, getCategoryGradient, getPlatformColor, timeSince, cn } from "@/lib/utils";
import type { Product } from "@shared/schema";

interface EnrichedAd {
  id: string;
  productId: string;
  platform: string;
  niche: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
  publishedAt: string | null;
  createdAt: string | null;
  productTitle: string;
  productCategory: string;
  productNiche: string;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: adsData, isLoading: adsLoading } = useQuery<EnrichedAd[]>({
    queryKey: ["/api/ads"],
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });

  const allProducts = products || [];
  const allAds = adsData || [];
  const savedIds = new Set(savedData?.savedProductIds || []);
  const savedCount = savedIds.size;
  const trendingToday = allProducts.filter(p => (p.trendScore || 0) >= 80).length;
  const highOpportunity = allProducts.filter(p => (p.opportunityScore || 0) >= 80).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newToday = allProducts.filter(p => {
    if (!p.createdAt) return false;
    const d = new Date(p.createdAt);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
  }).length;

  const trendingProducts = [...allProducts]
    .filter(p => (p.trendScore || 0) >= 70)
    .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0))
    .slice(0, 8);

  const topOpportunities = [...allProducts]
    .sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0))
    .slice(0, 6);

  const recentProducts = [...allProducts]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6);

  const topAds = [...allAds]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 6);

  const mostSaved = allProducts
    .filter(p => savedIds.has(p.id))
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
              اكتشف المنتجات والإعلانات الرائجة اليوم
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.fullName ? `مرحباً ${user.fullName} — ` : ""}ابحث واكتشف أفضل فرص الدروبشيبنق الآن
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن منتجات أو إعلانات..."
                className="ps-9 bg-background/60 backdrop-blur-sm"
                data-testid="input-dashboard-search"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="إجمالي المنتجات"
          value={allProducts.length}
          icon={Package}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
        />
        <KpiCard
          title="جديد اليوم"
          value={newToday}
          icon={CalendarPlus}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
        />
        <KpiCard
          title="الرائج الآن"
          value={trendingToday}
          icon={TrendingUp}
          trend={trendingToday > 0 ? "نشط" : undefined}
          iconBg="bg-orange-500/10"
          iconColor="text-orange-500"
        />
        <KpiCard
          title="فرص عالية"
          value={highOpportunity}
          icon={Star}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
        />
        <KpiCard
          title="الإعلانات الجارية"
          value={allAds.length}
          icon={Megaphone}
          iconBg="bg-pink-500/10"
          iconColor="text-pink-500"
        />
        <KpiCard
          title="المحفوظة"
          value={savedCount}
          icon={Bookmark}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-section-trending">
            <Flame className="w-5 h-5 text-orange-500" />
            المنتجات الرائجة الآن
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/products" data-testid="link-view-all-trending">
              عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingProducts.map(product => (
            <DashboardProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2" data-testid="text-section-ads">
            <Megaphone className="w-5 h-5 text-pink-500" />
            الإعلانات الجارية الآن
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/ads" data-testid="link-view-all-ads">
              عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
        {adsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        ) : topAds.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>لا توجد إعلانات حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topAds.map(ad => (
              <DashboardAdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-500" />
              أفضل الفرص
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/products">
                المزيد <ArrowLeft className="w-3 h-3" />
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            {topOpportunities.map((product, index) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="transition-all duration-200 hover:bg-muted/50 cursor-pointer border-transparent hover:border-border" data-testid={`link-top-product-${product.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0 tabular-nums">
                        #{index + 1}
                      </span>
                      <div className={cn(
                        "w-9 h-9 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0 overflow-hidden",
                        getCategoryGradient(product.category)
                      )}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatMoney(product.supplierPrice)} → {formatMoney(product.suggestedSellPrice)}</span>
                          <span className="text-emerald-500 font-medium">{formatMargin(product.estimatedMargin)}</span>
                        </div>
                      </div>
                      <ScoreBadge label="" score={product.opportunityScore} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              جديد اليوم
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/products">
                المزيد <ArrowLeft className="w-3 h-3" />
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            {recentProducts.map(product => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="transition-all duration-200 hover:bg-muted/50 cursor-pointer border-transparent hover:border-border" data-testid={`link-recent-product-${product.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0 overflow-hidden",
                        getCategoryGradient(product.category)
                      )}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{product.category}</Badge>
                          {product.niche && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.niche}</Badge>}
                        </div>
                      </div>
                      {product.createdAt && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeSince(product.createdAt)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-500" />
              المنتجات المحفوظة
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/saved" data-testid="link-view-saved">
                المزيد <ArrowLeft className="w-3 h-3" />
              </Link>
            </Button>
          </div>
          {mostSaved.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Bookmark className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium mb-1">لم تحفظ أي منتجات بعد</p>
                <p className="text-xs text-muted-foreground mb-4">احفظ المنتجات المهمة للعودة إليها لاحقاً</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/products" data-testid="link-browse-products">
                    تصفح المنتجات
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {mostSaved.map(product => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="transition-all duration-200 hover:bg-muted/50 cursor-pointer border-transparent hover:border-border" data-testid={`link-saved-product-${product.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0 overflow-hidden",
                          getCategoryGradient(product.category)
                        )}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-white/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                        </div>
                        <ScoreBadge label="" score={product.opportunityScore} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DashboardProductCard({ product }: { product: Product }) {
  const isHighOpportunity = (product.opportunityScore || 0) >= 80;

  return (
    <Card
      className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full"
      data-testid={`card-trending-${product.id}`}
    >
      <CardContent className="p-0">
        <div className={cn(
          "relative h-36 rounded-t-lg bg-gradient-to-br flex items-center justify-center overflow-hidden",
          getCategoryGradient(product.category)
        )}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <Package className="w-8 h-8 text-white/60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute top-2 end-2">
            <ScoreBadge label="" score={product.opportunityScore} />
          </div>
          {isHighOpportunity && (
            <div className="absolute top-2 start-2">
              <div className="inline-flex items-center gap-1 rounded-md bg-orange-500 text-white px-1.5 py-0.5 text-[10px] font-medium">
                <Flame className="w-3 h-3" />
                ترند
              </div>
            </div>
          )}
          {product.sourcePlatform && (
            <div className="absolute bottom-2 start-2">
              <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm">
                {product.sourcePlatform}
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <h3 className="text-sm font-semibold leading-tight line-clamp-1">{product.title}</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{product.category}</Badge>
            {product.niche && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.niche}</Badge>}
          </div>
          <div className="grid grid-cols-3 gap-1 text-center bg-muted/30 rounded-md p-2 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">المورّد</p>
              <p className="font-bold tabular-nums">{formatMoney(product.supplierPrice)}</p>
            </div>
            <div className="border-x border-border/50">
              <p className="text-[10px] text-muted-foreground">البيع</p>
              <p className="font-bold tabular-nums">{formatMoney(product.suggestedSellPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">الهامش</p>
              <p className="font-bold text-emerald-500 tabular-nums">{formatMargin(product.estimatedMargin)}</p>
            </div>
          </div>
          <Button asChild variant="default" size="sm" className="w-full">
            <Link href={`/products/${product.id}`} data-testid={`link-trending-details-${product.id}`}>
              التفاصيل
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardAdCard({ ad }: { ad: EnrichedAd }) {
  const displayDate = ad.publishedAt || ad.createdAt;

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1" data-testid={`card-dashboard-ad-${ad.id}`}>
      <CardContent className="p-0">
        <div
          className="relative h-44 rounded-t-lg overflow-hidden bg-muted cursor-pointer"
          onClick={() => window.open(ad.videoUrl, "_blank")}
        >
          {ad.thumbnailUrl ? (
            <img
              src={ad.thumbnailUrl}
              alt={ad.productTitle}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-black ms-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between">
            <Badge className={cn("text-[10px]", getPlatformColor(ad.platform))}>{ad.platform}</Badge>
            <div className="flex items-center gap-2 text-white text-xs">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatCompactNumber(ad.views || 0)}</span>
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {formatCompactNumber(ad.likes || 0)}</span>
            </div>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <Link href={`/products/${ad.productId}`}>
            <p className="text-sm font-medium truncate hover:text-primary transition-colors cursor-pointer">
              {ad.productTitle}
            </p>
          </Link>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {ad.niche && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ad.niche}</Badge>}
            {displayDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {timeSince(displayDate)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="default" size="sm" className="flex-1 text-xs" asChild>
              <a href={ad.videoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" />
                فتح الإعلان
              </a>
            </Button>
            <Button variant="outline" size="sm" className="text-xs" asChild>
              <Link href={`/products/${ad.productId}`}>
                تحليل
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
