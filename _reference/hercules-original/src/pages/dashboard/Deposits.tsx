import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatPKR } from "@/lib/format.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { cn } from "@/lib/utils.ts";
import { ArrowDownLeft, ChevronLeft, Copy } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import DepositStatusTimeline from "./_components/DepositStatusTimeline.tsx";

export default function DepositsPage() {
  const [step, setStep] = useState<"select" | "pay" | "history">("select");
  const [selectedPlanId, setSelectedPlanId] = useState<Id<"plans"> | null>(null);
  const plans = useQuery(api.plans.getActivePlans);
  const paymentAccounts = useQuery(api.paymentAccounts.getActivePaymentAccounts);
  const deposits = useQuery(api.financial.getMyDeposits, {
    paginationOpts: { numItems: 10, cursor: null },
  });
  const submitDeposit = useMutation(api.financial.submitDeposit);

  const [txId, setTxId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans?.find((p) => p._id === selectedPlanId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId || !txId.trim()) {
      toast.error("Please provide a transaction ID");
      return;
    }
    setSubmitting(true);
    try {
      await submitDeposit({ planId: selectedPlanId, transactionId: txId.trim() });
      toast.success("Deposit submitted! Awaiting admin review.");
      setStep("history");
      setTxId("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to submit deposit.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowDownLeft size={22} className="text-primary" /> Deposits
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Choose a plan and submit your payment</p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={step !== "history" ? "default" : "secondary"} onClick={() => setStep("select")}>
          New Deposit
        </Button>
        <Button size="sm" variant={step === "history" ? "default" : "secondary"} onClick={() => setStep("history")}>
          Deposit History
        </Button>
      </div>

      {step === "select" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Select a Plan</h2>
          {plans === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : plans.length === 0 ? (
            <p className="text-muted-foreground">No plans available at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <button
                  key={plan._id}
                  onClick={() => { setSelectedPlanId(plan._id); setStep("pay"); }}
                  className={cn(
                    "text-left rounded-xl border p-5 transition-all duration-200 hover:border-primary/50",
                    selectedPlanId === plan._id ? "border-primary emerald-glow" : "border-border bg-card"
                  )}
                >
                  <div className="mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">{plan.name}</span>
                  </div>
                  <p className="text-3xl font-bold mb-4">{formatPKR(plan.price)}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level 1 Commission</span>
                      <span className="font-semibold text-primary">{plan.level1Commission}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level 2 Commission</span>
                      <span className="font-semibold text-primary">{plan.level2Commission}%</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full text-center py-2 rounded-md bg-primary/10 text-primary text-sm font-medium">
                      Select Plan →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "pay" && selectedPlan && (
        <div className="space-y-4">
          <button onClick={() => setStep("select")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} /> Back to plans
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment instructions */}
            <div className="space-y-4">
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">Payment Details</CardTitle>
                  <CardDescription>Send <strong className="text-foreground">{formatPKR(selectedPlan.price)}</strong> to any of the accounts below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {paymentAccounts === undefined ? (
                    <Skeleton className="h-20 w-full" />
                  ) : paymentAccounts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No payment accounts configured. Contact support.</p>
                  ) : (
                    paymentAccounts.map((acc) => (
                      <div key={acc._id} className="rounded-lg bg-muted p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-primary uppercase">{acc.method}</span>
                        </div>
                        <p className="text-sm font-medium">{acc.accountName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground font-mono">{acc.accountNumber}</p>
                          <button
                            onClick={() => { navigator.clipboard.writeText(acc.accountNumber); toast.success("Copied!"); }}
                            className="text-primary hover:text-primary/80"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        {acc.instructions && <p className="text-xs text-muted-foreground">{acc.instructions}</p>}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Submit form */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Submit Transaction</CardTitle>
                <CardDescription>After sending payment, enter your transaction reference below</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Plan: <strong className="text-foreground">{selectedPlan.name}</strong> —{" "}
                      <strong className="text-primary">{formatPKR(selectedPlan.price)}</strong>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="txid">Transaction ID / Reference</Label>
                    <Input
                      id="txid"
                      placeholder="e.g. TXN123456789"
                      value={txId}
                      onChange={(e) => setTxId(e.target.value)}
                      className="bg-input font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the exact transaction ID from your payment receipt
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Deposit"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {step === "history" && (
        <div>
          {deposits === undefined ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : deposits.page.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowDownLeft size={40} className="mx-auto mb-3 opacity-20" />
              <p>No deposits yet</p>
              <Button size="sm" className="mt-3" onClick={() => setStep("select")}>Make your first deposit</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {deposits.page.map((d) => (
                <DepositStatusTimeline
                  key={d._id}
                  status={d.status as "pending" | "approved" | "rejected" | "credited"}
                  createdAt={d._creationTime}
                  planName={d.planSnapshot.name}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
