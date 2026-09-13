import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useNavigate } from "react-router-dom";
import { formatPKR, formatDateTime, STATUS_COLORS } from "@/lib/format.ts";
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Package, Clock,
  Sparkles, ChevronRight, Users, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { motion } from "motion/react";
import OnboardingChecklist from "./_components/OnboardingChecklist.tsx";
import WithdrawalCountdown from "./_components/WithdrawalCountdown.tsx";

export default function DashboardHome() {
  const wallet = useQuery(api.financial.getMyWallet);
  const user = useQuery(api.users.getCurrentUser);
  const ledger = useQuery(api.financial.getMyLedger, {
    paginationOpts: { numItems: 5, cursor: null },
  });
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
        className="flex items-center justify-between pt-1">
        <div>
          <p className="text-muted-foreground text-xs font-medium">Welcome back</p>
          <h1 className="text-2xl font-black">
            {wallet === undefined ? <Skeleton className="h-7 w-36 mt-0.5" /> : (
              <>{user?.name?.split(" ")[0] ?? "Investor"}{" "}
                <motion.span animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 0.6, delay: 0.5 }} className="inline-block">👋</motion.span>
              </>
            )}
          </h1>
        </div>
        <motion.div animate={{ rotate: [0, 15, -5, 10, 0] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}>
          <Sparkles size={22} className="text-primary/50" />
        </motion.div>
      </motion.div>

      {/* Balance hero card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] as const }}>
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className="clay-primary p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(circle at 80% 20%, oklch(0.85 0.15 155 / 0.3) 0%, transparent 60%)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={15} className="text-primary-foreground/70" />
              <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-widest">Available Balance</p>
            </div>
            {wallet == null ? (
              <Skeleton className="h-10 w-44 bg-primary-foreground/20 mt-1" />
            ) : (
              <motion.p key={wallet.balance} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-black text-primary-foreground mt-1">{formatPKR(wallet.balance)}</motion.p>
            )}
            <div className="flex items-center gap-2 mt-3 text-primary-foreground/60 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60 animate-pulse" />
              {wallet?.activePlan ? `Plan: ${wallet.activePlan.name}` : "No active plan"}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Onboarding checklist */}
      <OnboardingChecklist />

      {/* Withdrawal countdown */}
      <WithdrawalCountdown />

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Earnings", value: wallet == null ? null : formatPKR(wallet.totalEarnings), icon: <TrendingUp size={16} />, color: "text-emerald-400", delay: 0.1 },
          { label: "Commissions", value: wallet == null ? null : formatPKR(wallet.totalCommissions), icon: <ArrowDownLeft size={16} />, color: "text-blue-400", delay: 0.15 },
          { label: "Withdrawals", value: wallet == null ? null : formatPKR(wallet.totalWithdrawals), icon: <ArrowUpRight size={16} />, color: "text-orange-400", delay: 0.2 },
        ].map((card) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: card.delay, ease: [0.22, 1, 0.36, 1] as const }}>
            <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="clay p-3.5 relative overflow-hidden">
              <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center mb-2.5", card.color, "bg-current/10")}>
                <span className={card.color}>{card.icon}</span>
              </div>
              {card.value === null ? (
                <Skeleton className="h-5 w-14" />
              ) : (
                <p className="text-sm font-black leading-tight truncate">{card.value}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{card.label}</p>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Status row */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Active Plan",
            value: wallet?.activePlan?.name ?? "None",
            sub: wallet?.activePlan ? formatPKR(wallet.activePlan.price) : "Activate a plan",
            icon: <Package size={16} className="text-primary" />,
            cta: wallet != null && !wallet.activePlan ? { label: "Choose Plan", onClick: () => navigate("/dashboard/deposits") } : undefined,
          },
          {
            label: "Pending",
            value: wallet == null ? "—" : `${wallet.pendingDepositsCount + wallet.pendingWithdrawalsCount}`,
            sub: "deposits & withdrawals",
            icon: <Clock size={16} className="text-yellow-400" />,
          },
        ].map((card) => (
          <motion.div key={card.label} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
            className="clay p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="clay-sm w-7 h-7 flex items-center justify-center">{card.icon}</div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{card.label}</p>
            </div>
            <p className="text-xl font-black">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{card.sub}</p>
            {card.cta && (
              <motion.button whileTap={{ scale: 0.95 }} onClick={card.cta.onClick}
                className="clay-primary mt-3 w-full py-2 text-xs font-bold text-primary-foreground flex items-center justify-center gap-1">
                {card.cta.label} <ArrowRight size={11} />
              </motion.button>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Quick actions */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.32 }}
        className="grid grid-cols-3 gap-3">
        {[
          { label: "Deposit", icon: <ArrowDownLeft size={20} />, onClick: () => navigate("/dashboard/deposits"), primary: true },
          { label: "Withdraw", icon: <ArrowUpRight size={20} />, onClick: () => navigate("/dashboard/withdrawals") },
          { label: "Referrals", icon: <Users size={20} />, onClick: () => navigate("/dashboard/referrals") },
        ].map((action) => (
          <motion.button key={action.label} whileHover={{ y: -3, scale: 1.04 }} whileTap={{ scale: 0.93 }}
            onClick={action.onClick}
            className={cn("flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all",
              action.primary ? "clay-primary text-primary-foreground" : "clay text-foreground")}>
            {action.icon}
            <span className="text-[11px] font-semibold">{action.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Recent activity */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}>
        <div className="clay overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <p className="font-bold text-sm">Recent Activity</p>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => navigate("/dashboard/transactions")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              View all <ChevronRight size={12} />
            </motion.button>
          </div>
          <div className="px-4 py-3">
            {ledger === undefined ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : ledger.page.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Wallet size={36} className="mx-auto mb-3 opacity-20" />
                </motion.div>
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start by making your first deposit</p>
              </div>
            ) : (
              <div className="space-y-1.5 py-1">
                {ledger.page.map((entry, i) => (
                  <motion.div key={entry._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="clay-sm px-4 py-3 flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      entry.direction === "credit" ? "bg-emerald-400/15" : "bg-red-400/15")}>
                      {entry.direction === "credit"
                        ? <ArrowDownLeft size={15} className="text-emerald-400" />
                        : <ArrowUpRight size={15} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{entry.description}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDateTime(entry._creationTime)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn("text-sm font-black", entry.direction === "credit" ? "text-emerald-400" : "text-red-400")}>
                        {entry.direction === "credit" ? "+" : "-"}{formatPKR(entry.amount)}
                      </p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", STATUS_COLORS[entry.status])}>
                        {entry.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
