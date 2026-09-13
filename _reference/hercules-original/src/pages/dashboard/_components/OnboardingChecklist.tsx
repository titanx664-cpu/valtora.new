import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils.ts";

type Step = {
  key: string;
  label: string;
  desc: string;
  action?: { label: string; path: string };
};

const STEPS: Step[] = [
  { key: "registered", label: "Create your account", desc: "You're registered on Valtora." },
  { key: "hasPlan", label: "Activate a plan", desc: "Choose and fund your first investment plan.", action: { label: "Choose Plan", path: "/dashboard/deposits" } },
  { key: "hasDeposit", label: "Make your first deposit", desc: "Submit your payment to activate your plan.", action: { label: "Deposit", path: "/dashboard/deposits" } },
  { key: "hasReferral", label: "Invite a friend", desc: "Share your referral code and earn commissions.", action: { label: "Referrals", path: "/dashboard/referrals" } },
];

export default function OnboardingChecklist() {
  const wallet = useQuery(api.financial.getMyWallet);
  const referrals = useQuery(api.financial.getMyReferrals);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("valtora_checklist_dismissed") === "true"; } catch { return false; }
  });
  const navigate = useNavigate();

  if (dismissed) return null;
  if (wallet === undefined || wallet === null || referrals === undefined) return null;

  const completedMap: Record<string, boolean> = {
    registered: true,
    hasPlan: !!wallet.activePlan,
    hasDeposit: wallet.totalEarnings > 0 || wallet.balance > 0,
    hasReferral: (referrals.level1.length ?? 0) > 0,
  };

  const completedCount = Object.values(completedMap).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  function dismiss() {
    try { localStorage.setItem("valtora_checklist_dismissed", "true"); } catch {}
    setDismissed(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
      className="clay overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">Getting Started</p>
            {allDone && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold"
              >
                Complete!
              </motion.span>
            )}
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / STEPS.length) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold">{completedCount}/{STEPS.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Steps */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              {STEPS.map((step, i) => {
                const done = completedMap[step.key] ?? false;
                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={cn(
                      "clay-sm px-3.5 py-3 flex items-center gap-3 transition-all",
                      done && "opacity-70"
                    )}
                  >
                    <motion.div
                      animate={done ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {done ? (
                        <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                      ) : (
                        <Circle size={18} className="text-muted-foreground/40 flex-shrink-0" />
                      )}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold", done && "line-through text-muted-foreground")}>
                        {step.label}
                      </p>
                      {!done && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{step.desc}</p>
                      )}
                    </div>
                    {!done && step.action && (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => navigate(step.action!.path)}
                        className="clay-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground flex-shrink-0"
                      >
                        {step.action.label}
                      </motion.button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
