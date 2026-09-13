# Valtora

Valtora is a React + Vite application migrated from the Hercules/Convex implementation to Supabase.

## Stack
- React + TypeScript + Vite
- Tailwind CSS
- Supabase Auth + PostgreSQL + RLS
- Motion, Lucide, Recharts, shadcn-style UI

## Local setup
1. Install Node.js 20+ and pnpm.
2. Copy `.env.example` to `.env.local`.
3. Add your Supabase project URL and browser-safe anon/publishable key.
4. In Supabase SQL Editor, run the SQL migrations in numeric order, including `supabase/migrations/0001_valtora.sql` and `supabase/migrations/0002_correct_plan_payment_wallet_accounting.sql`.
5. Enable Email/Password authentication in Supabase Auth.
6. Register your first account at `/register`.
7. In Supabase SQL Editor, promote it to admin:
   `update public.users set is_admin=true where email='YOUR-ADMIN-EMAIL';`
8. Seed the three original plans from the Admin Plans page, or run the `seed_default_plans` RPC through the app after becoming admin.
9. Configure payment accounts from Admin → Payment Accounts.
10. Run `pnpm install` then `pnpm dev`.

## Security notes
- Never put the Supabase service-role key in `.env.local` for this browser app or in client code.
- Financial mutations are implemented as security-definer PostgreSQL functions and protected by admin checks/RLS.
- Withdrawal day is enforced by PostgreSQL using `Asia/Karachi` time.
- The ledger is the balance source of truth; plan-purchase payments are retained for audit but explicitly excluded from the withdrawable wallet.
- The old Hercules/Convex backend is intentionally removed.

## Deployment
Build with `pnpm build` and deploy the generated `dist/` directory to a static hosting provider. Configure the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time environment variables and enable SPA fallback to `index.html`.
