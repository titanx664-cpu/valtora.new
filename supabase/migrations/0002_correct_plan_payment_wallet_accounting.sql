-- Correct plan-payment accounting without deleting deposits or ledger history.
-- Existing approved deposit ledger rows remain auditable but are excluded from wallets.

alter table public.ledger
  add column if not exists wallet_impact boolean not null default true;

update public.ledger
set wallet_impact = false
where type = 'deposit';

alter table public.ledger
  drop constraint if exists ledger_deposit_non_wallet;
alter table public.ledger
  add constraint ledger_deposit_non_wallet
  check (type <> 'deposit' or wallet_impact = false);

create or replace function public.get_my_wallet() returns jsonb
language sql stable security definer set search_path=public as $$
select jsonb_build_object(
  'balance', greatest(0, coalesce((
    select sum(case when direction = 'credit' then amount else -amount end)
    from ledger
    where user_id = auth.uid()
      and wallet_impact
      and (status = 'completed' or (status = 'pending' and type = 'withdrawal_debit'))
  ), 0)),
  'totalEarnings', coalesce((
    select sum(amount) from ledger
    where user_id = auth.uid() and wallet_impact and status = 'completed' and direction = 'credit'
  ), 0),
  'totalCommissions', coalesce((
    select sum(amount) from ledger
    where user_id = auth.uid() and wallet_impact and status = 'completed' and type = 'commission'
  ), 0),
  'totalWithdrawals', coalesce((
    select sum(amount) from ledger
    where user_id = auth.uid() and wallet_impact and status = 'completed' and type = 'withdrawal_debit'
  ), 0),
  'pendingDepositsCount', (select count(*) from deposits where user_id = auth.uid() and status = 'pending'),
  'pendingWithdrawalsCount', (select count(*) from withdrawals where user_id = auth.uid() and status = 'pending'),
  'activePlan', (select plan_snapshot from deposits where user_id = auth.uid() and status = 'approved' order by created_at desc limit 1)
);
$$;

create or replace function public.request_withdrawal(p_amount numeric,p_method text,p_account_number text,p_account_name text default null,p_bank_name text default null,p_additional_info text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); bal numeric; id uuid; details jsonb;
begin
 select id into uid from users where id=auth.uid() and is_active for update;
 if not found then raise exception using message='Account inactive or not registered'; end if;
 if extract(dow from timezone('Asia/Karachi',now())) <> 0 then raise exception using message='Withdrawals are only available on Sundays (Asia/Karachi time).'; end if;
 if p_amount<=0 then raise exception using message='Invalid amount'; end if;
 if p_method not in ('Easypaisa','JazzCash','Bank') then raise exception using message='Unsupported withdrawal method'; end if;
 if trim(coalesce(p_account_number,''))='' then raise exception using message='Account number is required'; end if;
 if p_method='Bank' and trim(coalesce(p_bank_name,''))='' then raise exception using message='Bank name is required for bank withdrawals'; end if;
 select greatest(0,coalesce(sum(case when direction='credit' then amount else -amount end),0)) into bal from ledger where user_id=uid and wallet_impact and (status='completed' or (status='pending' and type='withdrawal_debit'));
 if p_amount>bal then raise exception using message='Insufficient balance'; end if;
 details=jsonb_build_object('accountNumber',trim(p_account_number),'accountName',nullif(trim(p_account_name),''),'bankName',nullif(trim(p_bank_name),''),'additionalInfo',nullif(trim(p_additional_info),''));
 insert into withdrawals(user_id,amount,method,account_details,submitted_on_sunday) values(uid,p_amount,p_method,details,true) returning withdrawals.id into id;
 insert into ledger(user_id,type,direction,amount,status,reference_id,reference_type,description) values(uid,'withdrawal_debit','debit',p_amount,'pending',id,'withdrawal',format('Withdrawal via %s - pending',p_method));
 insert into notifications(user_id,type,title,message,reference_id,reference_type) values(uid,'withdrawal_submitted','Withdrawal Requested',format('Your withdrawal of PKR %s via %s is pending review.',p_amount,p_method),id,'withdrawal');
 return id;
end $$;

