-- Valtora production Supabase schema + security + financial RPCs.
-- Run this migration in Supabase SQL Editor before starting the app.
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  referral_code text not null unique,
  referred_by uuid references public.users(id) on delete set null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_referred_by_idx on public.users(referred_by);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null check (price > 0),
  level1_commission numeric(6,3) not null check (level1_commission >= 0),
  level2_commission numeric(6,3) not null check (level2_commission >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  method text not null,
  account_name text not null,
  account_number text not null,
  instructions text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  plan_snapshot jsonb not null,
  amount numeric(12,2) not null check (amount > 0),
  transaction_id text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  commissions_generated boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists deposits_user_created_idx on public.deposits(user_id, created_at desc);
create index if not exists deposits_status_idx on public.deposits(status);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('Easypaisa','JazzCash','Bank')),
  account_details jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  admin_note text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  submitted_on_sunday boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists withdrawals_user_created_idx on public.withdrawals(user_id, created_at desc);
create index if not exists withdrawals_status_idx on public.withdrawals(status);

create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('deposit','commission','withdrawal_debit','withdrawal_refund','admin_adjustment')),
  direction text not null check (direction in ('credit','debit')),
  amount numeric(12,2) not null check (amount > 0),
  status text not null check (status in ('completed','pending','reversed')),
  -- Plan purchase payments are retained in the ledger for audit/history, but
  -- are not credits to a member's withdrawable wallet.
  wallet_impact boolean not null default true,
  reference_id uuid,
  reference_type text,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  constraint ledger_deposit_non_wallet check (type <> 'deposit' or wallet_impact = false)
);
create index if not exists ledger_user_created_idx on public.ledger(user_id, created_at desc);
create index if not exists ledger_reference_idx on public.ledger(reference_id);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  source_user_id uuid not null references public.users(id) on delete cascade,
  deposit_id uuid not null references public.deposits(id) on delete cascade,
  level integer not null check (level in (1,2)),
  amount numeric(12,2) not null check (amount >= 0),
  percentage numeric(6,3) not null check (percentage >= 0),
  plan_name text not null,
  status text not null check (status in ('pending','credited','reversed')),
  created_at timestamptz not null default now(),
  unique(deposit_id, level, recipient_id)
);
create index if not exists commissions_recipient_created_idx on public.commissions(recipient_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  reference_id uuid,
  reference_type text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read);

