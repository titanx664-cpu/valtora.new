-- Enforce two-level commission invariants without changing plan-payment wallet accounting.

-- Historical data is preserved. Stop safely for manual investigation rather
-- than silently deleting or merging any unexpected duplicate commission rows.
do $$
begin
  if exists (
    select 1
    from public.commissions
    group by deposit_id, level
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce one commission per deposit and level: duplicate historical commission rows exist';
  end if;
end
$$;

create unique index if not exists commissions_one_per_deposit_level_idx
  on public.commissions(deposit_id, level);

-- A commission is wallet income. Correct any legacy misclassification before
-- enforcing this invariant; plan purchase entries remain non-wallet-impacting.
update public.ledger
set wallet_impact = true
where type = 'commission' and wallet_impact = false;

alter table public.ledger
  drop constraint if exists ledger_commission_wallet_credit;
alter table public.ledger
  add constraint ledger_commission_wallet_credit
  check (type <> 'commission' or (wallet_impact = true and direction = 'credit'));

create or replace function public.admin_approve_deposit(p_deposit_id uuid, p_note text default null) returns void
language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  d public.deposits%rowtype;
  depositor public.users%rowtype;
  direct_referrer public.users%rowtype;
  level2_referrer public.users%rowtype;
  nowt timestamptz := now();
  c1 uuid;
  c2 uuid;
  level1_amount numeric;
  level2_amount numeric;
  level1_percentage numeric;
  level2_percentage numeric;
begin
  perform public.require_admin();

  -- The row lock serializes approval attempts for this deposit. Every change
  -- below is in this same transaction, so failed ledger work rolls back the
  -- approval and any pending commission row.
  select * into d from public.deposits where id = p_deposit_id for update;
  if not found then raise exception using message = 'Deposit not found'; end if;
  if d.status <> 'pending' or d.commissions_generated then
    raise exception using message = 'Deposit already processed';
  end if;

  update public.deposits
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = nowt,
      admin_note = p_note, commissions_generated = false
  where id = d.id;

  -- A deposit is a plan purchase/payment, never a member wallet credit.
  insert into public.ledger(user_id, type, direction, amount, status, wallet_impact, reference_id, reference_type, description)
  values (d.user_id, 'deposit', 'credit', d.amount, 'completed', false, d.id, 'deposit',
    format('Plan payment approved — %s plan', d.plan_snapshot->>'name'));

  select * into depositor from public.users where id = d.user_id;
  level1_percentage := (d.plan_snapshot->>'level1Commission')::numeric;
  level2_percentage := (d.plan_snapshot->>'level2Commission')::numeric;

  -- Level 1 is the purchaser's direct referrer only.
  if depositor.referred_by is not null then
    select * into direct_referrer from public.users where id = depositor.referred_by;
    if found then
      level1_amount := round(d.amount * level1_percentage / 100, 2);
      if coalesce(level1_amount, 0) > 0 then
        insert into public.commissions(recipient_id, source_user_id, deposit_id, level, amount, percentage, plan_name, status)
        values (direct_referrer.id, d.user_id, d.id, 1, level1_amount, level1_percentage, d.plan_snapshot->>'name', 'pending')
        returning id into c1;
        insert into public.ledger(user_id, type, direction, amount, status, wallet_impact, reference_id, reference_type, description)
        values (direct_referrer.id, 'commission', 'credit', level1_amount, 'completed', true, c1, 'commission',
          format('Level 1 commission from %s — %s', depositor.username, d.plan_snapshot->>'name'));
        update public.commissions set status = 'credited' where id = c1;
        insert into public.notifications(user_id, type, title, message, reference_id, reference_type)
        values (direct_referrer.id, 'commission_received', 'Commission Earned',
          format('You earned PKR %s Level 1 commission from %s.', level1_amount, depositor.username), c1, 'commission');
      end if;

      -- Level 2 is the direct referrer's referrer. There is intentionally no Level 3 traversal.
      if direct_referrer.referred_by is not null then
        select * into level2_referrer from public.users where id = direct_referrer.referred_by;
        if found then
          level2_amount := round(d.amount * level2_percentage / 100, 2);
          if coalesce(level2_amount, 0) > 0 then
            insert into public.commissions(recipient_id, source_user_id, deposit_id, level, amount, percentage, plan_name, status)
            values (level2_referrer.id, d.user_id, d.id, 2, level2_amount, level2_percentage, d.plan_snapshot->>'name', 'pending')
            returning id into c2;
            insert into public.ledger(user_id, type, direction, amount, status, wallet_impact, reference_id, reference_type, description)
            values (level2_referrer.id, 'commission', 'credit', level2_amount, 'completed', true, c2, 'commission',
              format('Level 2 commission from %s — %s', depositor.username, d.plan_snapshot->>'name'));
            update public.commissions set status = 'credited' where id = c2;
            insert into public.notifications(user_id, type, title, message, reference_id, reference_type)
            values (level2_referrer.id, 'commission_received', 'Commission Earned',
              format('You earned PKR %s Level 2 commission from %s.', level2_amount, depositor.username), c2, 'commission');
          end if;
        end if;
      end if;
    end if;
  end if;

  update public.deposits set commissions_generated = true where id = d.id;
  insert into public.notifications(user_id, type, title, message, reference_id, reference_type)
  values
    (d.user_id, 'deposit_approved', 'Deposit Approved',
      format('Your %s plan deposit of PKR %s has been approved.', d.plan_snapshot->>'name', d.amount), d.id, 'deposit'),
    (d.user_id, 'plan_activated', 'Plan Activated',
      format('Your %s plan is now active!', d.plan_snapshot->>'name'), null, null);
  insert into public.audit_logs(admin_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'approve_deposit', 'deposit', d.id::text,
    jsonb_build_object('amount', d.amount, 'plan', d.plan_snapshot->>'name'));
end
$$;
