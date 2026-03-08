import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Package, Bookmark, Flame,
  ArrowLeft, Search, Megaphone, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { cn, formatCompactNumber, getCategoryGradient, formatMoney, formatMargin } from "@/lib/utils";
import { ScoreBadge } from "@/components/score-badge";
import { MineaAdCard, type EnrichedAd } from "@/components/minea-ad-card";
import type { Product } from "@shared/schema";
import { useState } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ads");
  const [search, setSearch] = useState("");

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
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
  const isLoading = productsLoading || adsLoading;

  const adCountByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    allAds.forEach(ad => {
      map[ad.productId] = (map[ad.productId] || 0) + 1;
    });
    return map;
  }, [allAds]);

  const viewsByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    allAds.forEach(ad => {
      map[ad.productId] = (map[ad.productId] || 0) + (ad.views || 0);
    });
    return map;
  }, [allAds]);

  const filteredAds = useMemo(() => {
    let result = [...allAds];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(ad =>
        ad.productTitle.toLowerCase().includes(s) ||
        ad.platform.toLowerCase().includes(s) ||
        (ad.niche || "").toLowerCase().includes(s) ||
        (ad.productNiche || "").toLowerCase().includes(s)
      );
    }
    return result.sort((a, b) => (b.views || 0) - (a.views || 0));
  }, [allAds, search]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s) ||
        (p.niche || "").toLowerCase().includes(s)
      );
    }
    return result.sort((a, b) => (b.opportunityScore || 0) - (a.opportunityScore || 0));
  }, [allProducts, search]);

  const topProducts = filteredProducts.slice(0, 8);

  const quickFilterTags = [
    { label: "الأكثر رواجاً", icon: Flame, color: "text-orange-500" },
    { label: "فرص ذهبية", icon: Sparkles, color: "text-amber-500" },
    { label: "جديد اليوم", icon: Package, color: "text-violet-500" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-[420px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50" data-testid="tabs-dashboard">
            <TabsTrigger value="ads" className="gap-1.5 text-sm" data-testid="tab-ads">
              <Megaphone className="w-4 h-4" />
              مكتبة الإعلانات
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5 text-sm" data-testid="tab-products">
              <Package className="w-4 h-4" />
              المنتجات الرابحة
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-muted/50 rounded-md px-2.5 py-1">
            {activeTab === "ads" ? `${allAds.length} إعلان` : `${allProducts.length} منتج`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={activeTab === "ads" ? "ابحث عن إعلانات..." : "ابحث عن منتجات..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-dashboard-search"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {quickFilterTags.map(tag => (
          <Badge
            key={tag.label}
            variant="outline"
            className="cursor-pointer hover:bg-muted/50 transition-colors text-xs px-3 py-1.5 shrink-0 gap-1.5"
          >
            <tag.icon className={cn("w-3.5 h-3.5", tag.color)} />
            {tag.label}
          </Badge>
        ))}
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-muted/50 transition-colors text-xs px-3 py-1.5 shrink-0 gap-1.5"
        >
          <Bookmark className="w-3.5 h-3.5 text-primary" />
          المحفوظة ({savedIds.size})
        </Badge>
      </div>

      {activeTab === "ads" ? (
        filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">لا توجد إعلانات</p>
            <p className="text-xs text-muted-foreground mt-1">حاول تعديل البحث</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-dashboard-ads">
            {filteredAds.map(ad => (
              <MineaAdCard
                key={ad.id}
                ad={ad}
                adCountForProduct={adCountByProduct[ad.productId]}
                totalViewsForProduct={viewsByProduct[ad.productId]}
              />
            ))}
          </div>
        )
      ) : (
        filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">لا توجد منتجات</p>
            <p className="text-xs text-muted-foreground mt-1">حاول تعديل البحث</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="grid-dashboard-products">
            {topProducts.map(product => (
              <DashboardProductCard key={product.id} product={product} isSaved={savedIds.has(product.id)} />
            ))}
            {filteredProducts.length > 8 && (
              <div className="col-span-full flex justify-center pt-2">
                <Button variant="outline" asChild>
                  <Link href="/products" data-testid="link-view-all-products">
                    عرض كل المنتجات ({filteredProducts.length})
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function DashboardProductCard({ product, isSaved }: { product: Product; isSaved?: boolean }) {
  const isHighOpportunity = (product.opportunityScore || 0) >= 80;

  return (
    <Card
      className="group transition-all duration-200 hover:shadow-md h-full border-border/60"
      data-testid={`card-product-${product.id}`}
    >
      <CardContent className="p-0">
        <div className={cn(
          "relative h-44 rounded-t-lg bg-gradient-to-br flex items-center justify-center overflow-hidden",
          getCategoryGradient(product.category)
        )}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <Package className="w-8 h-8 text-white/60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute top-2.5 end-2.5">
            <ScoreBadge label="" score={product.opportunityScore} />
          </div>
          {isHighOpportunity && (
            <div className="absolute top-2.5 start-2.5">
              <Badge className="text-[10px] bg-orange-500 text-white border-0 gap-1">
                <Flame className="w-3 h-3" />
                ترند
              </Badge>
            </div>
          )}
          {product.sourcePlatform && (
            <div className="absolute bottom-2.5 start-2.5">
              <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm">
                {product.sourcePlatform}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-3 space-y-2.5">
          <div>
            <h3 className="text-sm font-semibold leading-tight line-clamp-1" data-testid={`text-product-title-${product.id}`}>
              {product.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{product.category}</Badge>
              {product.niche && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.niche}</Badge>}
            </div>
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

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
              <Link href={`/products/${product.id}`} data-testid={`link-product-details-${product.id}`}>
                التفاصيل
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 shrink-0"
              data-testid={`button-save-${product.id}`}
            >
              <Bookmark className={cn("w-3.5 h-3.5", isSaved ? "fill-primary text-primary" : "")} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
