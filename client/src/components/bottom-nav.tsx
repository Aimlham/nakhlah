import { Link, useLocation } from "wouter";
import { Package, Store, Factory, Bookmark, User, LogIn } from "lucide-react";
// Note: "المنتجات" intentionally hidden from bottom nav — page still accessible at /products
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  url: string;
  icon: typeof Package;
  key: string;
  match?: (loc: string) => boolean;
};

const baseItems: NavItem[] = [
  { title: "الموردين", url: "/suppliers", icon: Store, key: "suppliers" },
  { title: "المصانع", url: "/factories", icon: Factory, key: "factories" },
  { title: "المحفوظات", url: "/saved", icon: Bookmark, key: "saved" },
];

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const accountItem: NavItem = user
    ? { title: "حسابي", url: "/settings", icon: User, key: "account" }
    : { title: "دخول", url: "/login", icon: LogIn, key: "login" };

  const items = [...baseItems, accountItem];

  return (
    <nav
      role="navigation"
      aria-label="التنقل السفلي"
      data-testid="nav-bottom"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-around h-16">
        {items.map((item) => {
          const isActive =
            location === item.url || location.startsWith(item.url + "/");
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.url}
                data-testid={`link-bottom-nav-${item.key}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full w-full text-[11px] font-medium transition-colors active:scale-95",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isActive && "scale-110",
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span className="leading-none">{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
