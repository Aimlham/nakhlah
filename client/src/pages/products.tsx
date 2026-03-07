import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package } from "lucide-react";
import { categories, niches, platforms } from "@/data/mock-products";
import type { Product } from "@shared/schema";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("newest");
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
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    let result = products || [];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.shortDescription || "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (category !== "all") result = result.filter(p => p.category === category);
    if (niche !== "all") result = result.filter(p => p.niche === niche);
    if (platform !== "all") result = result.filter(p => p.sourcePlatform === platform);

    result = [...result].sort((a, b) => {
      if (sort === "opportunity") return (b.opportunityScore || 0) - (a.opportunityScore || 0);
      if (sort === "margin") return parseFloat(b.estimatedMargin || "0") - parseFloat(a.estimatedMargin || "0");
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return result;
  }, [products, search, category, niche, platform, sort]);

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
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-products-title">Products</h1>
        <p className="text-muted-foreground">Discover trending products with high profit potential.</p>
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
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Try adjusting your filters or search to find products."
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
