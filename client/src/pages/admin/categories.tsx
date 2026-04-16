import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import type { Category } from "@shared/schema";

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/admin/categories", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setNewName("");
      toast({ title: "تم إضافة التصنيف" });
    },
    onError: () => {
      toast({ title: "خطأ في إضافة التصنيف", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "تم حذف التصنيف" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف التصنيف", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-admin-categories-title">إدارة التصنيفات</h1>
        <p className="text-sm text-muted-foreground mt-1">{categories?.length || 0} تصنيف</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createMutation.mutate(newName.trim());
        }}
        className="flex gap-3"
      >
        <Input
          placeholder="اسم التصنيف الجديد..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 h-11 rounded-xl"
          data-testid="input-new-category"
        />
        <Button type="submit" className="h-11 rounded-xl px-5" disabled={createMutation.isPending || !newName.trim()} data-testid="button-add-category">
          {createMutation.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Plus className="w-4 h-4 me-2" />}
          إضافة
        </Button>
      </form>

      {(!categories || categories.length === 0) ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <Tag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد تصنيفات بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <Card key={cat.id} className="rounded-xl border-border/50" data-testid={`card-category-${cat.id}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">{cat.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من حذف هذا التصنيف؟")) {
                      deleteMutation.mutate(cat.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-category-${cat.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
