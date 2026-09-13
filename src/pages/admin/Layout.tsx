import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "@/lib/data-hooks.tsx";
import { useQuery } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import {
  LayoutDashboard, ArrowDownLeft, ArrowUpRight, Users,
  Package, CreditCard, FileText, ChevronLeft, MessageCircle, Menu, X
} from "lucide-react";
import { Link } from "react-router-dom";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/deposits", label: "Deposits", icon: ArrowDownLeft },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/plans", label: "Plans", icon: Package },
  { to: "/admin/payment-accounts", label: "Payment Accounts", icon: CreditCard },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { to: "/admin/support", label: "Support", icon: MessageCircle },
];

const MOBILE_PRIMARY_NAV = ADMIN_NAV.slice(0, 4).map((item, index) => ({
  ...item,
  label: index === 0 ? "Home" : item.label,
}));
const MOBILE_MORE_NAV = ADMIN_NAV.slice(4);

function AdminGuard({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.getCurrentUser);
  if (user === undefined) return <div className="p-6"><Skeleton className="h-12 w-full" /></div>;
  if (!user?.isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AdminNavItems() {
  const unreadSupport = useQuery(api.support.adminTotalUnread);

  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
      {ADMIN_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
              isActive
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )
          }
        >
          <item.icon size={15} />
          <span className="flex-1">{item.label}</span>
          {item.label === "Support" && (unreadSupport ?? 0) > 0 && (
            <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {unreadSupport}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const isMoreActive = MOBILE_MORE_NAV.some((item) => pathname === item.to);

  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Skeleton className="h-12 w-48" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <Navigate to="/" replace />
      </Unauthenticated>
      <Authenticated>
        <AdminGuard>
          <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden md:flex w-56 flex-col bg-sidebar border-r border-sidebar-border">
              <div className="px-5 py-4 border-b border-sidebar-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">Admin Panel</p>
                <p className="text-xl font-bold text-foreground mt-0.5">VALTORA</p>
              </div>
              <AdminNavItems />
              <div className="px-3 pb-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft size={14} /> Back to Dashboard
                </Link>
              </div>
            </aside>
            <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
              <Outlet />
            </main>
            <nav
              className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-sidebar/95 backdrop-blur-xl md:hidden"
              aria-label="Admin primary navigation"
            >
              {MOBILE_PRIMARY_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )}
                >
                  {({ isActive }) => <>
                    {isActive && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" />}
                    <span className={cn("rounded-xl p-1.5", isActive && "bg-primary/15")}><item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} /></span>
                    {item.label}
                  </>}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors",
                  isMoreActive ? "text-primary" : "text-muted-foreground/70"
                )}
                aria-label="Open more admin navigation"
              >
                {isMoreActive && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary" />}
                <span className={cn("rounded-xl p-1.5", isMoreActive && "bg-primary/15")}><Menu size={20} strokeWidth={isMoreActive ? 2.5 : 1.8} /></span>
                More
              </button>
            </nav>

            {moreOpen && <>
              <button className="fixed inset-0 z-40 bg-black/60 md:hidden" aria-label="Close more navigation" onClick={() => setMoreOpen(false)} />
              <section className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-sidebar p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl md:hidden" aria-label="More admin navigation">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">More</p>
                  <button type="button" onClick={() => setMoreOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" aria-label="Close more navigation"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MOBILE_MORE_NAV.map((item) => (
                    <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)}
                      className={({ isActive }) => cn(
                        "relative flex min-h-20 flex-col justify-center gap-2 rounded-2xl border px-4 text-sm font-medium",
                        isActive ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-sidebar-accent/30 text-sidebar-foreground"
                      )}>
                      <item.icon size={19} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
                <Link to="/dashboard" onClick={() => setMoreOpen(false)} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><ChevronLeft size={16} /> Back to Dashboard</Link>
              </section>
            </>}
          </div>
        </AdminGuard>
      </Authenticated>
    </>
  );
}
