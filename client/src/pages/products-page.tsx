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
  Package,
  Search,
  MapPin,
  Tag,
  Store,
  ImageIcon,
  ChevronLeft,
} from "lucide-react";
import type { SupplierProductWithSupplier } from "@shared/schema";
import type { Category } from "@shared/schema";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: products, isLoading } = useQuery<SupplierProductWithSupplier[]>({
    queryKey: ["/api/supplier-products"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
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
      <div className="space-y-8 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-products-title">
          المنتجات
        </h1>
        <p className="text-muted-foreground text-base">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: SupplierProductWithSupplier }) {
  return (
    <Card
      className="group overflow-hidden rounded-2xl border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
      data-testid={`card-product-${product.id}`}
    >
      <CardContent className="p-0">
        <div className="relative h-52 bg-muted/50 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/80">
              <ImageIcon className="w-14 h-14 text-muted-foreground/20" />
            </div>
          )}
          {product.category && (
            <div className="absolute top-3 start-3">
              <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm">
                <Tag className="w-3 h-3 me-1 text-primary" />
                {product.category}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <h3
              className="font-bold text-lg leading-snug line-clamp-1"
              data-testid={`text-product-title-${product.id}`}
            >
              {product.title}
            </h3>

            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {product.supplier?.supplierCity && (
              <span className="flex items-center gap-1" data-testid={`text-product-city-${product.id}`}>
                <MapPin className="w-3.5 h-3.5 text-primary/70" />
                {product.supplier.supplierCity}
              </span>
            )}
            {product.supplier?.supplierType && (
              <span className="flex items-center gap-1" data-testid={`text-product-type-${product.id}`}>
                <Store className="w-3.5 h-3.5 text-primary/70" />
                {product.supplier.supplierType}
              </span>
            )}
          </div>

          <Button
            variant="default"
            size="sm"
            className="w-full h-10 rounded-xl font-medium text-sm"
            asChild
          >
            <Link href={`/products/${product.id}`} data-testid={`button-view-product-${product.id}`}>
              عرض التفاصيل
              <ChevronLeft className="w-4 h-4 ms-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
