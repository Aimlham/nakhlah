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
  Store,
  Search,
  MapPin,
  ImageIcon,
  ChevronLeft,
  Users,
} from "lucide-react";
import type { Listing } from "@shared/schema";

interface SuppliersPageProps {
  filterTypes?: string[];
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function SuppliersPage({
  filterTypes,
  title = "الموردين",
  subtitle = "تصفح جميع الموردين المحليين",
  emptyTitle = "لا يوجد موردين حالياً",
  emptyDescription = "سيتم إضافة موردين جدد قريباً",
}: SuppliersPageProps) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  const cities = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.supplierCity).filter(Boolean))] as string[];
  }, [listings]);

  const filtered = useMemo(() => {
    let result = listings || [];

    if (filterTypes && filterTypes.length > 0) {
      result = result.filter((l) => {
        const type = (l.supplierType || "").toLowerCase();
        return filterTypes.some((ft) => type.includes(ft.toLowerCase()));
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q) ||
          (l.supplierType || "").toLowerCase().includes(q)
      );
    }
    if (city !== "all") result = result.filter((l) => l.supplierCity === city);

    return result;
  }, [listings, search, city, filterTypes]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-suppliers-title">
          {title}
        </h1>
        <p className="text-muted-foreground text-base">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مورد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 h-11 rounded-xl bg-card border-border/60"
            data-testid="input-search-suppliers"
          />
        </div>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-[170px] h-11 rounded-xl bg-card border-border/60" data-testid="select-city">
            <SelectValue placeholder="المدينة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المدن</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground" data-testid="text-suppliers-count">
        {filtered.length} مورد متاح
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((listing) => (
            <SupplierCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierCard({ listing }: { listing: Listing }) {
  return (
    <Card
      className="group overflow-hidden rounded-2xl border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
      data-testid={`card-supplier-${listing.id}`}
    >
      <CardContent className="p-0">
        <div className="relative h-44 bg-muted/50 overflow-hidden">
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/80">
              <Store className="w-14 h-14 text-muted-foreground/20" />
            </div>
          )}
          {listing.supplierType && (
            <div className="absolute top-3 start-3">
              <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm">
                <Store className="w-3 h-3 me-1 text-primary" />
                {listing.supplierType}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          <h3
            className="font-bold text-lg leading-snug line-clamp-1"
            data-testid={`text-supplier-title-${listing.id}`}
          >
            {listing.title}
          </h3>

          {listing.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {listing.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {listing.supplierCity && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary/70" />
                {listing.supplierCity}
              </span>
            )}
          </div>

          <Button
            variant="default"
            size="sm"
            className="w-full h-10 rounded-xl font-medium text-sm"
            asChild
          >
            <Link href={`/suppliers/${listing.id}`} data-testid={`button-view-supplier-${listing.id}`}>
              عرض المورد
              <ChevronLeft className="w-4 h-4 ms-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
