import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Banknote, Clock } from "lucide-react";

interface OverviewData {
  activeSubscribers: number;
  todayRevenueRiyal: string;
  recentSubscribers: {
    email: string;
    plan: string;
    status: string;
    amountRiyal: string;
    createdAt: string;
  }[];
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/admin/overview"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const overview = data || { activeSubscribers: 0, todayRevenueRiyal: "0.00", recentSubscribers: [] };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold" data-testid="text-admin-overview-title">
        إحصائيات الاشتراكات
      </h1>

      <div className="grid sm:grid-cols-2 gap-4">
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
                  </tr>
                </thead>
                <tbody>
                  {overview.recentSubscribers.map((sub, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0" data-testid={`row-subscriber-${i}`}>
                      <td className="py-3 px-3 font-medium" dir="ltr">{sub.email}</td>
                      <td className="py-3 px-3">{sub.plan === "pro" ? "برو" : sub.plan}</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={sub.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {sub.status === "active" ? "نشط" : sub.status === "pending" ? "معلّق" : sub.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3" dir="ltr">{sub.amountRiyal} ر.س</td>
                      <td className="py-3 px-3" dir="ltr">
                        {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
