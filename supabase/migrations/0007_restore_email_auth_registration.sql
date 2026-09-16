-- The abandoned phone-auth migration may already have been applied. Retain its
-- nullable phone snapshot to avoid deleting data, but restore the original
-- email-backed profile registration flow.
create or replace function public.register_user(p_username text, p_referral_code text default null) returns uuid
language plpgsql security definer set search_path=pg_catalog, public, pg_temp as $$
declare uid uuid := auth.uid(); ref uuid; code text; uname text := lower(trim(p_username)); existing uuid;
begin
 if uid is null then raise exception using message='Not authenticated', errcode='P0001'; end if;
 if uname !~ '^[a-z0-9_]{3,20}$' then raise exception using message='Username must be 3-20 characters, letters/numbers/underscores', errcode='P0001'; end if;
 select id into existing from public.users where id=uid; if existing is not null then return existing; end if;
 if exists(select 1 from public.users where username=uname) then raise exception using message='Username already taken', errcode='P0001'; end if;
 if nullif(trim(p_referral_code),'') is not null then select id into ref from public.users where referral_code=trim(p_referral_code); if ref is null then raise exception using message='Invalid referral code', errcode='P0001'; end if; end if;
 code := upper(left(regexp_replace(uname,'[^a-z0-9]','','gi'),4)) || upper(substr(encode(gen_random_bytes(3),'hex'),1,4));
 while exists(select 1 from public.users where referral_code=code) loop code := upper(left(regexp_replace(uname,'[^a-z0-9]','','gi'),4)) || upper(substr(encode(gen_random_bytes(3),'hex'),1,4)); end loop;
 insert into public.users(id,name,email,username,referral_code,referred_by) select uid, coalesce(raw_user_meta_data->>'name',uname), email, uname, code, ref from auth.users where auth.users.id=uid;
 return uid;
end $$;
