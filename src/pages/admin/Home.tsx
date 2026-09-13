import { useQuery } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatPKR } from "@/lib/format.ts";
import { Users, ArrowDownLeft, ArrowUpRight, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function AdminHome() {
  const stats = useQuery(api.financial.adminGetStats);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time platform statistics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers} icon={<Users size={18} />} />
        <StatCard label="Active Users" value={stats?.activeUsers} icon={<Users size={18} className="text-primary" />} />
        <StatCard label="Pending Deposits" value={stats?.pendingDeposits} icon={<Clock size={18} className="text-yellow-400" />} urgent={stats?.pendingDeposits ? stats.pendingDeposits > 0 : false} />
        <StatCard label="Pending Withdrawals" value={stats?.pendingWithdrawals} icon={<Clock size={18} className="text-yellow-400" />} urgent={stats?.pendingWithdrawals ? stats.pendingWithdrawals > 0 : false} />
        <StatCard label="Approved Deposits" value={stats?.approvedDeposits} icon={<CheckCircle size={18} className="text-emerald-400" />} />
        <StatCard label="Deposit Volume" value={stats ? formatPKR(stats.totalDepositVolume) : undefined} icon={<ArrowDownLeft size={18} className="text-emerald-400" />} isText />
        <StatCard label="Completed Withdrawals" value={stats?.completedWithdrawals} icon={<CheckCircle size={18} className="text-blue-400" />} />
        <StatCard label="Commission Paid" value={stats ? formatPKR(stats.totalCommissions) : undefined} icon={<TrendingUp size={18} className="text-purple-400" />} isText />
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, urgent, isText,
}: {
  label: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  urgent?: boolean;
  isText?: boolean;
}) {
  return (
    <Card className={urgent ? "border-yellow-500/30" : "border-border"}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          {icon}
        </div>
        {value === undefined ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold">{isText ? value : value.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}
