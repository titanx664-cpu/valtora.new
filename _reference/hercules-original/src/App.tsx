import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RegisterPage from "./pages/auth/Register.tsx";
import DashboardLayout from "./pages/dashboard/Layout.tsx";
import DashboardHome from "./pages/dashboard/Home.tsx";
import DepositsPage from "./pages/dashboard/Deposits.tsx";
import WithdrawalsPage from "./pages/dashboard/Withdrawals.tsx";
import ReferralsPage from "./pages/dashboard/Referrals.tsx";
import CommissionsPage from "./pages/dashboard/Commissions.tsx";
import TransactionsPage from "./pages/dashboard/Transactions.tsx";
import NotificationsPage from "./pages/dashboard/Notifications.tsx";
import SettingsPage from "./pages/dashboard/Settings.tsx";
import AdminLayout from "./pages/admin/Layout.tsx";
import AdminHome from "./pages/admin/Home.tsx";
import AdminDeposits from "./pages/admin/Deposits.tsx";
import AdminWithdrawals from "./pages/admin/Withdrawals.tsx";
import AdminUsers from "./pages/admin/Users.tsx";
import AdminPlans from "./pages/admin/Plans.tsx";
import AdminPaymentAccounts from "./pages/admin/PaymentAccounts.tsx";
import AdminAuditLogs from "./pages/admin/AuditLogs.tsx";
import AdminSupport from "./pages/admin/Support.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* User Dashboard */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="deposits" element={<DepositsPage />} />
            <Route path="withdrawals" element={<WithdrawalsPage />} />
            <Route path="referrals" element={<ReferralsPage />} />
            <Route path="commissions" element={<CommissionsPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="deposits" element={<AdminDeposits />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="payment-accounts" element={<AdminPaymentAccounts />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="support" element={<AdminSupport />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
