import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, CalendarCheck, CalendarDays, BookOpen, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/today", label: "Today", icon: CalendarCheck },
  { to: "/calendar", label: "History", icon: CalendarDays },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthedLayout() {
  const location = useLocation();
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background">
      <main className="min-h-screen pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border/70 bg-card/90 backdrop-blur-xl">
        <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[0.68rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
