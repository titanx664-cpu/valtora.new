import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Settings, Copy, Shield } from "lucide-react";

export default function SettingsPage() {
  const user = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const seedAdmin = useMutation(api.users.seedAdmin);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);

  if (user === undefined) return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminSeed(e: React.FormEvent) {
    e.preventDefault();
    setAdminSaving(true);
    try {
      await seedAdmin({ secretKey: adminKey });
      toast.success("Admin role granted! Refresh the page.");
      setAdminKey("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed");
      }
    } finally {
      setAdminSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings size={22} className="text-primary" /> Settings
        </h1>
      </div>

      {/* Profile */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder={user?.name ?? "Enter your name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={`@${user?.username ?? ""}`} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Username cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>Referral Code</Label>
              <div className="flex gap-2">
                <Input value={user?.referralCode ?? ""} disabled className="bg-muted font-mono" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { navigator.clipboard.writeText(user?.referralCode ?? ""); toast.success("Copied!"); }}
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={user?.isActive ? "text-emerald-400" : "text-red-400"}>
              {user?.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span>{user?.isAdmin ? "Administrator" : "Member"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Admin seed (first-time setup) */}
      {!user?.isAdmin && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} className="text-muted-foreground" /> Admin Setup
            </CardTitle>
            <CardDescription>
              First-time administrator setup. Requires the secure admin key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminSeed} className="flex gap-2">
              <Input
                type="password"
                placeholder="Admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="bg-input flex-1"
              />
              <Button type="submit" variant="secondary" disabled={adminSaving}>
                {adminSaving ? "..." : "Activate"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
