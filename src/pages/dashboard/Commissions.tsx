import { useQuery } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatPKR, formatDateTime, STATUS_COLORS } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { TrendingUp } from "lucide-react";

export default function CommissionsPage() {
  const commissions = useQuery(api.financial.getMyCommissions, {
    paginationOpts: { numItems: 20, cursor: null },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp size={22} className="text-primary" /> Commissions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Earnings from your referral network</p>
      </div>

      {commissions === undefined ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : commissions.page.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No commissions yet</p>
          <p className="text-sm mt-1">Refer others to earn commissions when they deposit</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commissions.page.map((c: any) => (
            <div key={c._id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    c.level === 1 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  )}>
                    Level {c.level}
                  </span>
                  <span className="text-xs text-muted-foreground">{c.planName} Plan</span>
                </div>
                <p className="text-sm text-muted-foreground">{formatDateTime(c._creationTime)}</p>
                <p className="text-xs text-muted-foreground">{c.percentage}% commission</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary text-lg">+{formatPKR(c.amount)}</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[c.status])}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
