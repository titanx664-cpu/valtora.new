import { useQuery } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatDateTime } from "@/lib/format.ts";
import { toast } from "sonner";
import { Users, Copy, Link2, MessageCircle } from "lucide-react";
import { motion } from "motion/react";

export default function ReferralsPage() {
  const user = useQuery(api.users.getCurrentUser);
  const referrals = useQuery(api.financial.getMyReferrals);
  const plans = useQuery(api.plans.getActivePlans);

  const referralCode = user?.referralCode ?? "";
  const referralLink = user ? `${window.location.origin}/register?ref=${user.referralCode}` : "";

  function copyCode() {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  }

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Join me on Valtora — the intelligent wealth network! 💰\n\nUse my referral code *${referralCode}* to register and start earning.\n\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={22} className="text-primary" /> Referrals
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Earn commissions by referring others to Valtora</p>
      </div>

      {/* Referral card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/30 emerald-glow">
          <CardHeader>
            <CardTitle className="text-base">Your Referral Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-xl font-bold text-primary tracking-widest">
                {user === undefined ? <Skeleton className="h-7 w-32" /> : referralCode}
              </div>
              <Button size="sm" variant="secondary" onClick={copyCode}>
                <Copy size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-3 py-3 text-xs text-muted-foreground font-mono truncate">
                {user === undefined ? <Skeleton className="h-5 w-full" /> : referralLink}
              </div>
              <Button size="sm" variant="secondary" onClick={copyLink}>
                <Link2 size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp share */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={shareWhatsApp}
        disabled={!user}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm transition-all"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", color: "#fff" }}
      >
        <MessageCircle size={20} />
        Share on WhatsApp
      </motion.button>

      {/* Commission structure */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Commission Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted p-4 border border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Level 1 — Direct Referrals</p>
              <p className="text-sm text-muted-foreground">People you directly invite. You earn a percentage of their deposit.</p>
              <div className="mt-3 text-sm space-y-1">
                {plans === undefined ? <Skeleton className="h-16 w-full" /> : plans.map((plan: any) => <div key={plan._id} className="flex justify-between"><span>{plan.name}</span><span className="font-semibold text-primary">{plan.level1Commission}%</span></div>)}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Level 2 — Indirect Referrals</p>
              <p className="text-sm text-muted-foreground">People referred by your Level 1 referrals.</p>
              <div className="mt-3 text-sm space-y-1">
                {plans === undefined ? <Skeleton className="h-16 w-full" /> : plans.map((plan: any) => <div key={plan._id} className="flex justify-between"><span>{plan.name}</span><span className="font-semibold">{plan.level2Commission}%</span></div>)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level 1 referrals */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Level 1 Referrals</CardTitle>
            <span className="text-sm text-primary font-semibold">{referrals?.level1.length ?? 0} people</span>
          </div>
        </CardHeader>
        <CardContent>
          {referrals === undefined ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : referrals.level1.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm">No referrals yet. Share your referral code to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.level1.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {r.name?.charAt(0)?.toUpperCase() ?? "V"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">@{r.username}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level 2 referrals */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Level 2 Referrals</CardTitle>
            <span className="text-sm text-muted-foreground font-semibold">{referrals?.level2.length ?? 0} people</span>
          </div>
        </CardHeader>
        <CardContent>
          {referrals === undefined ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : referrals.level2.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Level 2 referrals appear when your direct referrals invite others.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.level2.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground text-xs font-bold">
                      {r.name?.charAt(0)?.toUpperCase() ?? "V"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">@{r.username}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
