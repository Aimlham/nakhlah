import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, LogIn, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between gap-1 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleTheme}
          aria-label="تبديل المظهر"
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        {user ? (
          <>
            <span
              className="hidden sm:inline-block text-sm text-muted-foreground max-w-[160px] truncate px-2"
              data-testid="text-topbar-username"
            >
              {user.fullName || user.email}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 ms-1" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </Button>
          </>
        ) : (
          <>
            <Button asChild size="sm" variant="ghost" data-testid="button-login">
              <Link href="/login">
                <LogIn className="w-4 h-4 ms-1" />
                تسجيل الدخول
              </Link>
            </Button>
            <Button asChild size="sm" data-testid="button-signup">
              <Link href="/signup">
                <UserPlus className="w-4 h-4 ms-1" />
                إنشاء حساب
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
