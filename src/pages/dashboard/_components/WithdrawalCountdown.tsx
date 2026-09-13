import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getSecondsUntilNextSunday, formatCountdown, isSundayKarachi } from "@/lib/format.ts";
import { Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export default function WithdrawalCountdown() {
  const [seconds, setSeconds] = useState(() => getSecondsUntilNextSunday());
  const isSunday = isSundayKarachi();

  useEffect(() => {
    if (isSunday) return;
    const id = setInterval(() => {
      setSeconds(getSecondsUntilNextSunday());
    }, 1000);
    return () => clearInterval(id);
  }, [isSunday]);

  const { days, hours, minutes, secs } = formatCountdown(seconds);

  if (isSunday) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="clay border-primary/40 p-4 flex items-center gap-3"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary flex-shrink-0"
        >
          <CheckCircle size={18} />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-primary">Withdrawals are open today!</p>
          <p className="text-xs text-muted-foreground">Submit your withdrawal request now</p>
        </div>
      </motion.div>
    );
  }

  const units = [
    { label: "Days", value: days },
    { label: "Hrs", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: secs },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
      className="clay p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 flex items-center justify-center text-yellow-400"
        >
          <Clock size={16} />
        </motion.div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Next Withdrawal Window
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {units.map(({ label, value }) => (
          <div key={label} className="clay-sm flex flex-col items-center py-2.5 px-1">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={value}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "text-xl font-black tabular-nums leading-none",
                  label === "Sec" ? "text-primary" : "text-foreground"
                )}
              >
                {String(value).padStart(2, "0")}
              </motion.span>
            </AnimatePresence>
            <span className="text-[10px] text-muted-foreground mt-1 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
