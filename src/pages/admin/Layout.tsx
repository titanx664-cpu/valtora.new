import { Outlet, NavLink, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "@/lib/data-hooks.tsx";
import { useQuery } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import {
  LayoutDashboard, ArrowDownLeft, ArrowUpRight, Users,
  Package, CreditCard, FileText, ChevronLeft, MessageCircle
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
            <main className="flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </AdminGuard>
      </Authenticated>
    </>
  );
}
