import { useState } from "react";
import { useQuery, useMutation } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { formatPKR } from "@/lib/format.ts";
import { Plus, Pencil } from "lucide-react";
import type { Doc } from "@/lib/types.d.ts";

export default function AdminPlans() {
  const plans = useQuery(api.plans.getAllPlans);
  const seedPlans = useMutation(api.plans.seedDefaultPlans);
  const createPlan = useMutation(api.plans.adminCreatePlan);
  const updatePlan = useMutation(api.plans.adminUpdatePlan);
  const [editing, setEditing] = useState<Doc<"plans"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", level1: "", level2: "", sortOrder: "1" });
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm({ name: "", price: "", level1: "", level2: "", sortOrder: String((plans?.length ?? 0) + 1) });
    setCreating(true);
  }

  function openEdit(plan: Doc<"plans">) {
    setForm({ name: plan.name, price: String(plan.price), level1: String(plan.level1Commission), level2: String(plan.level2Commission), sortOrder: String(plan.sortOrder) });
    setEditing(plan);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (creating) {
        await createPlan({
          name: form.name.trim(),
          price: Number(form.price),
          level1Commission: Number(form.level1),
          level2Commission: Number(form.level2),
          isActive: true,
          sortOrder: Number(form.sortOrder),
        });
        toast.success("Plan created");
        setCreating(false);
      } else if (editing) {
        await updatePlan({
          planId: editing._id,
          name: form.name.trim(),
          price: Number(form.price),
          level1Commission: Number(form.level1),
          level2Commission: Number(form.level2),
          sortOrder: Number(form.sortOrder),
        });
        toast.success("Plan updated");
        setEditing(null);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(plan: Doc<"plans">) {
    await updatePlan({ planId: plan._id, isActive: !plan.isActive });
    toast.success(plan.isActive ? "Plan deactivated" : "Plan activated");
  }

  async function handleSeed() {
    try {
      await seedPlans();
      toast.success("Default plans seeded!");
    } catch {
      toast.error("Failed (plans may already exist)");
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage investment plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleSeed}>Seed Defaults</Button>
          <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" /> New Plan</Button>
        </div>
      </div>

      {plans === undefined ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No plans. Click "Seed Defaults" to add Starter, Growth, Elite.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan: any) => (
            <Card key={plan._id} className={plan.isActive ? "border-border" : "border-border opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">{formatPKR(plan.price)}</p>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">L1</span><span>{plan.level1Commission}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">L2</span><span>{plan.level2Commission}%</span></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(plan)}>
                    <Pencil size={12} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleToggle(plan)}>
                    {plan.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={creating || !!editing} onOpenChange={() => { setCreating(false); setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{creating ? "Create Plan" : "Edit Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="bg-input" /></div>
            <div className="space-y-1.5"><Label>Price (PKR)</Label><Input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} className="bg-input" /></div>
            <div className="space-y-1.5"><Label>Level 1 Commission %</Label><Input type="number" value={form.level1} onChange={(e) => setForm(f => ({ ...f, level1: e.target.value }))} className="bg-input" /></div>
            <div className="space-y-1.5"><Label>Level 2 Commission %</Label><Input type="number" value={form.level2} onChange={(e) => setForm(f => ({ ...f, level2: e.target.value }))} className="bg-input" /></div>
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
