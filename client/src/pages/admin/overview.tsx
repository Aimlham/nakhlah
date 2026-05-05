import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Banknote, Clock, CreditCard, UserCog, Sparkles } from "lucide-react";
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
  activationSource: string;
  manualActivationReason: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface OverviewData {
  activeSubscribers: number;
  paidActiveSubscribers: number;
  manualActiveSubscribers: number;
  totalRevenueRiyal: string;
  todayRevenueRiyal: string;
  recentSubscribers: RecentSubscriber[];
}

const REASON_OPTIONS = [
  { value: "معلن", label: "معلن" },
  { value: "تجربة", label: "تجربة" },
  { value: "شريك", label: "شريك" },
  { value: "دعم", label: "دعم" },
  { value: "أخرى", label: "أخرى" },
];

export default function AdminOverviewPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/admin/overview"],
  });

  const [cancelTarget, setCancelTarget] = useState<RecentSubscriber | null>(null);
  const [refundTarget, setRefundTarget] = useState<RecentSubscriber | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualDays, setManualDays] = useState("");
  const [manualReason, setManualReason] = useState("معلن");
  const [manualReasonCustom, setManualReasonCustom] = useState("");

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

  const manualActivateMutation = useMutation({
    mutationFn: async (payload: { email: string; durationDays?: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/admin/subscriptions/manual-activate", payload);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message || "تم التفعيل يدويًا بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      setManualOpen(false);
      setManualEmail("");
      setManualDays("");
      setManualReason("معلن");
      setManualReasonCustom("");
    },
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: err.message || "فشل التفعيل اليدوي",
        variant: "destructive",
      });
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

  const overview =
    data || {
      activeSubscribers: 0,
      paidActiveSubscribers: 0,
      manualActiveSubscribers: 0,
      totalRevenueRiyal: "0.00",
      todayRevenueRiyal: "0.00",
      recentSubscribers: [],
    };

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

  function isExpired(sub: RecentSubscriber): boolean {
    if (!sub.expiresAt) return false;
    return new Date(sub.expiresAt).getTime() < Date.now();
  }

  function handleManualSubmit() {
    const finalReason = manualReason === "أخرى" ? manualReasonCustom.trim() : manualReason;
    if (!manualEmail.trim()) {
      toast({ title: "البريد الإلكتروني مطلوب", variant: "destructive" });
      return;
    }
    if (!finalReason) {
      toast({ title: "السبب مطلوب", variant: "destructive" });
      return;
    }
    const days = manualDays.trim() ? Number(manualDays) : undefined;
    if (manualDays.trim() && (Number.isNaN(days) || (days as number) < 0)) {
      toast({ title: "مدة التفعيل غير صالحة", variant: "destructive" });
      return;
    }
    manualActivateMutation.mutate({
      email: manualEmail.trim(),
      durationDays: days,
      reason: finalReason,
    });
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-admin-overview-title">
          إحصائيات الاشتراكات
        </h1>
        <Button
          onClick={() => setManualOpen(true)}
          data-testid="button-manual-activate-open"
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          تفعيل يدوي
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-xs text-muted-foreground mt-1">
                  <span data-testid="text-paid-active">{overview.paidActiveSubscribers}</span> مدفوع •{" "}
                  <span data-testid="text-manual-active">{overview.manualActiveSubscribers}</span> يدوي
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مشتركين مدفوعين</p>
                <p className="text-3xl font-bold mt-1" data-testid="text-paid-subscribers">
                  {overview.paidActiveSubscribers}
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
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">المصدر</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">المبلغ</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">التاريخ</th>
                    <th className="text-start py-3 px-3 font-semibold text-muted-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentSubscribers.map((sub, i) => {
                    const manual = sub.activationSource === "manual";
                    const expired = isExpired(sub);
                    return (
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
                          {expired && (
                            <Badge variant="outline" className="text-xs ms-1 border-amber-500/40 text-amber-600 dark:text-amber-400">منتهي</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {manual ? (
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs gap-1 border-purple-500/40 text-purple-600 dark:text-purple-400 w-fit"
                                data-testid={`badge-source-manual-${i}`}
                              >
                                <UserCog className="w-3 h-3" />
                                يدوي
                              </Badge>
                              {sub.manualActivationReason && (
                                <span className="text-xs text-muted-foreground" data-testid={`text-manual-reason-${i}`}>
                                  {sub.manualActivationReason}
                                </span>
                              )}
                              {sub.expiresAt && (
                                <span className="text-[10px] text-muted-foreground" dir="ltr">
                                  حتى {new Date(sub.expiresAt).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1" data-testid={`badge-source-paid-${i}`}>
                              <CreditCard className="w-3 h-3" />
                              مدفوع
                            </Badge>
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
                              title={
                                manual
                                  ? "تفعيل يدوي — لا يوجد دفع للاسترجاع"
                                  : !sub.hasMoyasarPayment
                                  ? "لا يوجد معرف دفع — الاسترجاع غير متاح"
                                  : sub.refundStatus === "refunded"
                                  ? "تم الاسترجاع مسبقا"
                                  : sub.refundStatus === "processing"
                                  ? "جاري الاسترجاع"
                                  : ""
                              }
                            >
                              استرجاع المبلغ
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفعيل يدوي لاشتراك برو</DialogTitle>
            <DialogDescription>
              سيتم تفعيل الحساب على باقة "نخلة برو" بدون عملية دفع. لن يُحتسب ضمن الإيرادات.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="manual-email">البريد الإلكتروني للمستخدم</Label>
              <Input
                id="manual-email"
                type="email"
                dir="ltr"
                placeholder="user@example.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                data-testid="input-manual-email"
              />
              <p className="text-xs text-muted-foreground">
                يجب أن يكون المستخدم مسجل دخول مسبقًا.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-days">مدة التفعيل (بالأيام، اتركها فارغة للتفعيل الدائم)</Label>
              <Input
                id="manual-days"
                type="number"
                min={0}
                placeholder="مثال: 30"
                value={manualDays}
                onChange={(e) => setManualDays(e.target.value)}
                data-testid="input-manual-days"
              />
            </div>

            <div className="space-y-2">
              <Label>سبب التفعيل</Label>
              <Select value={manualReason} onValueChange={setManualReason}>
                <SelectTrigger data-testid="select-manual-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} data-testid={`option-reason-${opt.value}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {manualReason === "أخرى" && (
                <Input
                  placeholder="اكتب السبب"
                  value={manualReasonCustom}
                  onChange={(e) => setManualReasonCustom(e.target.value)}
                  data-testid="input-manual-reason-custom"
                />
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setManualOpen(false)} data-testid="button-manual-cancel">
              تراجع
            </Button>
            <Button
              onClick={handleManualSubmit}
              disabled={manualActivateMutation.isPending}
              data-testid="button-manual-confirm"
            >
              {manualActivateMutation.isPending ? "جاري التفعيل..." : "تأكيد التفعيل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