create table if not exists public.support_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  subject text,
  status text not null default 'open' check (status in ('open','closed')),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unread_by_admin integer not null default 0,
  unread_by_user integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.support_chats(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user','admin')),
  body text not null check (length(trim(body)) > 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_chat_created_idx on public.support_messages(chat_id, created_at);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists users_touch on public.users; create trigger users_touch before update on public.users for each row execute function public.touch_updated_at();
drop trigger if exists plans_touch on public.plans; create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();
drop trigger if exists payment_accounts_touch on public.payment_accounts; create trigger payment_accounts_touch before update on public.payment_accounts for each row execute function public.touch_updated_at();

create or replace function public.is_admin(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$ select coalesce((select is_admin from public.users where id=uid),false) $$;

-- Authenticated user profile creation is done by the registration RPC so referral validation is server-side.
create or replace function public.register_user(p_username text, p_referral_code text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); ref uuid; code text; uname text := lower(trim(p_username)); existing uuid;
begin
 if uid is null then raise exception using message='Not authenticated', errcode='P0001'; end if;
 if uname !~ '^[a-z0-9_]{3,20}$' then raise exception using message='Username must be 3-20 characters, letters/numbers/underscores', errcode='P0001'; end if;
 select id into existing from users where id=uid; if existing is not null then return existing; end if;
 if exists(select 1 from users where username=uname) then raise exception using message='Username already taken', errcode='P0001'; end if;
 if nullif(trim(p_referral_code),'') is not null then select id into ref from users where referral_code=trim(p_referral_code); if ref is null then raise exception using message='Invalid referral code', errcode='P0001'; end if; end if;
 code := upper(left(regexp_replace(uname,'[^a-z0-9]','','gi'),4)) || upper(substr(encode(gen_random_bytes(3),'hex'),1,4));
 while exists(select 1 from users where referral_code=code) loop code := upper(left(regexp_replace(uname,'[^a-z0-9]','','gi'),4)) || upper(substr(encode(gen_random_bytes(3),'hex'),1,4)); end loop;
 insert into users(id,name,email,username,referral_code,referred_by) select uid, coalesce(raw_user_meta_data->>'name',uname), email, uname, code, ref from auth.users where auth.users.id=uid;
 return uid;
end $$;

create or replace function public.update_profile(p_name text) returns void language plpgsql security definer set search_path=public as $$ begin update users set name=trim(p_name) where id=auth.uid(); if not found then raise exception using message='User not found'; end if; end $$;

create or replace function public.seed_default_plans() returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Admin only'; end if; if exists(select 1 from plans) then return; end if; insert into plans(name,price,level1_commission,level2_commission,sort_order) values ('Starter',400,8,1,1),('Growth',560,10,2,2),('Elite',750,15,4,3); end $$;
create or replace function public.admin_create_plan(p_name text,p_price numeric,p_level1 numeric,p_level2 numeric,p_active boolean,p_sort integer) returns uuid language plpgsql security definer set search_path=public as $$ declare id uuid; begin if not public.is_admin() then raise exception using message='Admin only'; end if; insert into plans(name,price,level1_commission,level2_commission,is_active,sort_order) values(p_name,p_price,p_level1,p_level2,p_active,p_sort) returning plans.id into id; return id; end $$;
create or replace function public.admin_update_plan(p_plan_id uuid,p_name text default null,p_price numeric default null,p_level1 numeric default null,p_level2 numeric default null,p_active boolean default null,p_sort integer default null) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Admin only'; end if; update plans set name=coalesce(p_name,name),price=coalesce(p_price,price),level1_commission=coalesce(p_level1,level1_commission),level2_commission=coalesce(p_level2,level2_commission),is_active=coalesce(p_active,is_active),sort_order=coalesce(p_sort,sort_order) where id=p_plan_id; end $$;

create or replace function public.admin_create_payment_account(p_method text,p_account_name text,p_account_number text,p_instructions text,p_active boolean,p_sort integer) returns uuid language plpgsql security definer set search_path=public as $$ declare id uuid; begin if not public.is_admin() then raise exception using message='Admin only'; end if; insert into payment_accounts(method,account_name,account_number,instructions,is_active,sort_order) values(p_method,p_account_name,p_account_number,p_instructions,p_active,p_sort) returning payment_accounts.id into id; return id; end $$;
create or replace function public.admin_update_payment_account(p_account_id uuid,p_method text default null,p_account_name text default null,p_account_number text default null,p_instructions text default null,p_active boolean default null,p_sort integer default null) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Admin only'; end if; update payment_accounts set method=coalesce(p_method,method),account_name=coalesce(p_account_name,account_name),account_number=coalesce(p_account_number,account_number),instructions=coalesce(p_instructions,instructions),is_active=coalesce(p_active,is_active),sort_order=coalesce(p_sort,sort_order) where id=p_account_id; end $$;
create or replace function public.admin_delete_payment_account(p_account_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Admin only'; end if; delete from payment_accounts where id=p_account_id; end $$;

create or replace function public.submit_deposit(p_plan_id uuid,p_transaction_id text) returns uuid language plpgsql security definer set search_path=public as $$
declare p plans%rowtype; id uuid; uid uuid:=auth.uid(); tx text:=trim(p_transaction_id);
begin
 if not exists(select 1 from users where id=uid and is_active) then raise exception using message='Account inactive or not registered'; end if;
 select * into p from plans where plans.id=p_plan_id and is_active for update; if not found then raise exception using message='Plan not available'; end if;
 if tx='' then raise exception using message='Transaction ID is required'; end if;
 if exists(select 1 from deposits where transaction_id=tx) then raise exception using message='Transaction ID already submitted'; end if;
 insert into deposits(user_id,plan_id,plan_snapshot,amount,transaction_id) values(uid,p.id,jsonb_build_object('name',p.name,'price',p.price,'level1Commission',p.level1_commission,'level2Commission',p.level2_commission),p.price,tx) returning deposits.id into id;
 insert into notifications(user_id,type,title,message,reference_id,reference_type) values(uid,'deposit_submitted','Deposit Submitted',format('Your deposit for %s plan (PKR %s) is under review.',p.name,p.price),id,'deposit');
 return id;
end $$;

create or replace function public.get_my_wallet() returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('balance',greatest(0,coalesce((select sum(case when direction='credit' then amount else -amount end) from ledger where user_id=auth.uid() and wallet_impact and (status='completed' or (status='pending' and type='withdrawal_debit'))),0)),'totalEarnings',coalesce((select sum(amount) from ledger where user_id=auth.uid() and wallet_impact and status='completed' and direction='credit'),0),'totalCommissions',coalesce((select sum(amount) from ledger where user_id=auth.uid() and wallet_impact and status='completed' and type='commission'),0),'totalWithdrawals',coalesce((select sum(amount) from ledger where user_id=auth.uid() and wallet_impact and status='completed' and type='withdrawal_debit'),0),'pendingDepositsCount',(select count(*) from deposits where user_id=auth.uid() and status='pending'),'pendingWithdrawalsCount',(select count(*) from withdrawals where user_id=auth.uid() and status='pending'),'activePlan',(select plan_snapshot from deposits where user_id=auth.uid() and status='approved' order by created_at desc limit 1));
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

create or replace function public.admin_reject_deposit(p_deposit_id uuid,p_note text default null) returns void language plpgsql security definer set search_path=public as $$ declare d deposits%rowtype; begin if not public.is_admin() then raise exception using message='Admin only'; end if; select * into d from deposits where id=p_deposit_id for update; if not found then raise exception using message='Deposit not found'; end if; if d.status<>'pending' then raise exception using message='Deposit already processed'; end if; update deposits set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),admin_note=p_note where id=d.id; insert into notifications(user_id,type,title,message,reference_id,reference_type) values(d.user_id,'deposit_rejected','Deposit Rejected',format('Your deposit for %s plan was rejected.%s',d.plan_snapshot->>'name',case when p_note is null then '' else ' Reason: '||p_note end),d.id,'deposit'); insert into audit_logs(admin_id,action,entity_type,entity_id,metadata) values(auth.uid(),'reject_deposit','deposit',d.id::text,jsonb_build_object('note',p_note)); end $$;

create or replace function public.admin_process_withdrawal(p_withdrawal_id uuid,p_action text,p_note text default null) returns void language plpgsql security definer set search_path=public as $$ declare w withdrawals%rowtype; l ledger%rowtype; begin if not public.is_admin() then raise exception using message='Admin only'; end if; select * into w from withdrawals where id=p_withdrawal_id for update; if not found then raise exception using message='Withdrawal not found'; end if;
 if p_action='approve' then if w.status<>'pending' then raise exception using message='Already processed'; end if; update withdrawals set status='processing',reviewed_by=auth.uid(),reviewed_at=now(),admin_note=p_note where id=w.id; update ledger set status='completed' where reference_id=w.id and type='withdrawal_debit' and status='pending'; insert into notifications(user_id,type,title,message,reference_id,reference_type) values(w.user_id,'withdrawal_approved','Withdrawal Approved',format('Your withdrawal of PKR %s is being processed. Expected: 6-8 hours.',w.amount),w.id,'withdrawal');
 elsif p_action='complete' then if w.status<>'processing' then raise exception using message='Must be in processing state'; end if; update withdrawals set status='completed',reviewed_at=now(),admin_note=coalesce(p_note,admin_note) where id=w.id; insert into notifications(user_id,type,title,message,reference_id,reference_type) values(w.user_id,'withdrawal_completed','Withdrawal Completed',format('Your withdrawal of PKR %s via %s has been completed.',w.amount,w.method),w.id,'withdrawal');
 elsif p_action='reject' then if w.status not in ('pending','processing') then raise exception using message='Already finalized'; end if; update withdrawals set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),admin_note=p_note where id=w.id; update ledger set status='reversed' where reference_id=w.id and type='withdrawal_debit' and status in ('pending','completed'); insert into notifications(user_id,type,title,message,reference_id,reference_type) values(w.user_id,'withdrawal_rejected','Withdrawal Rejected',format('Your withdrawal of PKR %s was rejected.%s',w.amount,case when p_note is null then '' else ' Reason: '||p_note end),w.id,'withdrawal');
 else raise exception using message='Invalid withdrawal action'; end if;
 insert into audit_logs(admin_id,action,entity_type,entity_id,metadata) values(auth.uid(),p_action||'_withdrawal','withdrawal',w.id::text,jsonb_build_object('amount',w.amount,'method',w.method)); end $$;

create or replace function public.mark_notification_read(p_notification_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin update notifications set is_read=true where id=p_notification_id and user_id=auth.uid(); if not found then raise exception using message='Not your notification'; end if; end $$;
create or replace function public.mark_all_notifications_read() returns void language sql security definer set search_path=public as $$ update notifications set is_read=true where user_id=auth.uid() and is_read=false; $$;

create or replace function public.get_my_referrals() returns jsonb language sql stable security definer set search_path=public as $$
with l1 as (select id,name,username,created_at from users where referred_by=auth.uid()), l2 as (select u.id,u.name,u.username,u.created_at from users u join l1 on u.referred_by=l1.id)
select jsonb_build_object('level1',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'username',username,'createdAt',extract(epoch from created_at)*1000)) from l1),'[]'::jsonb),'level2',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'username',username,'createdAt',extract(epoch from created_at)*1000)) from l2),'[]'::jsonb)); $$;

