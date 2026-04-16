import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Banknote, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface RecentSubscriber {
  id: string;
  email: string;
  plan: string;
  status: string;
  amountRiyal: string;
  hasMoyasarPayment: boolean;
  refundStatus: string | null;
  createdAt: string;
}

interface OverviewData {
  activeSubscribers: number;
  totalRevenueRiyal: string;
  todayRevenueRiyal: string;
  recentSubscribers: RecentSubscriber[];
}

export default function AdminOverviewPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/admin/overview"],
  });

  const [cancelTarget, setCancelTarget] = useState<RecentSubscriber | null>(null);
  const [refundTarget, setRefundTarget] = useState<RecentSubscriber | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async (subId: string) => {
      const res = await apiRequest("POST", `/api/admin/subscriptions/${subId}/cancel`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || "تم إلغاء الاشتراك بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setCancelTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message || "فشل إلغاء الاشتراك", variant: "destructive" });
      setCancelTarget(null);
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (subId: string) => {
      const res = await apiRequest("POST", `/api/admin/subscriptions/${subId}/refund`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || "تم استرجاع المبلغ بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setRefundTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message || "فشل استرجاع المبلغ", variant: "destructive" });
      setRefundTarget(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const overview = data || { activeSubscribers: 0, totalRevenueRiyal: "0.00", todayRevenueRiyal: "0.00", recentSubscribers: [] };

  function statusLabel(status: string) {
    if (status === "active") return "نشط";
    if (status === "pending") return "معلّق";
    if (status === "cancelled") return "ملغي";
    return status;
  }

  function statusVariant(status: string): "default" | "secondary" | "destructive" {
    if (status === "active") return "default";
    if (status === "cancelled") return "destructive";
    return "secondary";
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold" data-testid="text-admin-overview-title">
        إحصائيات الاشتراكات
      </h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المشتركين النشطين</p>
                <p className="text-3xl font-bold mt-1" data-testid="text-active-subscribers">
                  {overview.activeSubscribers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Banknote className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الدخل</p>
                <p className="text-3xl font-bold mt-1" dir="ltr" data-testid="text-total-revenue">
                  {overview.totalRevenueRiyal} <span className="text-base font-normal text-muted-foreground">ر.س</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-chart-5/10 flex items-center justify-center flex-shrink-0">
                <Banknote className="w-6 h-6 text-chart-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">دخل اليوم</p>
                <p className="text-3xl font-bold mt-1" dir="ltr" data-testid="text-today-revenue">
                  {overview.todayRevenueRiyal} <span className="text-base font-normal text-muted-foreground">ر.س</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">آخر المشتركين</h2>
          </div>

          {overview.recentSubscribers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">لا يوجد مشتركين بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-recent-subscribers">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">البريد</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">الخطة</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">الحالة</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">المبلغ</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">التاريخ</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentSubscribers.map((sub, i) => (
                    <tr key={sub.id} className="border-b border-border/30 last:border-0" data-testid={`row-subscriber-${i}`}>
                      <td className="py-3 px-3 font-medium" dir="ltr">{sub.email}</td>
                      <td className="py-3 px-3">{sub.plan === "pro" ? "برو" : sub.plan}</td>
                      <td className="py-3 px-3">
                        <Badge variant={statusVariant(sub.status)} className="text-xs">
                          {statusLabel(sub.status)}
                        </Badge>
                        {sub.refundStatus === "refunded" && (
                          <Badge variant="outline" className="text-xs ms-1">مسترجع</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3" dir="ltr">{sub.amountRiyal} ر.س</td>
                      <td className="py-3 px-3" dir="ltr">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            disabled={sub.status === "cancelled" || cancelMutation.isPending}
                            onClick={() => setCancelTarget(sub)}
                            data-testid={`button-cancel-sub-${i}`}
                          >
                            إلغاء الاشتراك
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={!sub.hasMoyasarPayment || sub.refundStatus === "refunded" || sub.refundStatus === "processing" || refundMutation.isPending}
                            onClick={() => setRefundTarget(sub)}
                            data-testid={`button-refund-sub-${i}`}
                            title={!sub.hasMoyasarPayment ? "لا يوجد معرف دفع — الاسترجاع غير متاح" : sub.refundStatus === "refunded" ? "تم الاسترجاع مسبقا" : sub.refundStatus === "processing" ? "جاري الاسترجاع" : ""}
                          >
                            استرجاع المبلغ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء الاشتراك</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء اشتراك {cancelTarget?.email}؟ سيتم تغيير حالة الاشتراك إلى "ملغي" بدون استرجاع المبلغ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)} data-testid="button-cancel-dialog-dismiss">تراجع</Button>
            <Button
              onClick={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-dialog-confirm"
            >
              {cancelMutation.isPending ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refundTarget} onOpenChange={(open) => { if (!open) setRefundTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استرجاع المبلغ</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من استرجاع مبلغ {refundTarget?.amountRiyal} ر.س للمشترك {refundTarget?.email}؟ سيتم إرسال طلب استرجاع إلى بوابة الدفع.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRefundTarget(null)} data-testid="button-refund-dialog-dismiss">تراجع</Button>
            <Button
              variant="destructive"
              onClick={() => refundTarget && refundMutation.mutate(refundTarget.id)}
              disabled={refundMutation.isPending}
              data-testid="button-refund-dialog-confirm"
            >
              {refundMutation.isPending ? "جاري الاسترجاع..." : "تأكيد الاسترجاع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
