import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  MapPin,
  Tag,
  User,
  Phone,
  MessageCircle,
  MapPinned,
  Lock,
  ImageIcon,
} from "lucide-react";
import type { Listing } from "@shared/schema";

interface ListingDetailPageProps {
  isSubscribed: boolean;
}

export default function ListingDetailPage({ isSubscribed }: ListingDetailPageProps) {
  const params = useParams<{ id: string }>();

  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: ["/api/listings", params.id],
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground text-lg">لم يتم العثور على هذا المورد</p>
        <Button variant="outline" asChild>
          <Link href="/projects" data-testid="link-back-to-projects">
            <ArrowRight className="w-4 h-4 me-2" />
            العودة للموردين
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/projects" data-testid="link-back-to-projects">
          <ArrowRight className="w-4 h-4 me-1" />
          العودة للموردين
        </Link>
      </Button>

      <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-muted">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-bold" data-testid="text-listing-detail-title">
          {listing.title}
        </h1>

        <div className="flex flex-wrap gap-2">
          {listing.category && (
            <Badge variant="secondary" className="text-sm font-normal">
              <Tag className="w-3.5 h-3.5 me-1.5" />
              {listing.category}
            </Badge>
          )}
          {listing.supplierCity && (
            <Badge variant="outline" className="text-sm font-normal">
              <MapPin className="w-3.5 h-3.5 me-1.5" />
              {listing.supplierCity}
            </Badge>
          )}
          {listing.supplierType && (
            <Badge variant="outline" className="text-sm font-normal">
              <User className="w-3.5 h-3.5 me-1.5" />
              {listing.supplierType}
            </Badge>
          )}
        </div>

        {listing.description && (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap" data-testid="text-listing-description">
                {listing.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            بيانات المورد
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSubscribed ? (
            <div className="space-y-4">
              {listing.supplierName && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">اسم المورد</p>
                    <p className="font-medium" data-testid="text-supplier-name">{listing.supplierName}</p>
                  </div>
                </div>
              )}

              {listing.supplierPhone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                    <a
                      href={`tel:${listing.supplierPhone}`}
                      className="font-medium text-primary hover:underline"
                      dir="ltr"
                      data-testid="link-supplier-phone"
                    >
                      {listing.supplierPhone}
                    </a>
                  </div>
                </div>
              )}

              {listing.supplierWhatsapp && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">واتساب</p>
                    <a
                      href={`https://wa.me/${listing.supplierWhatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-600 hover:underline"
                      dir="ltr"
                      data-testid="link-supplier-whatsapp"
                    >
                      {listing.supplierWhatsapp}
                    </a>
                  </div>
                </div>
              )}

              {listing.supplierLocation && (
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a
                    href={listing.supplierLocation}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-supplier-location"
                  >
                    <MapPinned className="w-4 h-4 me-2" />
                    عرض موقع المورد
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {["اسم المورد", "رقم الهاتف", "واتساب", "موقع المورد"].map((label) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <div className="h-5 w-32 rounded bg-muted/80 blur-[6px]" />
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  اشترك في نخلة برو للوصول لبيانات التواصل مع المورد
                </p>
                <Button className="w-full" asChild>
                  <Link href="/pricing" data-testid="button-subscribe-detail">
                    اشترك لعرض بيانات المورد
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
