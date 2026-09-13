import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

export default function AdminPaymentAccounts() {
  const accounts = useQuery(api.paymentAccounts.getAllPaymentAccounts);
  const createAccount = useMutation(api.paymentAccounts.adminCreatePaymentAccount);
  const updateAccount = useMutation(api.paymentAccounts.adminUpdatePaymentAccount);
  const deleteAccount = useMutation(api.paymentAccounts.adminDeletePaymentAccount);

  const [editing, setEditing] = useState<Doc<"paymentAccounts"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ method: "", accountName: "", accountNumber: "", instructions: "", sortOrder: "1" });
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm({ method: "", accountName: "", accountNumber: "", instructions: "", sortOrder: String((accounts?.length ?? 0) + 1) });
    setCreating(true);
  }

  function openEdit(acc: Doc<"paymentAccounts">) {
    setForm({ method: acc.method, accountName: acc.accountName, accountNumber: acc.accountNumber, instructions: acc.instructions ?? "", sortOrder: String(acc.sortOrder) });
    setEditing(acc);
  }

  async function handleSave() {
    if (!form.method.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
      toast.error("Method, name, and account number are required");
      return;
    }
    setSaving(true);
    try {
      if (creating) {
        await createAccount({
          method: form.method.trim(),
          accountName: form.accountName.trim(),
          accountNumber: form.accountNumber.trim(),
          instructions: form.instructions.trim() || undefined,
          isActive: true,
          sortOrder: Number(form.sortOrder),
        });
        toast.success("Payment account created");
        setCreating(false);
      } else if (editing) {
        await updateAccount({
          accountId: editing._id,
          method: form.method.trim(),
          accountName: form.accountName.trim(),
          accountNumber: form.accountNumber.trim(),
          instructions: form.instructions.trim() || undefined,
          sortOrder: Number(form.sortOrder),
        });
        toast.success("Updated");
        setEditing(null);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(acc: Doc<"paymentAccounts">) {
    await updateAccount({ accountId: acc._id, isActive: !acc.isActive });
  }

  async function handleDelete(acc: Doc<"paymentAccounts">) {
    if (!confirm("Delete this payment account?")) return;
    await deleteAccount({ accountId: acc._id });
    toast.success("Deleted");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure payment methods shown to users during deposits</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" /> Add Account</Button>
      </div>

      {accounts === undefined ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No payment accounts configured. Add one to allow deposits.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc._id} className={`flex items-center gap-4 p-4 rounded-xl border bg-card ${acc.isActive ? "border-border" : "border-border opacity-60"}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary uppercase">{acc.method}</span>
                  {!acc.isActive && <span className="text-xs text-muted-foreground">(inactive)</span>}
                </div>
                <p className="font-medium text-sm">{acc.accountName}</p>
                <p className="text-sm text-muted-foreground font-mono">{acc.accountNumber}</p>
                {acc.instructions && <p className="text-xs text-muted-foreground mt-1">{acc.instructions}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleToggle(acc)}>
                  {acc.isActive ? "Disable" : "Enable"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(acc)}>
                  <Pencil size={13} />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(acc)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={creating || !!editing} onOpenChange={() => { setCreating(false); setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{creating ? "Add Payment Account" : "Edit Payment Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Method (e.g. Easypaisa, JazzCash, Bank)</Label><Input value={form.method} onChange={(e) => setForm(f => ({ ...f, method: e.target.value }))} className="bg-input" /></div>
            <div className="space-y-1.5"><Label>Account Name</Label><Input value={form.accountName} onChange={(e) => setForm(f => ({ ...f, accountName: e.target.value }))} className="bg-input" /></div>
            <div className="space-y-1.5"><Label>Account Number</Label><Input value={form.accountNumber} onChange={(e) => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="bg-input font-mono" /></div>
            <div className="space-y-1.5"><Label>Instructions (optional)</Label><Textarea value={form.instructions} onChange={(e) => setForm(f => ({ ...f, instructions: e.target.value }))} className="bg-input" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
