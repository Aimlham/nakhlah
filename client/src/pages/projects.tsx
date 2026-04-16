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
  User,
  ImageIcon,
  ChevronLeft,
} from "lucide-react";
import type { Listing } from "@shared/schema";

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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-projects-title">
          الموردين المحليين
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          اكتشف موردين محليين موثوقين وتواصل معهم مباشرة
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مورد..."
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
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="w-[160px]" data-testid="select-city">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      className="group overflow-hidden border-border/40 hover:border-border hover:shadow-md transition-all duration-200"
      data-testid={`card-listing-${listing.id}`}
    >
      <CardContent className="p-0">
        <div className="relative h-48 bg-muted flex items-center justify-center overflow-hidden">
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3
            className="font-semibold text-base leading-snug line-clamp-1"
            data-testid={`text-listing-title-${listing.id}`}
          >
            {listing.title}
          </h3>

          {listing.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {listing.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {listing.category && (
              <Badge variant="secondary" className="text-xs font-normal">
                <Tag className="w-3 h-3 me-1" />
                {listing.category}
              </Badge>
            )}
            {listing.supplierCity && (
              <Badge variant="outline" className="text-xs font-normal">
                <MapPin className="w-3 h-3 me-1" />
                {listing.supplierCity}
              </Badge>
            )}
            {listing.supplierType && (
              <Badge variant="outline" className="text-xs font-normal">
                <User className="w-3 h-3 me-1" />
                {listing.supplierType}
              </Badge>
            )}
          </div>

          <Button variant="default" size="sm" className="w-full mt-1" asChild>
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
