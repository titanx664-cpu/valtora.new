-- Harden privileged RPC authorization without changing financial accounting.
-- Supabase browser users share the authenticated database role, so every
-- privileged RPC must enforce the caller's auth.uid() in the database.

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(
    uid = auth.uid()
    and (select u.is_admin from public.users u where u.id = auth.uid()),
    false
  )
$$;

create or replace function public.require_admin() returns void
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using message = 'Admin only', errcode = '42501';
  end if;
end
$$;

-- Make read-only admin RPCs reject unauthorized direct calls instead of
-- silently returning empty data. Mutating admin RPCs already check is_admin().
create or replace function public.admin_get_stats() returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'totalUsers', (select count(*) from public.users),
    'activeUsers', (select count(*) from public.users where is_active),
    'pendingDeposits', (select count(*) from public.deposits where status = 'pending'),
    'approvedDeposits', (select count(*) from public.deposits where status = 'approved'),
    'rejectedDeposits', (select count(*) from public.deposits where status = 'rejected'),
    'totalDepositVolume', coalesce((select sum(amount) from public.deposits where status = 'approved'), 0),
    'pendingWithdrawals', (select count(*) from public.withdrawals where status = 'pending'),
    'completedWithdrawals', (select count(*) from public.withdrawals where status = 'completed'),
    'totalWithdrawalVolume', coalesce((select sum(amount) from public.withdrawals where status = 'completed'), 0),
    'totalCommissions', coalesce((select sum(amount) from public.commissions), 0)
  );
end
$$;

create or replace function public.admin_total_unread() returns integer
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  perform public.require_admin();
  return coalesce((select sum(unread_by_admin) from public.support_chats), 0)::integer;
end
$$;

create or replace function public.admin_list_chats() returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      '_id', c.id,
      '_creationTime', extract(epoch from c.created_at) * 1000,
      'userId', c.user_id,
      'user', jsonb_build_object('name', u.name, 'username', u.username),
      'subject', c.subject,
      'status', c.status,
      'lastMessageAt', c.last_message_at,
      'lastMessagePreview', c.last_message_preview,
      'unreadByAdmin', c.unread_by_admin,
      'unreadByUser', c.unread_by_user
    ) order by c.last_message_at desc)
    from public.support_chats c
    join public.users u on u.id = c.user_id
  ), '[]'::jsonb);
end
$$;

-- Existing SECURITY DEFINER functions retain their behavior but receive an
-- explicit safe path with pg_temp last, preventing temporary-object shadowing.
alter function public.register_user(text, text) set search_path to pg_catalog, public, pg_temp;
alter function public.update_profile(text) set search_path to pg_catalog, public, pg_temp;
alter function public.seed_default_plans() set search_path to pg_catalog, public, pg_temp;
alter function public.admin_create_plan(text, numeric, numeric, numeric, boolean, integer) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_update_plan(uuid, text, numeric, numeric, numeric, boolean, integer) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_create_payment_account(text, text, text, text, boolean, integer) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_update_payment_account(uuid, text, text, text, text, boolean, integer) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_delete_payment_account(uuid) set search_path to pg_catalog, public, pg_temp;
alter function public.submit_deposit(uuid, text) set search_path to pg_catalog, public, pg_temp;
alter function public.get_my_wallet() set search_path to pg_catalog, public, pg_temp;
alter function public.request_withdrawal(numeric, text, text, text, text, text) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_approve_deposit(uuid, text) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_reject_deposit(uuid, text) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_process_withdrawal(uuid, text, text) set search_path to pg_catalog, public, pg_temp;
alter function public.mark_notification_read(uuid) set search_path to pg_catalog, public, pg_temp;
alter function public.mark_all_notifications_read() set search_path to pg_catalog, public, pg_temp;
alter function public.get_my_referrals() set search_path to pg_catalog, public, pg_temp;
alter function public.get_or_create_my_chat() set search_path to pg_catalog, public, pg_temp;
alter function public.send_support_message(uuid, text) set search_path to pg_catalog, public, pg_temp;
alter function public.mark_admin_messages_read(uuid) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_reply(uuid, text) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_mark_read(uuid) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_set_chat_status(uuid, text) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_set_admin(uuid, boolean) set search_path to pg_catalog, public, pg_temp;
alter function public.admin_set_active(uuid, boolean) set search_path to pg_catalog, public, pg_temp;

-- No browser user may call the authorization helper directly. Admin RPCs are
-- executable by authenticated users solely so the existing browser admin UI
-- continues to work; each one authorizes auth.uid() inside SECURITY DEFINER.
revoke execute on function public.require_admin() from public, authenticated;
revoke execute on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

revoke execute on function public.seed_default_plans() from public;
revoke execute on function public.admin_create_plan(text, numeric, numeric, numeric, boolean, integer) from public;
revoke execute on function public.admin_update_plan(uuid, text, numeric, numeric, numeric, boolean, integer) from public;
revoke execute on function public.admin_create_payment_account(text, text, text, text, boolean, integer) from public;
revoke execute on function public.admin_update_payment_account(uuid, text, text, text, text, boolean, integer) from public;
revoke execute on function public.admin_delete_payment_account(uuid) from public;
revoke execute on function public.admin_approve_deposit(uuid, text) from public;
revoke execute on function public.admin_reject_deposit(uuid, text) from public;
revoke execute on function public.admin_process_withdrawal(uuid, text, text) from public;
revoke execute on function public.admin_get_stats() from public;
revoke execute on function public.admin_total_unread() from public;
revoke execute on function public.admin_list_chats() from public;
revoke execute on function public.admin_reply(uuid, text) from public;
revoke execute on function public.admin_mark_read(uuid) from public;
revoke execute on function public.admin_set_chat_status(uuid, text) from public;
revoke execute on function public.admin_set_admin(uuid, boolean) from public;
revoke execute on function public.admin_set_active(uuid, boolean) from public;
