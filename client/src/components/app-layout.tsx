import { type ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { BottomNav } from "@/components/bottom-nav";

const sidebarStyle = {
  "--sidebar-width": "16rem",
  "--sidebar-width-icon": "3rem",
} as Record<string, string>;

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <ScrollArea className="flex-1">
            <main className="p-6 pb-24 md:pb-6 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </ScrollArea>
        </div>
      </div>
      <WhatsAppButton />
      <BottomNav />
    </SidebarProvider>
  );
}
