import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import {
  FolderOpen,
  Search,
  Package,
  Lock,
  ExternalLink,
  Star,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { cn, formatMoney, getCategoryGradient } from "@/lib/utils";
import type { Product } from "@shared/schema";

interface ProjectsPageProps {
  isSubscribed: boolean;
}

export default function ProjectsPage({ isSubscribed }: ProjectsPageProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/projects"],
  });

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => p.category))];
  }, [products]);

  const filtered = useMemo(() => {
    let result = products || [];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.aiSummary || "").toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (category !== "all") result = result.filter((p) => p.category === category);

    result = [...result].sort((a, b) => {
      if (sort === "newest")
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sort === "price")
        return parseFloat(b.suggestedSellPrice || "0") - parseFloat(a.suggestedSellPrice || "0");
      if (sort === "opportunity")
        return (b.opportunityScore || 0) - (a.opportunityScore || 0);
      return 0;
    });

    return result;
  }, [products, search, category, sort]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-96 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-projects-title">
            المشاريع
          </h1>
        </div>
        <p className="text-muted-foreground mt-1">
          اكتشف فرص مشاريع دروبشيبنق جاهزة للبدء
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مشروع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]" data-testid="select-category">
            <SelectValue placeholder="التصنيف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع التصنيفات</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[160px]" data-testid="select-sort">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">الأحدث</SelectItem>
            <SelectItem value="opportunity">أعلى فرصة</SelectItem>
            <SelectItem value="price">أعلى سعر</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground" data-testid="text-projects-count">
        {filtered.length} مشروع متاح
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="لا توجد مشاريع حالياً"
          description="سيتم إضافة مشاريع جديدة قريباً"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <ProjectCard
              key={product.id}
              product={product}
              isSubscribed={isSubscribed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  product,
  isSubscribed,
}: {
  product: Product;
  isSubscribed: boolean;
}) {
  let summary = "";
  if (product.aiSummary) {
    try {
      const parsed = JSON.parse(product.aiSummary);
      summary = parsed.whyPromising || "";
    } catch {
      summary = product.aiSummary.slice(0, 120);
    }
  }

  return (
    <Card
      className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 overflow-hidden"
      data-testid={`card-project-${product.id}`}
    >
      <CardContent className="p-0">
        <div
          className={cn(
            "relative h-44 rounded-t-lg bg-gradient-to-br flex items-center justify-center overflow-hidden",
            getCategoryGradient(product.category)
          )}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <Package className="w-10 h-10 text-white/60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {(product.opportunityScore || 0) >= 70 && (
            <div className="absolute top-2 end-2">
              <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500 text-white px-2 py-1 text-xs font-medium shadow-sm">
                <TrendingUp className="w-3 h-3" />
                فرصة عالية
              </div>
            </div>
          )}

          <div className="absolute bottom-2 start-2">
            <Badge
              variant="secondary"
              className="text-[10px] bg-black/50 text-white border-0 backdrop-blur-sm"
            >
              {product.category}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <h3
            className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]"
            data-testid={`text-project-title-${product.id}`}
          >
            {product.title}
          </h3>

          {summary && (
            <p className="text-xs text-muted-foreground line-clamp-2">{summary}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-center bg-muted/30 rounded-lg p-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">سعر البيع المتوقع</p>
              <p className="text-sm font-bold tabular-nums">
                {formatMoney(product.suggestedSellPrice)}
              </p>
            </div>
            <div className="border-s border-border/50">
              <p className="text-[10px] text-muted-foreground mb-0.5">هامش الربح</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {parseFloat(product.estimatedMargin || "0").toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {product.ordersCount != null && product.ordersCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <ShoppingCart className="w-3 h-3" />
                  {product.ordersCount.toLocaleString()}
                </span>
              )}
              {product.rating != null && (
                <span className="flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {Number(product.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {isSubscribed ? (
            <div className="space-y-2">
              {product.supplierLink && (
                <div className="flex items-center justify-between">
                  <a
                    href={product.supplierLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    data-testid={`link-supplier-${product.id}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    عرض صفحة المورد
                  </a>
                  {product.supplierSource && (
                    <Badge variant="outline" className="text-[10px]" data-testid={`badge-supplier-source-${product.id}`}>
                      {product.supplierSource === "aliexpress" ? "AliExpress" :
                       product.supplierSource === "cjdropshipping" || product.supplierSource === "cj" ? "CJ Dropshipping" :
                       product.supplierSource}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg bg-muted/50 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  بيانات المورد مخفية
                </div>
                <Button size="sm" className="w-full" asChild>
                  <Link href="/pricing" data-testid={`button-subscribe-${product.id}`}>
                    اشترك لعرض بيانات المورد
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
