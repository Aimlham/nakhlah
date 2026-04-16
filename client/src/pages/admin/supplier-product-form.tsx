import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAccessToken } from "@/lib/supabase";
import { ArrowRight, Upload, Loader2, ImageIcon } from "lucide-react";
import { Link } from "wouter";
import type { SupplierProduct, Category, Listing } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "اسم المنتج مطلوب"),
  description: z.string().optional(),
  category: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function SupplierProductFormPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEdit = !!params.id;
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: existing, isLoading: loadingExisting } = useQuery<SupplierProduct>({
    queryKey: ["/api/admin/supplier-products", params.id],
    enabled: isEdit,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: suppliers } = useQuery<Listing[]>({
    queryKey: ["/api/admin/listings"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      supplierId: "",
      status: "draft",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        title: existing.title,
        description: existing.description || "",
        category: existing.category || "",
        supplierId: existing.supplierId || "",
        status: (existing.status as "draft" | "published") || "draft",
      });
      setImageUrl(existing.imageUrl || null);
    }
  }, [existing, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = { ...values, imageUrl };
      if (isEdit) {
        await apiRequest("PATCH", `/api/admin/supplier-products/${params.id}`, body);
      } else {
        await apiRequest("POST", `/api/admin/supplier-products`, body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/supplier-products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/supplier-products"] });
      toast({ title: isEdit ? "تم تحديث المنتج" : "تم إضافة المنتج" });
      setLocation("/admin/products");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/admin/products" data-testid="link-back-admin-products">
            <ArrowRight className="w-4 h-4 me-1" />
            العودة
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold" data-testid="text-product-form-title">
        {isEdit ? "تعديل المنتج" : "إضافة منتج جديد"}
      </h1>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">صورة المنتج</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-muted/50 overflow-hidden border border-border/50 flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="input-product-image" />
                      <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={uploading} asChild>
                        <span>
                          {uploading ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Upload className="w-4 h-4 me-2" />}
                          {uploading ? "جاري الرفع..." : "رفع صورة"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المنتج</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-lg" data-testid="input-product-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} className="rounded-lg resize-none" data-testid="input-product-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التصنيف</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg" data-testid="select-product-category">
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories || []).map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المورد</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg" data-testid="select-product-supplier">
                          <SelectValue placeholder="اختر المورد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(suppliers || []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg" data-testid="select-product-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="published">منشور</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 rounded-xl" disabled={mutation.isPending} data-testid="button-save-product">
                {mutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : null}
                {isEdit ? "حفظ التغييرات" : "إضافة المنتج"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
