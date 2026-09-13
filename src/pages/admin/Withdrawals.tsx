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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import type { Doc, Id } from "@/lib/types.d.ts";

export default function AdminWithdrawals() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "processing" | "completed" | "rejected" | undefined>("pending");
  const withdrawals = useQuery(api.financial.adminGetWithdrawals, {
    paginationOpts: { numItems: 20, cursor: null },
    status: statusFilter,
  });
  const processWithdrawal = useMutation(api.financial.adminProcessWithdrawal);
  const [selected, setSelected] = useState<Doc<"withdrawals"> | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "complete">("approve");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const dataClient = useDataClient();
  const [userCache, setUserCache] = useState<Record<string, Doc<"users">>>({});

  async function loadUser(userId: Id<"users">) {
    if (userCache[userId]) return;
    const user = await dataClient.query(api.users.getUserById, { userId });
    if (user) setUserCache((prev) => ({ ...prev, [userId]: user }));
  }

  async function handleAction() {
    if (!selected) return;
    setProcessing(true);
    try {
      await processWithdrawal({ withdrawalId: selected._id, action, note: note || undefined });
      toast.success(`Withdrawal ${action}d`);
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
    <div className="max-w-5xl space-y-6 p-4 sm:mx-auto sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <p className="text-muted-foreground text-sm mt-1">Process user withdrawal requests</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["pending", "processing", "completed", "rejected", undefined] as const).map((s) => (
          <Button key={String(s)} size="sm" variant={statusFilter === s ? "default" : "secondary"} onClick={() => setStatusFilter(s)}>
            {s ?? "All"}
          </Button>
        ))}
      </div>

      {withdrawals === undefined ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : withdrawals.page.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No withdrawals found</div>
      ) : (
        <div className="space-y-2">
          {withdrawals.page.map((w: any) => {
            void loadUser(w.userId);
            const u = userCache[w.userId];
            return (
              <div key={w._id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{u?.name ?? "..."}</p>
                    <span className="text-xs text-muted-foreground">@{u?.username ?? "..."}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {w.method} — {w.accountDetails.accountNumber}
                    {w.accountDetails.bankName && ` (${w.accountDetails.bankName})`}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(w._creationTime)}</p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:block sm:text-right">
                  <p className="font-bold text-red-400">-{formatPKR(w.amount)}</p>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[w.status])}>
                    {w.status}
                  </span>
                </div>
                {(w.status === "pending" || w.status === "processing") && (
                  <Button className="w-full sm:w-auto" size="sm" variant="secondary" onClick={() => { setSelected(w); setAction(w.status === "pending" ? "approve" : "complete"); }}>
                    Manage
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setNote(""); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Manage Withdrawal</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span>{formatPKR(selected.amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{selected.method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-mono text-xs">{selected.accountDetails.accountNumber}</span></div>
                {selected.accountDetails.accountName && <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{selected.accountDetails.accountName}</span></div>}
                {selected.accountDetails.bankName && <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{selected.accountDetails.bankName}</span></div>}
              </div>
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={action} onValueChange={(v) => setAction(v as typeof action)}>
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selected.status === "pending" && <SelectItem value="approve">Approve (mark processing)</SelectItem>}
                    {selected.status === "processing" && <SelectItem value="complete">Mark Completed</SelectItem>}
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea placeholder="Note for the user..." value={note} onChange={(e) => setNote(e.target.value)} className="bg-input" rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="sm:gap-2">
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleAction} disabled={processing}>
              {processing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
