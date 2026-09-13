import { useQuery, useMutation } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatDateTime } from "@/lib/format.ts";
import { cn } from "@/lib/utils.ts";
import { Bell, CheckCheck } from "lucide-react";
import { ConvexError } from "@/lib/app-error.ts";
import { toast } from "sonner";

const NOTIF_ICONS: Record<string, string> = {
  deposit_submitted: "💰",
  deposit_approved: "✅",
  deposit_rejected: "❌",
  plan_activated: "🚀",
  commission_received: "💎",
  withdrawal_submitted: "⏳",
  withdrawal_approved: "✅",
  withdrawal_processing: "⚙️",
  withdrawal_rejected: "❌",
  withdrawal_completed: "✅",
};

export default function NotificationsPage() {
  const notifications = useQuery(api.financial.getMyNotifications, {
    paginationOpts: { numItems: 30, cursor: null },
  });
  const markRead = useMutation(api.financial.markNotificationRead);
  const markAllRead = useMutation(api.financial.markAllNotificationsRead);

  async function handleMarkAll() {
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to update notifications");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={22} className="text-primary" /> Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Stay updated on your account activity</p>
        </div>
        <Button size="sm" variant="secondary" onClick={handleMarkAll}>
          <CheckCheck size={14} className="mr-2" /> Mark all read
        </Button>
      </div>

      {notifications === undefined ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : notifications.page.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.page.map((n: any) => (
            <button
              key={n._id}
              onClick={() => !n.isRead && markRead({ notificationId: n._id })}
              className={cn(
                "w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all",
                n.isRead
                  ? "border-border bg-card opacity-60"
                  : "border-primary/20 bg-primary/5 hover:border-primary/40"
              )}
            >
              <span className="text-xl mt-0.5">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm font-medium", !n.isRead && "text-foreground")}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(n._creationTime)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
