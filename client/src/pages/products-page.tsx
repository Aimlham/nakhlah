import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Search,
  MapPin,
  Tag,
  Store,
  ImageIcon,
  ChevronLeft,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import type { SupplierProductWithSupplier } from "@shared/schema";
import type { Category } from "@shared/schema";
import { resolveImage, GENERAL_FALLBACK_IMAGE } from "@/lib/category-image";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<SupplierProductWithSupplier[]>({
    queryKey: ["/api/supplier-products"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[]; savedListingIds: string[] }>({
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved"] }),
    onError: (err: any) => {
      toast({
        title: "تعذّر حفظ المنتج",
        description: err?.message?.includes("401") ? "سجّل الدخول أولاً" : "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    let result = products || [];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }
    if (category !== "all") result = result.filter((p) => p.category === category);

    return result;
  }, [products, search, category]);

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-xl sm:rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      <div className="space-y-1.5 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-products-title">
          المنتجات
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          تصفح المنتجات المتاحة من الموردين المحليين
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 h-11 rounded-xl bg-card border-border/60"
            data-testid="input-search-products"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px] h-11 rounded-xl bg-card border-border/60" data-testid="select-category">
            <SelectValue placeholder="التصنيف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع التصنيفات</SelectItem>
            {(categories || []).map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground" data-testid="text-products-count">
        {filtered.length} منتج متاح
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="لا يوجد منتجات حالياً"
          description="سيتم إضافة منتجات جديدة قريباً"
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isSaved={savedIds.has(product.id)}
              onToggleSave={() => toggleSave.mutate(product.id)}
              savePending={toggleSave.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function fmtPrice(v?: string | null): string | null {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function PriceBlock({ product }: { product: SupplierProductWithSupplier }) {
  const unit = fmtPrice(product.supplierPrice);
  const unitNum = product.supplierPrice ? parseFloat(product.supplierPrice) : NaN;
  const manualDozen = fmtPrice(product.dozenPrice);
  const dozen = manualDozen ?? (Number.isFinite(unitNum) ? fmtPrice(String(unitNum * 12)) : null);
  const minQty = product.minimumOrderQuantity;
  if (!unit && !minQty) return null;
  return (
    <div className="rounded-lg bg-primary/[0.04] border border-primary/15 p-2 sm:p-2.5 space-y-1" data-testid={`pricing-${product.id}`}>
      {unit && (
        <div className="text-sm sm:text-base font-bold text-foreground" data-testid={`price-unit-${product.id}`}>
          {unit} <span className="text-xs font-medium text-muted-foreground">ر.س / حبة</span>
        </div>
      )}
      {dozen && (
        <div className="text-[11px] sm:text-xs text-foreground/80" data-testid={`price-dozen-${product.id}`}>
          سعر الدزينة: <span className="font-semibold tabular-nums">{dozen}</span> ر.س
        </div>
      )}
      {minQty != null && minQty > 0 && (
        <div className="text-[11px] sm:text-xs text-muted-foreground" data-testid={`price-min-qty-${product.id}`}>
          الحد الأدنى: {minQty} قطعة
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: SupplierProductWithSupplier;
  isSaved: boolean;
  onToggleSave: () => void;
  savePending: boolean;
}

function ProductCard({ product, isSaved, onToggleSave, savePending }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} data-testid={`card-product-${product.id}`}>
      <Card
        className="group overflow-hidden rounded-xl sm:rounded-2xl border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
      >
        <CardContent className="p-0">
          <div className="relative aspect-[4/5] bg-muted/50 overflow-hidden">
            <img
              src={resolveImage(product.imageUrl, product.category, null, product.title)}
              alt={product.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = GENERAL_FALLBACK_IMAGE; }}
            />
            {product.category && (
              <div className="absolute top-2 start-2 sm:top-3 sm:start-3">
                <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-1 shadow-sm">
                  <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 me-1 text-primary" />
                  {product.category}
                </Badge>
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave();
              }}
              disabled={savePending}
              aria-label={isSaved ? "إلغاء الحفظ" : "حفظ المنتج"}
              className="absolute top-2 end-2 sm:top-3 sm:end-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background/90 backdrop-blur-sm border-0 shadow-sm flex items-center justify-center hover:bg-background disabled:opacity-50 transition-colors"
              data-testid={`button-save-product-${product.id}`}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-2.5">
            <h3
              className="font-semibold text-sm sm:text-base leading-snug line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]"
              data-testid={`text-product-title-${product.id}`}
            >
              {product.title}
            </h3>

            <PriceBlock product={product} />

            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap pt-0.5">
              {product.supplier?.supplierCity && (
                <span className="flex items-center gap-0.5 sm:gap-1" data-testid={`text-product-city-${product.id}`}>
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
                  {product.supplier.supplierCity}
                </span>
              )}
              {product.supplier?.supplierType && (
                <span className="flex items-center gap-0.5 sm:gap-1" data-testid={`text-product-type-${product.id}`}>
                  <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
                  {product.supplier.supplierType}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
