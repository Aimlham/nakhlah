import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Package, TrendingUp, Star, Bookmark, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { ScoreBadge } from "@/components/score-badge";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatMargin, getCategoryGradient, cn } from "@/lib/utils";
import type { Product } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });

  const allProducts = products || [];
  const savedCount = savedData?.savedProductIds?.length || 0;
  const trendingToday = allProducts.filter(p => (p.trendScore || 0) >= 80).length;
  const highOpportunity = allProducts.filter(p => (p.opportunityScore || 0) >= 80).length;

  const recentProducts = [...allProducts]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 4);

  const topOpportunities = [...allProducts]
    .sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0))
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-md" />
          <Skeleton className="h-64 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
          مرحباً بعودتك{user?.fullName ? `، ${user.fullName}` : ""}
        </h1>
        <p className="text-muted-foreground">إليك أحدث المنتجات الرائجة في أبحاثك.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="إجمالي المنتجات"
          value={allProducts.length}
          icon={Package}
          description="في قاعدة البيانات"
        />
        <KpiCard
          title="الرائج اليوم"
          value={trendingToday}
          icon={TrendingUp}
          description="تقييم 80+"
          trend={trendingToday > 0 ? "رائج الآن" : undefined}
        />
        <KpiCard
          title="فرص عالية"
          value={highOpportunity}
          icon={Star}
          description="فرصة 80+"
        />
        <KpiCard
          title="المنتجات المحفوظة"
          value={savedCount}
          icon={Bookmark}
          description="مجموعتك"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">أحدث المنتجات</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/products" data-testid="link-view-all-products">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProducts.map(product => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer" data-testid={`link-recent-product-${product.id}`}>
                  <div className={cn(
                    "w-10 h-10 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0",
                    getCategoryGradient(product.category)
                  )}>
                    <Package className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <ScoreBadge label="" score={product.opportunityScore} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-4">
            <CardTitle className="text-base font-semibold">أفضل الفرص</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/products" data-testid="link-view-opportunities">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {topOpportunities.map((product, index) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer" data-testid={`link-top-product-${product.id}`}>
                  <span className="text-sm font-bold text-muted-foreground w-5 text-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatMoney(product.supplierPrice)}</span>
                      <span>-</span>
                      <span>{formatMoney(product.suggestedSellPrice)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatMargin(product.estimatedMargin)}
                      </span>
                    </div>
                  </div>
                  <ScoreBadge label="" score={product.opportunityScore} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
