import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: sub } = useQuery<{ status: string; plan?: string }>({
    queryKey: ["/api/payments/subscription"],
  });
  const isActive = sub?.status === "active";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة تفضيلات حسابك.</p>
      </div>

      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الملف الشخصي</CardTitle>
            <CardDescription>معلومات حسابك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">الاسم الكامل</Label>
              <Input
                id="settings-name"
                defaultValue={user?.fullName || ""}
                placeholder="اسمك"
                data-testid="input-settings-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">البريد الإلكتروني</Label>
              <Input
                id="settings-email"
                defaultValue={user?.email || ""}
                disabled
                data-testid="input-settings-email"
              />
            </div>
            <Button data-testid="button-save-settings">حفظ التغييرات</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الاشتراك</CardTitle>
            <CardDescription>
              {isActive ? "اشتراكك نشط" : "لا يوجد اشتراك نشط حالياً"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isActive && (
              <div className="flex items-center gap-2">
                <Badge data-testid="badge-plan-name">نخلة برو</Badge>
                <span className="text-sm text-muted-foreground">99 ريال / شهرياً</span>
              </div>
            )}
            {!isActive && (
              <Button asChild data-testid="link-upgrade-plan">
                <Link href="/pricing">اشترك الآن</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