create or replace function public.admin_approve_deposit(p_deposit_id uuid,p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare d deposits%rowtype; depositor users%rowtype; l1 users%rowtype; nowt timestamptz:=now(); c1 uuid; c2 uuid; a1 numeric; a2 numeric;
begin
 if not public.is_admin() then raise exception using message='Admin only'; end if;
 select * into d from deposits where id=p_deposit_id for update; if not found then raise exception using message='Deposit not found'; end if;
 if d.status<>'pending' or d.commissions_generated then raise exception using message='Deposit already processed'; end if;
 update deposits set status='approved',reviewed_by=auth.uid(),reviewed_at=nowt,admin_note=p_note,commissions_generated=true where id=d.id;
 insert into ledger(user_id,type,direction,amount,status,wallet_impact,reference_id,reference_type,description) values(d.user_id,'deposit','credit',d.amount,'completed',false,d.id,'deposit',format('Plan payment approved — %s plan',d.plan_snapshot->>'name'));
 insert into notifications(user_id,type,title,message,reference_id,reference_type) values(d.user_id,'deposit_approved','Deposit Approved',format('Your %s plan deposit of PKR %s has been approved.',d.plan_snapshot->>'name',d.amount),d.id,'deposit'),(d.user_id,'plan_activated','Plan Activated',format('Your %s plan is now active!',d.plan_snapshot->>'name'),null,null);
 select * into depositor from users where id=d.user_id;
 if depositor.referred_by is not null then
   a1=round((d.amount*(d.plan_snapshot->>'level1Commission')::numeric/100),2);
   insert into commissions(recipient_id,source_user_id,deposit_id,level,amount,percentage,plan_name,status) values(depositor.referred_by,d.user_id,d.id,1,a1,(d.plan_snapshot->>'level1Commission')::numeric,d.plan_snapshot->>'name','credited') returning id into c1;
   insert into ledger(user_id,type,direction,amount,status,reference_id,reference_type,description) values(depositor.referred_by,'commission','credit',a1,'completed',c1,'commission',format('Level 1 commission from %s — %s',depositor.username,d.plan_snapshot->>'name'));
   insert into notifications(user_id,type,title,message,reference_id,reference_type) values(depositor.referred_by,'commission_received','Commission Earned',format('You earned PKR %s Level 1 commission from %s.',a1,depositor.username),c1,'commission');
   select * into l1 from users where id=depositor.referred_by;
   if l1.referred_by is not null then
     a2=round((d.amount*(d.plan_snapshot->>'level2Commission')::numeric/100),2);
     insert into commissions(recipient_id,source_user_id,deposit_id,level,amount,percentage,plan_name,status) values(l1.referred_by,d.user_id,d.id,2,a2,(d.plan_snapshot->>'level2Commission')::numeric,d.plan_snapshot->>'name','credited') returning id into c2;
     insert into ledger(user_id,type,direction,amount,status,reference_id,reference_type,description) values(l1.referred_by,'commission','credit',a2,'completed',c2,'commission',format('Level 2 commission from %s — %s',depositor.username,d.plan_snapshot->>'name'));
     insert into notifications(user_id,type,title,message,reference_id,reference_type) values(l1.referred_by,'commission_received','Commission Earned',format('You earned PKR %s Level 2 commission from %s.',a2,depositor.username),c2,'commission');
   end if;
 end if;
 insert into audit_logs(admin_id,action,entity_type,entity_id,metadata) values(auth.uid(),'approve_deposit','deposit',d.id::text,jsonb_build_object('amount',d.amount,'plan',d.plan_snapshot->>'name'));
end $$;

create or replace function public.admin_get_stats() returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception using message='Admin only'; end if;
 return jsonb_build_object('totalUsers',(select count(*) from users),'activeUsers',(select count(*) from users where is_active),'pendingDeposits',(select count(*) from deposits where status='pending'),'approvedDeposits',(select count(*) from deposits where status='approved'),'rejectedDeposits',(select count(*) from deposits where status='rejected'),'totalDepositVolume',coalesce((select sum(amount) from deposits where status='approved'),0),'pendingWithdrawals',(select count(*) from withdrawals where status='pending'),'completedWithdrawals',(select count(*) from withdrawals where status='completed'),'totalWithdrawalVolume',coalesce((select sum(amount) from withdrawals where status='completed'),0),'totalCommissions',coalesce((select sum(amount) from commissions),0));
end $$;
