-- Make withdrawal reservations and their state transitions explicit and atomic.
-- Plan payments remain non-wallet ledger entries; only wallet-impacting ledger
-- credits can fund a withdrawal.

-- One withdrawal must have exactly one debit reservation. Do not silently
-- deduplicate historical financial records: fail this migration for review if
-- an existing database already violates the invariant.
do $$
begin
  if exists (
    select 1
    from public.ledger l
    left join public.withdrawals w on w.id = l.reference_id
    where l.type = 'withdrawal_debit'
      and (
        l.reference_id is null
        or l.reference_type is distinct from 'withdrawal'
        or w.id is null
        or l.user_id <> w.user_id
        or l.amount <> w.amount
        or not l.wallet_impact
        or l.direction <> 'debit'
      )
  ) then
    raise exception 'Cannot harden withdrawals: an existing debit reservation is invalid';
  end if;
  if exists (
    select 1
    from public.withdrawals w
    left join public.ledger l on l.reference_id = w.id and l.type = 'withdrawal_debit'
    group by w.id
    having count(l.id) <> 1
  ) then
    raise exception 'Cannot harden withdrawals: each withdrawal must have one debit reservation';
  end if;
end
$$;

create unique index if not exists ledger_one_withdrawal_debit_idx
  on public.ledger(reference_id)
  where type = 'withdrawal_debit';

alter table public.ledger
  drop constraint if exists ledger_withdrawal_debit_reservation;
alter table public.ledger
  add constraint ledger_withdrawal_debit_reservation
  check (
    type <> 'withdrawal_debit'
    or (wallet_impact = true and direction = 'debit' and reference_type = 'withdrawal')
  );

-- This RPC is the only client-visible balance authority. Pending debit entries
-- are reservations, while reversed debit entries release their reservation.
create or replace function public.get_my_wallet() returns jsonb
language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'balance', greatest(0, coalesce((
      select sum(case when l.direction = 'credit' then l.amount else -l.amount end)
      from public.ledger l
      where l.user_id = auth.uid()
        and l.wallet_impact
        and (l.status = 'completed' or (l.status = 'pending' and l.type = 'withdrawal_debit'))
    ), 0)),
    'totalEarnings', coalesce((select sum(l.amount) from public.ledger l where l.user_id = auth.uid() and l.wallet_impact and l.status = 'completed' and l.direction = 'credit'), 0),
    'totalCommissions', coalesce((select sum(l.amount) from public.ledger l where l.user_id = auth.uid() and l.wallet_impact and l.status = 'completed' and l.type = 'commission'), 0),
    'totalWithdrawals', coalesce((select sum(l.amount) from public.ledger l where l.user_id = auth.uid() and l.wallet_impact and l.status = 'completed' and l.type = 'withdrawal_debit'), 0),
    'pendingDepositsCount', (select count(*) from public.deposits d where d.user_id = auth.uid() and d.status = 'pending'),
    'pendingWithdrawalsCount', (select count(*) from public.withdrawals w where w.user_id = auth.uid() and w.status in ('pending', 'processing')),
    'activePlan', (select d.plan_snapshot from public.deposits d where d.user_id = auth.uid() and d.status = 'approved' order by d.created_at desc limit 1)
  );
$$;

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_account_number text,
  p_account_name text default null,
  p_bank_name text default null,
  p_additional_info text default null
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  available_balance numeric;
  withdrawal_id uuid;
  details jsonb;
begin
  -- The member row is a per-wallet mutex. Every request locks it before
  -- reading reservations and writing its own, so concurrent requests cannot
  -- collectively reserve more than the server-calculated wallet balance.
  select u.id into uid
  from public.users u
  where u.id = auth.uid() and u.is_active
  for update;
  if not found then
    raise exception using message = 'Account inactive or not registered', errcode = 'P0001';
  end if;

  if extract(dow from timezone('Asia/Karachi', now())) <> 0 then
    raise exception using message = 'Withdrawals are only available on Sundays (Asia/Karachi time).', errcode = 'P0001';
  end if;
  -- Reject NaN and fractions that would otherwise be rounded by numeric(12,2)
  -- after the balance comparison.
  if p_amount is null or p_amount = 'NaN'::numeric or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception using message = 'Invalid amount', errcode = 'P0001';
  end if;
  if p_method not in ('Easypaisa', 'JazzCash', 'Bank') then
    raise exception using message = 'Unsupported withdrawal method', errcode = 'P0001';
  end if;
  if nullif(trim(coalesce(p_account_number, '')), '') is null then
    raise exception using message = 'Account number is required', errcode = 'P0001';
  end if;
  if p_method = 'Bank' and nullif(trim(coalesce(p_bank_name, '')), '') is null then
    raise exception using message = 'Bank name is required for bank withdrawals', errcode = 'P0001';
  end if;

  select coalesce(sum(case when l.direction = 'credit' then l.amount else -l.amount end), 0)
  into available_balance
  from public.ledger l
  where l.user_id = uid
    and l.wallet_impact
    and (l.status = 'completed' or (l.status = 'pending' and l.type = 'withdrawal_debit'));
  if p_amount > available_balance then
    raise exception using message = 'Insufficient balance', errcode = 'P0001';
  end if;

  details := jsonb_build_object(
    'accountNumber', trim(p_account_number),
    'accountName', nullif(trim(p_account_name), ''),
    'bankName', nullif(trim(p_bank_name), ''),
    'additionalInfo', nullif(trim(p_additional_info), '')
  );
  insert into public.withdrawals(user_id, amount, method, account_details, submitted_on_sunday)
  values (uid, p_amount, p_method, details, true)
  returning id into withdrawal_id;
  insert into public.ledger(user_id, type, direction, amount, status, wallet_impact, reference_id, reference_type, description)
  values (uid, 'withdrawal_debit', 'debit', p_amount, 'pending', true, withdrawal_id, 'withdrawal',
    format('Withdrawal via %s - pending', p_method));
  insert into public.notifications(user_id, type, title, message, reference_id, reference_type)
  values (uid, 'withdrawal_submitted', 'Withdrawal Requested',
    format('Your withdrawal of PKR %s via %s is pending review. Expected processing time: 6–8 hours.', p_amount, p_method),
    withdrawal_id, 'withdrawal');
  return withdrawal_id;
