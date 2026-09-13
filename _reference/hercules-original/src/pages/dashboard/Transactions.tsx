import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatPKR, formatDateTime, STATUS_COLORS } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { List } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  commission: "Commission",
  withdrawal_debit: "Withdrawal",
  withdrawal_refund: "Withdrawal Refund",
  admin_adjustment: "Admin Adjustment",
};

export default function TransactionsPage() {
  const ledger = useQuery(api.financial.getMyLedger, {
    paginationOpts: { numItems: 30, cursor: null },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <List size={22} className="text-primary" /> Transaction History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">All financial movements on your account</p>
      </div>

      {ledger === undefined ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : ledger.page.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <List size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm mt-1">Your financial activity will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ledger.page.map((entry) => (
            <div key={entry._id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
              <div>
                <p className="text-sm font-medium">{TYPE_LABELS[entry.type] ?? entry.type}</p>
                <p className="text-xs text-muted-foreground">{entry.description}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(entry._creationTime)}</p>
              </div>
              <div className="text-right">
                <p className={cn("font-bold", entry.direction === "credit" ? "text-emerald-400" : "text-red-400")}>
                  {entry.direction === "credit" ? "+" : "-"}{formatPKR(entry.amount)}
                </p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[entry.status])}>
                  {entry.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
