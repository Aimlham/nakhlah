import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package } from "lucide-react";
import type { Product } from "@shared/schema";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("newest");
  const [minOpportunity, setMinOpportunity] = useState("all");
  const [minMargin, setMinMargin] = useState("all");
  const [minTrend, setMinTrend] = useState("all");
  const [halalOnly, setHalalOnly] = useState(false);
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });

  const savedIds = new Set(savedData?.savedProductIds || []);

  const toggleSave = useMutation({
    mutationFn: async (productId: string) => {
      if (savedIds.has(productId)) {
        await apiRequest("DELETE", `/api/saved/${productId}`);
      } else {
        await apiRequest("POST", `/api/saved/${productId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const categories = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  const niches = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(p => p.niche).filter(Boolean))] as string[];
  }, [products]);

  const platforms = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map(p => p.sourcePlatform).filter(Boolean))] as string[];
  }, [products]);

  const filtered = useMemo(() => {
    let result = products || [];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.shortDescription || "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.supplierName || "").toLowerCase().includes(q)
      );
    }
    if (category !== "all") result = result.filter(p => p.category === category);
    if (niche !== "all") result = result.filter(p => p.niche === niche);
    if (platform !== "all") result = result.filter(p => p.sourcePlatform === platform);
    if (halalOnly) result = result.filter(p => p.isHalalSafe !== false);

    if (minOpportunity !== "all") {
      const min = parseInt(minOpportunity, 10);
      result = result.filter(p => (p.opportunityScore || 0) >= min);
    }
    if (minMargin !== "all") {
      const min = parseFloat(minMargin);
      result = result.filter(p => parseFloat(p.estimatedMargin || "0") >= min);
    }
    if (minTrend !== "all") {
      const min = parseInt(minTrend, 10);
      result = result.filter(p => (p.trendScore || 0) >= min);
    }

    result = [...result].sort((a, b) => {
      if (sort === "opportunity") return (b.opportunityScore || 0) - (a.opportunityScore || 0);
      if (sort === "margin") return parseFloat(b.estimatedMargin || "0") - parseFloat(a.estimatedMargin || "0");
      if (sort === "trending") return (b.trendScore || 0) - (a.trendScore || 0);
      if (sort === "orders") return (b.ordersCount || 0) - (a.ordersCount || 0);
      if (sort === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return result;
  }, [products, search, category, niche, platform, sort, minOpportunity, minMargin, minTrend, halalOnly]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-80 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-products-title">مكتبتي</h1>
        <p className="text-muted-foreground">المنتجات المحفوظة في مكتبتك الشخصية</p>
      </div>

      <FilterBar
        search={search} onSearchChange={setSearch}
        category={category} onCategoryChange={setCategory}
        niche={niche} onNicheChange={setNiche}
        platform={platform} onPlatformChange={setPlatform}
        sort={sort} onSortChange={setSort}
        categories={categories}
        niches={niches}
        platforms={platforms}
        minOpportunity={minOpportunity} onMinOpportunityChange={setMinOpportunity}
        minMargin={minMargin} onMinMarginChange={setMinMargin}
        minTrend={minTrend} onMinTrendChange={setMinTrend}
        halalOnly={halalOnly} onHalalOnlyChange={setHalalOnly}
      />

      <p className="text-sm text-muted-foreground" data-testid="text-products-count">
        {filtered.length} منتج
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لم يتم العثور على منتجات"
          description="حاول تعديل الفلاتر أو البحث للعثور على منتجات."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isSaved={savedIds.has(product.id)}
              onToggleSave={(id) => toggleSave.mutate(id)}
              savePending={toggleSave.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
