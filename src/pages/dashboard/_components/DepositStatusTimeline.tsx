import { motion } from "motion/react";
import { CheckCircle2, Clock, XCircle, Send, Zap } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { formatDateTime } from "@/lib/format.ts";

type DepositStatus = "pending" | "approved" | "rejected" | "credited";

type TimelineStep = {
  key: DepositStatus | "active";
  label: string;
  desc: string;
  icon: React.ReactNode;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { key: "pending", label: "Submitted", desc: "Your deposit is under review", icon: <Send size={13} /> },
  { key: "approved", label: "Approved", desc: "Payment verified by admin", icon: <CheckCircle2 size={13} /> },
  { key: "active", label: "Plan Active", desc: "Commissions are now live", icon: <Zap size={13} /> },
];

function getStepIndex(status: DepositStatus): number {
  if (status === "pending") return 0;
  if (status === "approved" || status === "credited") return 2;
  return -1; // rejected
}

type Props = {
  status: DepositStatus;
  createdAt: number;
  planName: string;
};

export default function DepositStatusTimeline({ status, createdAt, planName }: Props) {
  const isRejected = status === "rejected";
  const currentStep = getStepIndex(status);

  return (
    <div className="clay p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{planName} Plan</p>
        <p className="text-[11px] text-muted-foreground">{formatDateTime(createdAt)}</p>
      </div>

      {isRejected ? (
        <div className="clay-sm px-4 py-3 flex items-center gap-3 border-red-400/30">
          <XCircle size={18} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-400">Deposit Rejected</p>
            <p className="text-xs text-muted-foreground">Please contact support for details.</p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[17px] top-5 bottom-5 w-0.5 bg-border/60" />
          <motion.div
            className="absolute left-[17px] top-5 w-0.5 bg-primary rounded-full"
            initial={{ height: 0 }}
            animate={{ height: `${(currentStep / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />

          <div className="space-y-3">
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 relative z-10"
                >
                  <motion.div
                    animate={active ? { scale: [1, 1.15, 1], boxShadow: ["0 0 0px oklch(0.72 0.18 155 / 0)", "0 0 10px oklch(0.72 0.18 155 / 0.4)", "0 0 0px oklch(0.72 0.18 155 / 0)"] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all",
                      done
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-muted/50 border-border/50 text-muted-foreground/40"
                    )}
                  >
                    {done ? step.icon : <Clock size={13} />}
                  </motion.div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-semibold", !done && "text-muted-foreground/50")}>{step.label}</p>
                    {done && <p className="text-[11px] text-muted-foreground">{step.desc}</p>}
                  </div>
                  {done && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