create or replace function public.admin_get_stats() returns jsonb language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Admin only'; end if; return jsonb_build_object('totalUsers',(select count(*) from users),'activeUsers',(select count(*) from users where is_active),'pendingDeposits',(select count(*) from deposits where status='pending'),'approvedDeposits',(select count(*) from deposits where status='approved'),'rejectedDeposits',(select count(*) from deposits where status='rejected'),'totalDepositVolume',coalesce((select sum(amount) from deposits where status='approved'),0),'pendingWithdrawals',(select count(*) from withdrawals where status='pending'),'completedWithdrawals',(select count(*) from withdrawals where status='completed'),'totalWithdrawalVolume',coalesce((select sum(amount) from withdrawals where status='completed'),0),'totalCommissions',coalesce((select sum(amount) from commissions),0)); end $$;
create or replace function public.admin_total_unread() returns integer language sql stable security definer set search_path=public as $$ select case when public.is_admin() then coalesce((select sum(unread_by_admin) from support_chats),0)::integer else 0 end $$;

create or replace function public.get_or_create_my_chat() returns uuid language plpgsql security definer set search_path=public as $$ declare id uuid; begin select support_chats.id into id from support_chats where user_id=auth.uid(); if id is null then insert into support_chats(user_id) values(auth.uid()) returning support_chats.id into id; end if; return id; end $$;
create or replace function public.send_support_message(p_chat_id uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from support_chats where id=p_chat_id and user_id=auth.uid()) then raise exception using message='Chat not found'; end if; if trim(p_body)='' then raise exception using message='Message cannot be empty'; end if; insert into support_messages(chat_id,sender_id,sender_role,body) values(p_chat_id,auth.uid(),'user',trim(p_body)); update support_chats set last_message_at=now(),last_message_preview=left(trim(p_body),80),unread_by_admin=unread_by_admin+1,status='open' where id=p_chat_id; end $$;
create or replace function public.mark_admin_messages_read(p_chat_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin update support_messages set is_read=true where chat_id=p_chat_id and sender_role='admin' and exists(select 1 from support_chats where id=p_chat_id and user_id=auth.uid()); update support_chats set unread_by_user=0 where id=p_chat_id and user_id=auth.uid(); end $$;
create or replace function public.admin_list_chats() returns jsonb language sql stable security definer set search_path=public as $$ select coalesce(jsonb_agg(jsonb_build_object('_id',c.id,'_creationTime',extract(epoch from c.created_at)*1000,'userId',c.user_id,'user',jsonb_build_object('name',u.name,'username',u.username),'subject',c.subject,'status',c.status,'lastMessageAt',c.last_message_at,'lastMessagePreview',c.last_message_preview,'unreadByAdmin',c.unread_by_admin,'unreadByUser',c.unread_by_user) order by c.last_message_at desc),'[]'::jsonb) from support_chats c join users u on u.id=c.user_id where public.is_admin() $$;
create or replace function public.admin_reply(p_chat_id uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Forbidden'; end if; if trim(p_body)='' then raise exception using message='Message cannot be empty'; end if; insert into support_messages(chat_id,sender_id,sender_role,body) values(p_chat_id,auth.uid(),'admin',trim(p_body)); update support_chats set last_message_at=now(),last_message_preview='[Admin] '||left(trim(p_body),70),unread_by_user=unread_by_user+1 where id=p_chat_id; end $$;
create or replace function public.admin_mark_read(p_chat_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Forbidden'; end if; update support_messages set is_read=true where chat_id=p_chat_id and sender_role='user'; update support_chats set unread_by_admin=0 where id=p_chat_id; end $$;
create or replace function public.admin_set_chat_status(p_chat_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Forbidden'; end if; if p_status not in ('open','closed') then raise exception using message='Invalid status'; end if; update support_chats set status=p_status where id=p_chat_id; end $$;

create or replace function public.admin_set_admin(p_user_id uuid,p_is_admin boolean) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Admin only'; end if; update users set is_admin=p_is_admin where id=p_user_id; end $$;
create or replace function public.admin_set_active(p_user_id uuid,p_is_active boolean) returns void language plpgsql security definer set search_path=public as $$ begin if not public.is_admin() then raise exception using message='Admin only'; end if; update users set is_active=p_is_active where id=p_user_id; end $$;

-- RLS
alter table public.users enable row level security; alter table public.plans enable row level security; alter table public.payment_accounts enable row level security; alter table public.deposits enable row level security; alter table public.withdrawals enable row level security; alter table public.ledger enable row level security; alter table public.commissions enable row level security; alter table public.notifications enable row level security; alter table public.support_chats enable row level security; alter table public.support_messages enable row level security; alter table public.audit_logs enable row level security;

drop policy if exists users_select on public.users; create policy users_select on public.users for select to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists plans_select on public.plans; create policy plans_select on public.plans for select to authenticated using (is_active or public.is_admin());
drop policy if exists payment_accounts_select on public.payment_accounts; create policy payment_accounts_select on public.payment_accounts for select to authenticated using (is_active or public.is_admin());
drop policy if exists deposits_select on public.deposits; create policy deposits_select on public.deposits for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists withdrawals_select on public.withdrawals; create policy withdrawals_select on public.withdrawals for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists ledger_select on public.ledger; create policy ledger_select on public.ledger for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists commissions_select on public.commissions; create policy commissions_select on public.commissions for select to authenticated using (recipient_id=auth.uid() or public.is_admin());
drop policy if exists notifications_select on public.notifications; create policy notifications_select on public.notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists support_chats_select on public.support_chats; create policy support_chats_select on public.support_chats for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists support_messages_select on public.support_messages; create policy support_messages_select on public.support_messages for select to authenticated using (sender_id=auth.uid() or public.is_admin() or exists(select 1 from support_chats c where c.id=chat_id and c.user_id=auth.uid()));
drop policy if exists audit_logs_select on public.audit_logs; create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());

-- No direct INSERT/UPDATE/DELETE policies for financial tables: mutations go through security-definer RPCs.
revoke all on all tables in schema public from anon;
grant select on public.plans, public.payment_accounts to authenticated;
grant select on public.users, public.deposits, public.withdrawals, public.ledger, public.commissions, public.notifications, public.support_chats, public.support_messages, public.audit_logs to authenticated;
grant execute on all functions in schema public to authenticated;

-- First admin setup: after registering your account, run exactly this in SQL Editor:
-- update public.users set is_admin=true where email='YOUR-ADMIN-EMAIL';
-- Then remove/comment this line from your local notes; never expose a service-role key in the browser.

drop policy if exists plans_public_select on public.plans;
create policy plans_public_select on public.plans for select to anon using (is_active);
grant select on public.plans to anon;
revoke execute on all functions in schema public from public;
grant execute on all functions in schema public to authenticated;
