import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, BookmarkCheck, MapPin, Store, Tag, ImageIcon } from "lucide-react";
import type { Listing, SupplierProductWithSupplier } from "@shared/schema";
import { hasImage, pickAvatarColor, getInitial } from "@/lib/category-image";

export default function SavedProductsPage() {
  const { toast } = useToast();

  const { data: savedProducts, isLoading: loadingProducts } = useQuery<SupplierProductWithSupplier[]>({
    queryKey: ["/api/saved", "supplier-products"],
    queryFn: async () => {
      // saved products endpoint returns legacy products; we want supplier-products
      // Use saved IDs and resolve them client-side via /api/supplier-products
      const idsRes = await apiRequest("GET", "/api/saved/ids");
      const idsData = await idsRes.json();
      const ids: string[] = idsData.savedProductIds || [];
      if (ids.length === 0) return [];
      const allRes = await apiRequest("GET", "/api/supplier-products");
      const all: SupplierProductWithSupplier[] = await allRes.json();
      return all.filter((p) => ids.includes(p.id));
    },
  });

  const { data: savedListings, isLoading: loadingListings } = useQuery<Listing[]>({
    queryKey: ["/api/saved", "listings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/saved/listings");
      return res.json();
    },
  });

  const { data: savedData } = useQuery<{ savedProductIds: string[]; savedListingIds: string[] }>({
    queryKey: ["/api/saved", "ids"],
  });
  const savedProductIds = new Set(savedData?.savedProductIds || []);
  const savedListingIds = new Set(savedData?.savedListingIds || []);

  const toggleSaveProduct = useMutation({
    mutationFn: async (productId: string) => {
      if (savedProductIds.has(productId)) {
        await apiRequest("DELETE", `/api/saved/${productId}`);
      } else {
        await apiRequest("POST", `/api/saved/${productId}`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved"] }),
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const toggleSaveListing = useMutation({
    mutationFn: async (listingId: string) => {
      if (savedListingIds.has(listingId)) {
        await apiRequest("DELETE", `/api/saved/listings/${listingId}`);
      } else {
        await apiRequest("POST", `/api/saved/listings/${listingId}`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved"] }),
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const products = savedProducts || [];
  const listings = savedListings || [];
  const factories = listings.filter((l) => {
    const t = (l.supplierType || "").toLowerCase();
    return t.includes("مصنع") || t.includes("تصنيع");
  });
  const suppliersOnly = listings.filter((l) => !factories.includes(l));

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      <div className="space-y-1.5 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-saved-title">
          المحفوظات
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          المنتجات والموردين والمصانع التي حفظتها للرجوع لها لاحقاً
        </p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md" data-testid="tabs-saved">
          <TabsTrigger value="products" data-testid="tab-saved-products">
            المنتجات ({products.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-saved-suppliers">
            الموردين ({suppliersOnly.length})
          </TabsTrigger>
          <TabsTrigger value="factories" data-testid="tab-saved-factories">
            المصانع ({factories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          {loadingProducts ? (
            <SkeletonGrid />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="لا توجد منتجات محفوظة"
              description="تصفّح الموردين واحفظ ما يهمّك."
              actionLabel="تصفّح الموردين"
              actionHref="/suppliers"
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {products.map((p) => (
                <SavedProductCard
                  key={p.id}
                  product={p}
                  isSaved
                  onToggle={() => toggleSaveProduct.mutate(p.id)}
                  pending={toggleSaveProduct.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          {loadingListings ? (
            <SkeletonGrid />
          ) : suppliersOnly.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="لا يوجد موردين محفوظين"
              description="تصفّح الموردين واحفظ من تختار."
              actionLabel="تصفّح الموردين"
              actionHref="/suppliers"
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {suppliersOnly.map((l) => (
                <SavedListingCard
                  key={l.id}
                  listing={l}
                  isSaved
                  onToggle={() => toggleSaveListing.mutate(l.id)}
                  pending={toggleSaveListing.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="factories" className="mt-6">
          {loadingListings ? (
            <SkeletonGrid />
          ) : factories.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="لا يوجد مصانع محفوظة"
              description="تصفّح المصانع واحفظ من تختار."
              actionLabel="تصفّح المصانع"
              actionHref="/factories"
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {factories.map((l) => (
                <SavedListingCard
                  key={l.id}
                  listing={l}
                  isSaved
                  onToggle={() => toggleSaveListing.mutate(l.id)}
                  pending={toggleSaveListing.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="aspect-[4/5] rounded-xl sm:rounded-2xl" />
      ))}
    </div>
  );
}

function SavedProductCard({
  product,
  isSaved,
  onToggle,
  pending,
}: {
  product: SupplierProductWithSupplier;
  isSaved: boolean;
  onToggle: () => void;
  pending: boolean;
}) {
  return (
    <div className="relative group" data-testid={`card-saved-product-${product.id}`}>
      <Link href={`/products/${product.id}`}>
        <Card className="overflow-hidden rounded-xl sm:rounded-2xl border-border/50 hover:border-primary/30 transition-all cursor-pointer">
          <CardContent className="p-0">
            <div className="relative aspect-[4/5] bg-muted/50 overflow-hidden">
              {hasImage(product.imageUrl) ? (
                <img
                  src={product.imageUrl as string}
                  alt={product.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              {product.category && (
                <div className="absolute top-2 start-2 sm:top-3 sm:start-3">
                  <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-1">
                    <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 me-1 text-primary" />
                    {product.category}
                  </Badge>
                </div>
              )}
            </div>
            <div className="p-2.5 sm:p-4">
              <h3 className="font-semibold text-sm sm:text-base line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">{product.title}</h3>
            </div>
          </CardContent>
        </Card>
      </Link>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        disabled={pending}
        aria-label={isSaved ? "إلغاء الحفظ" : "حفظ"}
        className="absolute top-2 end-2 sm:top-3 sm:end-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-sm hover:bg-background transition-all disabled:opacity-50"
        data-testid={`button-unsave-product-${product.id}`}
      >
        <BookmarkCheck className="w-4 h-4 text-primary" />
      </button>
    </div>
  );
}

function SavedListingCard({
  listing,
  isSaved,
  onToggle,
  pending,
}: {
  listing: Listing;
  isSaved: boolean;
  onToggle: () => void;
  pending: boolean;
}) {
  return (
    <div className="relative group" data-testid={`card-saved-listing-${listing.id}`}>
      <Link href={`/suppliers/${listing.id}`}>
        <Card className="overflow-hidden rounded-xl sm:rounded-2xl border-border/50 hover:border-primary/30 transition-all cursor-pointer">
          <CardContent className="p-0">
            <div className="relative aspect-[4/5] bg-muted/50 overflow-hidden">
              {hasImage(listing.imageUrl) ? (
                <img
                  src={listing.imageUrl as string}
                  alt={listing.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className={`absolute inset-0 flex items-center justify-center ${pickAvatarColor(listing.id || listing.title).bg} ${pickAvatarColor(listing.id || listing.title).text}`}
                >
                  <span className="text-6xl font-bold">{getInitial(listing.title)}</span>
                </div>
              )}
              {listing.supplierType && (
                <div className="absolute top-2 start-2 sm:top-3 sm:start-3">
                  <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-0 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2.5 sm:py-1">
                    <Store className="w-2.5 h-2.5 sm:w-3 sm:h-3 me-1 text-primary" />
                    {listing.supplierType}
                  </Badge>
                </div>
              )}
            </div>
            <div className="p-2.5 sm:p-4 space-y-1.5">
              <h3 className="font-semibold text-sm sm:text-base line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">{listing.title}</h3>
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
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        disabled={pending}
        aria-label={isSaved ? "إلغاء الحفظ" : "حفظ"}
        className="absolute top-2 end-2 sm:top-3 sm:end-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-sm hover:bg-background transition-all disabled:opacity-50"
        data-testid={`button-unsave-listing-${listing.id}`}
      >
        <BookmarkCheck className="w-4 h-4 text-primary" />
      </button>
    </div>
  );
}