end
$$;

create or replace function public.admin_process_withdrawal(
  p_withdrawal_id uuid,
  p_action text,
  p_note text default null
) returns void
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  w public.withdrawals%rowtype;
  debit public.ledger%rowtype;
begin
  perform public.require_admin();
  select * into w from public.withdrawals where id = p_withdrawal_id for update;
  if not found then raise exception using message = 'Withdrawal not found', errcode = 'P0001'; end if;
  select * into debit from public.ledger
  where reference_id = w.id and type = 'withdrawal_debit'
  for update;
  if not found or debit.user_id <> w.user_id or debit.amount <> w.amount or not debit.wallet_impact or debit.direction <> 'debit' then
    raise exception using message = 'Withdrawal reservation is invalid', errcode = 'P0001';
  end if;

  if p_action = 'approve' then
    if w.status <> 'pending' or debit.status <> 'pending' then raise exception using message = 'Already processed', errcode = 'P0001'; end if;
    update public.ledger set status = 'completed' where id = debit.id and status = 'pending';
    if not found then raise exception using message = 'Withdrawal reservation changed concurrently', errcode = 'P0001'; end if;
    update public.withdrawals set status = 'processing', reviewed_by = auth.uid(), reviewed_at = now(), admin_note = p_note where id = w.id;
    insert into public.notifications(user_id, type, title, message, reference_id, reference_type)
    values (w.user_id, 'withdrawal_approved', 'Withdrawal Approved',
      format('Your withdrawal of PKR %s is being processed. Expected: 6–8 hours.', w.amount), w.id, 'withdrawal');
  elsif p_action = 'complete' then
    if w.status <> 'processing' or debit.status <> 'completed' then raise exception using message = 'Must be in processing state', errcode = 'P0001'; end if;
    update public.withdrawals set status = 'completed', reviewed_at = now(), admin_note = coalesce(p_note, admin_note) where id = w.id;
    insert into public.notifications(user_id, type, title, message, reference_id, reference_type)
    values (w.user_id, 'withdrawal_completed', 'Withdrawal Completed',
      format('Your withdrawal of PKR %s via %s has been completed.', w.amount, w.method), w.id, 'withdrawal');
  elsif p_action = 'reject' then
    if w.status not in ('pending', 'processing') or debit.status not in ('pending', 'completed') then raise exception using message = 'Already finalized', errcode = 'P0001'; end if;
    update public.ledger set status = 'reversed' where id = debit.id and status in ('pending', 'completed');
    if not found then raise exception using message = 'Withdrawal reservation changed concurrently', errcode = 'P0001'; end if;
    update public.withdrawals set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), admin_note = p_note where id = w.id;
    insert into public.notifications(user_id, type, title, message, reference_id, reference_type)
    values (w.user_id, 'withdrawal_rejected', 'Withdrawal Rejected',
      format('Your withdrawal of PKR %s was rejected.%s', w.amount, case when p_note is null then '' else ' Reason: ' || p_note end), w.id, 'withdrawal');
  else
    raise exception using message = 'Invalid withdrawal action', errcode = 'P0001';
  end if;

  insert into public.audit_logs(admin_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action || '_withdrawal', 'withdrawal', w.id::text,
    jsonb_build_object('amount', w.amount, 'method', w.method));
end
$$;

-- Browser clients may execute the RPC, but the function itself requires the
-- authenticated caller to be an admin; direct table writes remain disallowed
-- by grants and RLS.
revoke execute on function public.admin_process_withdrawal(uuid, text, text) from public;
grant execute on function public.admin_process_withdrawal(uuid, text, text) to authenticated;
