import { useState } from "react";
import { useQuery, useMutation } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { formatPKR, formatDateTime, STATUS_COLORS, isSundayKarachi } from "@/lib/format.ts";
import { toast } from "sonner";
import { ConvexError } from "@/lib/app-error.ts";
import { cn } from "@/lib/utils.ts";
import { ArrowUpRight } from "lucide-react";
import WithdrawalCountdown from "./_components/WithdrawalCountdown.tsx";

export default function WithdrawalsPage() {
  const [tab, setTab] = useState<"request" | "history">("request");
  const wallet = useQuery(api.financial.getMyWallet);
  const withdrawals = useQuery(api.financial.getMyWithdrawals, {
    paginationOpts: { numItems: 10, cursor: null },
  });
  const requestWithdrawal = useMutation(api.financial.requestWithdrawal);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"Easypaisa" | "JazzCash" | "Bank" | "">("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) { toast.error("Select a payment method"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!accountNumber.trim()) { toast.error("Account number is required"); return; }
    if (method === "Bank" && !bankName.trim()) { toast.error("Bank name is required"); return; }

    setSubmitting(true);
    try {
      await requestWithdrawal({
        amount: amt,
        method: method as "Easypaisa" | "JazzCash" | "Bank",
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim() || undefined,
        bankName: method === "Bank" ? bankName.trim() : undefined,
      });
      toast.success("Withdrawal request submitted!");
      setTab("history");
      setAmount(""); setMethod(""); setAccountNumber(""); setAccountName(""); setBankName("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to submit withdrawal.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowUpRight size={22} className="text-primary" /> Withdrawals
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Withdrawals are processed on Sundays (Asia/Karachi time)</p>
      </div>

      {/* Countdown / Sunday notice */}
      <WithdrawalCountdown />

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "request" ? "default" : "secondary"} onClick={() => setTab("request")}>
          New Request
        </Button>
        <Button size="sm" variant={tab === "history" ? "default" : "secondary"} onClick={() => setTab("history")}>
          History
        </Button>
      </div>

      {tab === "request" && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Withdrawal Request</CardTitle>
            <CardDescription>
              Available balance: <strong className="text-primary">{wallet ? formatPKR(wallet.balance) : "—"}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSundayKarachi() ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Withdrawals are only available on Sundays (PKT)</p>
                <p className="text-xs mt-1 text-muted-foreground/60">The countdown above shows when the next window opens.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (PKR)</Label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-input"
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easypaisa">Easypaisa</SelectItem>
                      <SelectItem value="JazzCash">JazzCash</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {method && (
                  <>
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input placeholder="03XX XXXXXXX or account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="bg-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Name {method !== "Bank" && "(optional)"}</Label>
                      <Input placeholder="Account holder name" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="bg-input" />
                    </div>
                    {method === "Bank" && (
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input placeholder="e.g. HBL, UBL, MCB" value={bankName} onChange={(e) => setBankName(e.target.value)} className="bg-input" />
                      </div>
                    )}
                  </>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Withdrawal Request"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Expected processing time: 6–8 hours
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "history" && (
        <div>
          {withdrawals === undefined ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : withdrawals.page.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpRight size={40} className="mx-auto mb-3 opacity-20" />
              <p>No withdrawals yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.page.map((w: any) => (
                <div key={w._id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                  <div>
                    <p className="font-medium text-sm">{w.method} Withdrawal</p>
                    <p className="text-xs text-muted-foreground font-mono">{w.accountDetails.accountNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(w._creationTime)}</p>
                    {w.adminNote && <p className="text-xs text-muted-foreground mt-1">Note: {w.adminNote}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-400">-{formatPKR(w.amount)}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[w.status])}>
                      {w.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
