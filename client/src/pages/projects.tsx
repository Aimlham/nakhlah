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
  MapPin,
  Tag,
  Store,
  ChevronLeft,
} from "lucide-react";
import type { Listing } from "@shared/schema";
import { hasImage, pickAvatarColor, getInitial } from "@/lib/category-image";

interface ProjectsPageProps {
  isSubscribed: boolean;
}

export default function ProjectsPage({ isSubscribed }: ProjectsPageProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("all");

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings"],
  });

  const categories = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.category).filter(Boolean))] as string[];
  }, [listings]);

  const cities = useMemo(() => {
    if (!listings) return [];
    return [...new Set(listings.map((l) => l.supplierCity).filter(Boolean))] as string[];
  }, [listings]);

  const filtered = useMemo(() => {
    let result = listings || [];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q) ||
          (l.category || "").toLowerCase().includes(q)
      );
    }
    if (category !== "all") result = result.filter((l) => l.category === category);
    if (city !== "all") result = result.filter((l) => l.supplierCity === city);

    return result;
  }, [listings, search, category, city]);

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
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-projects-title">
          الموردين المحليين
        </h1>
        <p className="text-muted-foreground text-base">
          اكتشف موردين محليين موثوقين وتواصل معهم مباشرة
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مورد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 h-11 rounded-xl bg-card border-border/60"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px] h-11 rounded-xl bg-card border-border/60" data-testid="select-category">
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

      <p className="text-sm text-muted-foreground" data-testid="text-projects-count">
        {filtered.length} مورد متاح
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="لا يوجد موردين حالياً"
          description="سيتم إضافة موردين جدد قريباً"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Card
      className="group overflow-hidden rounded-2xl border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
      data-testid={`card-listing-${listing.id}`}
    >
      <CardContent className="p-0">
        <div className="relative h-52 bg-muted/50 overflow-hidden">
          {hasImage(listing.imageUrl) ? (
            <img
              src={listing.imageUrl as string}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center ${pickAvatarColor(listing.id || listing.title).bg} ${pickAvatarColor(listing.id || listing.title).text}`}
            >
              <span className="text-6xl font-bold">{getInitial(listing.title)}</span>
            </div>
          )}
          {listing.category && (
            <div className="absolute top-3 start-3">
              <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-0 text-xs px-2.5 py-1 shadow-sm">
                <Tag className="w-3 h-3 me-1 text-primary" />
                {listing.category}
              </Badge>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <h3
              className="font-bold text-lg leading-snug line-clamp-1"
              data-testid={`text-listing-title-${listing.id}`}
            >
              {listing.title}
            </h3>

            {listing.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {listing.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {listing.supplierCity && (
              <span className="flex items-center gap-1" data-testid={`text-city-${listing.id}`}>
                <MapPin className="w-3.5 h-3.5 text-primary/70" />
                {listing.supplierCity}
              </span>
            )}
            {listing.supplierType && (
              <span className="flex items-center gap-1" data-testid={`text-type-${listing.id}`}>
                <Store className="w-3.5 h-3.5 text-primary/70" />
                {listing.supplierType}
              </span>
            )}
          </div>

          <Button
            variant="default"
            size="sm"
            className="w-full h-10 rounded-xl font-medium text-sm"
            asChild
          >
            <Link href={`/listings/${listing.id}`} data-testid={`button-view-details-${listing.id}`}>
              عرض التفاصيل
              <ChevronLeft className="w-4 h-4 ms-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
