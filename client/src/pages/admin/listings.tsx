import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FolderOpen,
  MapPin,
} from "lucide-react";
import type { Listing } from "@shared/schema";
import { hasImage, pickAvatarColor, getInitial } from "@/lib/category-image";

export default function AdminListingsPage() {
  const { toast } = useToast();

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/admin/listings"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/listings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      toast({ title: "تم حذف البوست" });
    },
    onError: () => {
      toast({ title: "فشل الحذف", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/admin/listings/${id}`, {
        status: status === "published" ? "draft" : "published",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      toast({ title: "تم تحديث الحالة" });
    },
    onError: () => {
      toast({ title: "فشل التحديث", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-listings-title">
            إدارة الموردين والمصانع
          </h1>
          <p className="text-muted-foreground mt-1">
            {listings?.length || 0} بوست
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/listings/import" data-testid="link-import-from-image">
              <Plus className="w-4 h-4 me-1" />
              إضافة من صورة
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/listings/new?type=factory" data-testid="link-add-factory">
              <Plus className="w-4 h-4 me-1" />
              إضافة مصنع
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/listings/new" data-testid="link-add-listing">
              <Plus className="w-4 h-4 me-1" />
              إضافة مورد
            </Link>
          </Button>
        </div>
      </div>

      {!listings || listings.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="لا توجد بوستات"
          description="ابدأ بإضافة أول بوست"
        />
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card key={listing.id} data-testid={`card-admin-listing-${listing.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {hasImage(listing.imageUrl) ? (
                      <img
                        src={listing.imageUrl as string}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${pickAvatarColor(listing.id || listing.title).bg} ${pickAvatarColor(listing.id || listing.title).text}`}
                      >
                        <span className="text-2xl font-bold">{getInitial(listing.title)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {listing.title}
                      </h3>
                      <Badge
                        variant={listing.status === "published" ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {listing.status === "published" ? "منشور" : "مسودة"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {listing.category && <span>{listing.category}</span>}
                      {listing.supplierCity && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {listing.supplierCity}
                        </span>
                      )}
                      {listing.supplierType && <span>{listing.supplierType}</span>}
                    </div>

                    {listing.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {listing.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: listing.id,
                          status: listing.status,
                        })
                      }
                      disabled={toggleStatusMutation.isPending}
                      data-testid={`button-toggle-status-${listing.id}`}
                    >
                      {listing.status === "published" ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/admin/listings/${listing.id}/edit`}
                        data-testid={`link-edit-listing-${listing.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا البوست؟")) {
                          deleteMutation.mutate(listing.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-listing-${listing.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
