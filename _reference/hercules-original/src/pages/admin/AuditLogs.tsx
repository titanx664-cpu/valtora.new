import { useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatDateTime } from "@/lib/format.ts";
import { useState } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

const ACTION_LABELS: Record<string, string> = {
  approve_deposit: "Approved Deposit",
  reject_deposit: "Rejected Deposit",
  approve_withdrawal: "Approved Withdrawal",
  complete_withdrawal: "Completed Withdrawal",
  reject_withdrawal: "Rejected Withdrawal",
};

export default function AdminAuditLogs() {
  const logs = useQuery(api.financial.adminGetAuditLogs, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  const convex = useConvex();
  const [adminCache, setAdminCache] = useState<Record<string, Doc<"users">>>({});

  async function loadAdmin(id: Id<"users">) {
    if (adminCache[id]) return;
    const user = await convex.query(api.users.getUserById, { userId: id });
    if (user) setAdminCache((prev) => ({ ...prev, [id]: user }));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">All sensitive admin actions</p>
      </div>

      {logs === undefined ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : logs.page.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No audit logs yet</div>
      ) : (
        <div className="space-y-2">
          {logs.page.map((log) => {
            void loadAdmin(log.adminId);
            const admin = adminCache[log.adminId];
            let meta: Record<string, unknown> = {};
            try { meta = JSON.parse(log.metadata ?? "{}"); } catch { /* ignore */ }
            return (
              <div key={log._id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{ACTION_LABELS[log.action] ?? log.action}</p>
                    <span className="text-xs text-muted-foreground">by @{admin?.username ?? "..."}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {log.entityType} · {log.entityId.slice(-8)}
                    {meta.amount ? ` · PKR ${meta.amount}` : ""}
                    {meta.plan ? ` · ${meta.plan}` : ""}
                    {meta.method ? ` · ${meta.method}` : ""}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground flex-shrink-0">{formatDateTime(log._creationTime)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
