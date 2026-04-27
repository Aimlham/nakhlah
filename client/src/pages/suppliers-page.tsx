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
import {
  Store,
  Search,
  MapPin,
  ImageIcon,
  Users,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import type { Listing } from "@shared/schema";
import { resolveImage, GENERAL_FALLBACK_IMAGE } from "@/lib/category-image";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SuppliersPageProps {
  filterTypes?: string[];
  excludeTypes?: string[];
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function SuppliersPage({
  filterTypes,
  excludeTypes,
  title = "الموردين",
  subtitle = "تصفح جميع الموردين المحليين",
  emptyTitle = "لا يوجد موردين حالياً",
  emptyDescription = "سيتم إضافة موردين جدد قريباً",
}: SuppliersPageProps) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");

  const { toast } = useToast();

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  const { data: savedData } = useQuery<{ savedListingIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });
  const savedIds = new Set(savedData?.savedListingIds || []);

  const toggleSave = useMutation({
    mutationFn: async (listingId: string) => {
      if (savedIds.has(listingId)) {
        await apiRequest("DELETE", `/api/saved/listings/${listingId}`);
      } else {
        await apiRequest("POST", `/api/saved/listings/${listingId}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
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

    if (excludeTypes && excludeTypes.length > 0) {
      result = result.filter((l) => {
        const type = (l.supplierType || "").toLowerCase();
        return !excludeTypes.some((et) => type.includes(et.toLowerCase()));
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-suppliers-title">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filtered.map((listing) => (
            <SupplierCard
              key={listing.id}
              listing={listing}
              isSaved={savedIds.has(listing.id)}
              onToggleSave={() => toggleSave.mutate(listing.id)}
              savePending={toggleSave.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SupplierCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: () => void;
  savePending: boolean;
}

function SupplierCard({ listing, isSaved, onToggleSave, savePending }: SupplierCardProps) {
  return (
    <div className="relative group" data-testid={`card-supplier-${listing.id}`}>
      <Link href={`/suppliers/${listing.id}`}>
        <Card className="overflow-hidden rounded-xl sm:rounded-2xl border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
          <CardContent className="p-0">
            <div className="relative aspect-[4/5] bg-muted/50 overflow-hidden">
              <img
                src={resolveImage(listing.imageUrl, listing.category, listing.supplierType)}
                alt={listing.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = GENERAL_FALLBACK_IMAGE; }}
              />
              {listing.supplierType && (
                <div className="absolute top-2 start-2 sm:top-3 sm:start-3">
                  <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-1 shadow-sm">
                    <Store className="w-2.5 h-2.5 sm:w-3 sm:h-3 me-1 text-primary" />
                    {listing.supplierType}
                  </Badge>
                </div>
              )}
            </div>

            <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2.5">
              <h3
                className="font-semibold text-sm sm:text-base leading-snug line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]"
                data-testid={`text-supplier-title-${listing.id}`}
              >
                {listing.title}
              </h3>

              {listing.supplierCity && (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary/70" />
                  {listing.supplierCity}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSave();
        }}
        disabled={savePending}
        aria-label={isSaved ? "إلغاء الحفظ" : "حفظ"}
        className="absolute top-2 end-2 sm:top-3 sm:end-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-sm hover:bg-background hover:scale-110 transition-all disabled:opacity-50"
        data-testid={`button-save-supplier-${listing.id}`}
      >
        {isSaved ? (
          <BookmarkCheck className="w-4 h-4 text-primary" />
        ) : (
          <Bookmark className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
