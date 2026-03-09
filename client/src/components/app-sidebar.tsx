import { Link, useLocation } from "wouter";
import { LayoutDashboard, Bookmark, CreditCard, Settings, Megaphone, Trophy } from "lucide-react";
import nakhlahLogo from "@assets/nakhlah-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { title: "لوحة التحكم", url: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { title: "مكتبة الإعلانات", url: "/ads", icon: Megaphone, key: "ads" },
  { title: "المنتجات الرابحة", url: "/products", icon: Trophy, key: "products" },
  { title: "المحفوظة", url: "/saved", icon: Bookmark, key: "saved" },
  { title: "الأسعار", url: "/pricing", icon: CreditCard, key: "pricing" },
  { title: "الإعدادات", url: "/settings", icon: Settings, key: "settings" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar side="right">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src={nakhlahLogo} alt="نخلة" className="w-8 h-8 rounded-md object-contain" />
          <span className="text-lg font-semibold tracking-tight" data-testid="text-brand-name">
            نخلة
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>التنقل</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/dashboard" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} data-testid={`link-nav-${item.key}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(user.fullName || user.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate" data-testid="text-sidebar-username">
                {user.fullName || user.email}
              </span>
              <span className="text-xs text-muted-foreground truncate">الباقة المجانية</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
