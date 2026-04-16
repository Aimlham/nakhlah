import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import type { Listing } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  imageUrl: z.string().max(2000).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  category: z.string().max(200).optional().or(z.literal("")),
  supplierName: z.string().max(500).optional().or(z.literal("")),
  supplierPhone: z.string().max(50).optional().or(z.literal("")),
  supplierWhatsapp: z.string().max(50).optional().or(z.literal("")),
  supplierCity: z.string().max(200).optional().or(z.literal("")),
  supplierType: z.string().max(200).optional().or(z.literal("")),
  supplierLocation: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["draft", "published"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function ListingFormPage() {
  const params = useParams<{ id: string }>();
  const isEdit = !!params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: ["/api/admin/listings", params.id],
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      imageUrl: "",
      description: "",
      category: "",
      supplierName: "",
      supplierPhone: "",
      supplierWhatsapp: "",
      supplierCity: "",
      supplierType: "",
      supplierLocation: "",
      status: "draft",
    },
  });

  useEffect(() => {
    if (listing) {
      form.reset({
        title: listing.title || "",
        imageUrl: listing.imageUrl || "",
        description: listing.description || "",
        category: listing.category || "",
        supplierName: listing.supplierName || "",
        supplierPhone: listing.supplierPhone || "",
        supplierWhatsapp: listing.supplierWhatsapp || "",
        supplierCity: listing.supplierCity || "",
        supplierType: listing.supplierType || "",
        supplierLocation: listing.supplierLocation || "",
        status: (listing.status as "draft" | "published") || "draft",
      });
    }
  }, [listing]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const data = {
        ...values,
        imageUrl: values.imageUrl || null,
        description: values.description || null,
        category: values.category || null,
        supplierName: values.supplierName || null,
        supplierPhone: values.supplierPhone || null,
        supplierWhatsapp: values.supplierWhatsapp || null,
        supplierCity: values.supplierCity || null,
        supplierType: values.supplierType || null,
        supplierLocation: values.supplierLocation || null,
      };
      if (isEdit) {
        await apiRequest("PATCH", `/api/admin/listings/${params.id}`, data);
      } else {
        await apiRequest("POST", "/api/admin/listings", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/listings"] });
      toast({ title: isEdit ? "تم تحديث البوست" : "تم إنشاء البوست" });
      navigate("/admin/listings");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] rounded-md" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="/admin/listings" data-testid="link-back-to-listings">
            <ArrowRight className="w-4 h-4" />
          </a>
        </Button>
        <h1 className="text-xl font-bold" data-testid="text-form-title">
          {isEdit ? "تعديل البوست" : "إضافة بوست جديد"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات البوست</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="عنوان المشروع" data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رابط الصورة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." dir="ltr" data-testid="input-image-url" />
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
                      <Textarea {...field} placeholder="وصف المشروع" rows={3} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التصنيف</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: ملابس" data-testid="input-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مدينة المورد</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: الرياض" data-testid="input-supplier-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المورد</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="اسم المورد" data-testid="input-supplier-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع المورد</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: مصنع، تاجر جملة" data-testid="input-supplier-type" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+966..." dir="ltr" data-testid="input-supplier-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierWhatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>واتساب</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+966..." dir="ltr" data-testid="input-supplier-whatsapp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="supplierLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>موقع المورد (رابط خرائط Google)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://maps.google.com/..." dir="ltr" data-testid="input-supplier-location" />
                    </FormControl>
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
                        <SelectTrigger data-testid="select-status">
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

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={mutation.isPending} data-testid="button-save-listing">
                  {mutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin me-1" />
                  ) : (
                    <Save className="w-4 h-4 me-1" />
                  )}
                  {isEdit ? "حفظ التعديلات" : "إنشاء البوست"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
