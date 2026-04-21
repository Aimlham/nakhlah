import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  ImageIcon,
  Copy,
} from "lucide-react";
import type { SupplierProduct } from "@shared/schema";

export default function AdminSupplierProductsPage() {
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<SupplierProduct[]>({
    queryKey: ["/api/admin/supplier-products"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/supplier-products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/supplier-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-products"] });
      toast({ title: "تم حذف المنتج" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف المنتج", variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (product: SupplierProduct) => {
      const body = {
        title: `${product.title} (نسخة)`,
        imageUrl: product.imageUrl,
        description: product.description,
        category: product.category,
        supplierId: product.supplierId,
        status: "draft" as const,
        supplierPrice: product.supplierPrice,
        suggestedSellPrice: product.suggestedSellPrice,
        estimatedMargin: product.estimatedMargin,
        dozenPrice: product.dozenPrice,
        minimumOrderQuantity: product.minimumOrderQuantity,
      };
      await apiRequest("POST", "/api/admin/supplier-products", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/supplier-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-products"] });
      toast({ title: "تم نسخ المنتج", description: "النسخة محفوظة كمسودة — عدّلها ثم انشرها" });
    },
    onError: () => {
      toast({ title: "خطأ في نسخ المنتج", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-products-title">إدارة المنتجات</h1>
          <p className="text-sm text-muted-foreground mt-1">{products?.length || 0} منتج</p>
        </div>
        <Button className="rounded-xl" asChild>
          <Link href="/admin/products/new" data-testid="button-add-product">
            <Plus className="w-4 h-4 me-2" />
            إضافة منتج
          </Link>
        </Button>
      </div>

      {(!products || products.length === 0) ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد منتجات بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="rounded-xl border-border/50" data-testid={`card-admin-product-${product.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={product.status === "published" ? "default" : "secondary"} className="text-xs">
                        {product.status === "published" ? "منشور" : "مسودة"}
                      </Badge>
                      {product.category && (
                        <Badge variant="outline" className="text-xs">{product.category}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-lg" asChild>
                      <Link href={`/admin/products/${product.id}/edit`} data-testid={`button-edit-product-${product.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      onClick={() => duplicateMutation.mutate(product)}
                      disabled={duplicateMutation.isPending}
                      title="نسخ كقالب"
                      data-testid={`button-duplicate-product-${product.id}`}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-product-${product.id}`}
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
