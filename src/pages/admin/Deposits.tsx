import { useState } from "react";
import { useQuery, useMutation, useDataClient } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { formatPKR, formatDateTime, STATUS_COLORS } from "@/lib/format.ts";
import { toast } from "sonner";
import { ConvexError } from "@/lib/app-error.ts";
import { cn } from "@/lib/utils.ts";
import { CheckCircle, XCircle, ChevronDown } from "lucide-react";
import type { Doc, Id } from "@/lib/types.d.ts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";

export default function AdminDeposits() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | undefined>("pending");
  const deposits = useQuery(api.financial.adminGetDeposits, {
    paginationOpts: { numItems: 20, cursor: null },
    status: statusFilter,
  });
  const [selected, setSelected] = useState<Doc<"deposits"> | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const approveDeposit = useMutation(api.financial.adminApproveDeposit);
  const rejectDeposit = useMutation(api.financial.adminRejectDeposit);
  const dataClient = useDataClient();
  const [userCache, setUserCache] = useState<Record<string, Doc<"users">>>({});

  async function loadUser(userId: Id<"users">) {
    if (userCache[userId]) return;
    const user = await dataClient.query(api.users.getUserById, { userId });
    if (user) setUserCache((prev) => ({ ...prev, [userId]: user }));
  }

  async function handleAction() {
    if (!selected || !action) return;
    setProcessing(true);
    try {
      if (action === "approve") {
        await approveDeposit({ depositId: selected._id, note: note || undefined });
        toast.success("Deposit approved & commissions generated");
      } else {
        await rejectDeposit({ depositId: selected._id, note: note || undefined });
        toast.success("Deposit rejected");
      }
      setSelected(null);
      setNote("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Action failed");
      }
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deposits</h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve user deposits</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "approved", "rejected", undefined] as const).map((s) => (
          <Button
            key={String(s)}
            size="sm"
            variant={statusFilter === s ? "default" : "secondary"}
            onClick={() => setStatusFilter(s)}
          >
            {s ?? "All"}
          </Button>
        ))}
      </div>

      {deposits === undefined ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : deposits.page.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No deposits found</div>
      ) : (
        <div className="space-y-2">
          {deposits.page.map((d: any) => {
            void loadUser(d.userId);
            const u = userCache[d.userId];
            return (
              <div
                key={d._id}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{u?.name ?? "Loading..."}</p>
                    <span className="text-xs text-muted-foreground">@{u?.username ?? "..."}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {d.planSnapshot.name} — <span className="font-mono">{d.transactionId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(d._creationTime)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold">{formatPKR(d.amount)}</p>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[d.status])}>
                    {d.status}
                  </span>
                </div>
                {d.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => { setSelected(d); setAction("approve"); }}>
                      <CheckCircle size={14} className="mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setSelected(d); setAction("reject"); }}>
                      <XCircle size={14} className="mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setNote(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "Approve Deposit" : "Reject Deposit"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span>{selected.planSnapshot.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{formatPKR(selected.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ref</span><span className="font-mono text-xs">{selected.transactionId}</span></div>
              </div>
              {action === "approve" && (
                <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
                  This will credit the user's account, activate their plan, and generate referral commissions.
                </div>
              )}
              <div className="space-y-2">
                <Label>Admin Note (optional)</Label>
                <Textarea placeholder="Optional note for the user..." value={note} onChange={(e) => setNote(e.target.value)} className="bg-input" rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? "Processing..." : action === "approve" ? "Confirm Approve" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
