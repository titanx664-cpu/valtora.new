import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatDateTime } from "@/lib/format.ts";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";

export default function AdminUsers() {
  const users = useQuery(api.users.adminListUsers, {
    paginationOpts: { numItems: 30, cursor: null },
  });
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">All registered accounts</p>
      </div>

      {users === undefined ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : users.page.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No users yet</div>
      ) : (
        <div className="space-y-2">
          {users.page.map((u) => (
            <div key={u._id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {u.name?.charAt(0)?.toUpperCase() ?? "V"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{u.name ?? "—"}</p>
                  {u.isAdmin && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Admin</span>}
                  {!u.isActive && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Inactive</span>}
                </div>
                <p className="text-xs text-muted-foreground">@{u.username} · {u.email ?? "no email"}</p>
                <p className="text-xs text-muted-foreground">Joined {formatDateTime(u._creationTime)} · Code: {u.referralCode}</p>
              </div>
              <p className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                Referred by: {u.referredBy ? "Yes" : "Direct"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
