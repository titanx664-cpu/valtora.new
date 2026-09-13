import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "@/lib/data-hooks.tsx";
import { useQuery } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useState } from "react";
import {
  LayoutDashboard, TrendingUp, ArrowDownLeft, ArrowUpRight, Users, BarChart3,
  List, Bell, Settings, Menu, X, Shield, LogOut, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import SupportChat from "./_components/SupportChat.tsx";
import { motion, AnimatePresence } from "motion/react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/deposits", label: "Deposits", icon: ArrowDownLeft },
  { to: "/dashboard/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/commissions", label: "Commissions", icon: TrendingUp },
  { to: "/dashboard/transactions", label: "Transactions", icon: List },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

// 5 most important items for the mobile bottom nav
const BOTTOM_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/dashboard/deposits", label: "Deposits", icon: ArrowDownLeft },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/transactions", label: "History", icon: List },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function DashboardGuard() {
  const navigate = useNavigate();
  const isRegistered = useQuery(api.users.isRegistered);
  if (isRegistered === undefined) return null;
  if (!isRegistered) { navigate("/register"); return null; }
  return null;
}

export default function DashboardLayout() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Skeleton className="h-12 w-48" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="text-3xl font-black text-primary emerald-glow-text">VALTORA</span>
          <p className="text-muted-foreground text-sm">Sign in to access your dashboard</p>
          <SignInButton className="h-12 px-8" />
        </div>
      </Unauthenticated>
      <Authenticated>
        <DashboardGuard />
        <DashboardShell />
      </Authenticated>
    </>
  );
}

function DashboardShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signout } = useAuth();
  const user = useQuery(api.users.getCurrentUser);
  const unreadCount = useQuery(api.financial.getUnreadCount);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <span className="text-xl font-black tracking-tight text-primary emerald-glow-text">VALTORA</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {item.label === "Notifications" && (unreadCount ?? 0) > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{unreadCount}</span>
              )}
            </NavLink>
          ))}
          {user?.isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mt-2 border border-border",
              isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}>
              <Shield size={16} /><span>Admin Panel</span><ChevronRight size={14} className="ml-auto" />
            </NavLink>
          )}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/30">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-sm font-black">
              {user?.name?.charAt(0)?.toUpperCase() ?? "V"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name ?? "Loading..."}</p>
              <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
            </div>
            <button onClick={() => signout()} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col md:hidden">
              <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
                <span className="text-xl font-black text-primary emerald-glow-text">VALTORA</span>
                <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground p-1.5 clay-sm">
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-base font-medium transition-all",
                      isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 active:bg-sidebar-accent/50"
                    )}>
                    <item.icon size={18} />
                    <span className="flex-1">{item.label}</span>
                    {item.label === "Notifications" && (unreadCount ?? 0) > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{unreadCount}</span>
                    )}
                  </NavLink>
                ))}
                {user?.isAdmin && (
                  <NavLink to="/admin" onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-base font-medium transition-all mt-2 border border-border",
                      isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-muted-foreground active:bg-accent"
                    )}>
                    <Shield size={18} /><span>Admin Panel</span><ChevronRight size={14} className="ml-auto" />
                  </NavLink>
                )}
              </nav>
              {/* User at bottom of drawer */}
              <div className="px-4 py-5 border-t border-sidebar-border">
                <div className="clay-sm flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "V"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name ?? "..."}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                  </div>
                  <button onClick={() => signout()} className="text-muted-foreground active:text-foreground p-1.5">
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3.5 border-b border-border bg-sidebar/80 backdrop-blur-xl flex-shrink-0">
          <span className="text-lg font-black text-primary">VALTORA</span>
          <div className="flex items-center gap-2">
            {(unreadCount ?? 0) > 0 && (
              <NavLink to="/dashboard/notifications" className="relative p-2">
                <Bell size={20} className="text-muted-foreground" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-bold">{unreadCount}</span>
              </NavLink>
            )}
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-muted-foreground clay-sm">
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Page content — padded for bottom nav on mobile */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <Outlet />
        </main>

        {/* Support Chat Widget */}
        <SupportChat />

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-border"
          style={{ background: "oklch(0.12 0.009 155 / 0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          {BOTTOM_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-all relative",
                isActive ? "text-primary" : "text-muted-foreground/60"
              )}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div layoutId="bottomNavIndicator"
                      className="absolute inset-x-2 top-0 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <motion.div whileTap={{ scale: 0.85 }}
                    className={cn("p-1.5 rounded-xl transition-all", isActive && "bg-primary/15")}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </motion.div>
                  <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                  {item.label === "Notifications" && (unreadCount ?? 0) > 0 && (
                    <span className="absolute top-2 right-1/3 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-bold">{unreadCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
