import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();

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
            <CardTitle className="text-base">الباقة</CardTitle>
            <CardDescription>أنت حالياً على الباقة المجانية</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/pricing" data-testid="link-upgrade-plan">عرض الباقات</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
