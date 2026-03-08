import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

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
        <Button
          size="icon"
          variant="ghost"
          onClick={logout}
          aria-label="تسجيل الخروج"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
