import { supabase } from './supabase';
import { ConvexError } from './app-error';

const tableMap: Record<string,string> = {
  users:'users', plans:'plans', paymentAccounts:'payment_accounts', deposits:'deposits', withdrawals:'withdrawals', ledger:'ledger', commissions:'commissions', notifications:'notifications', supportChats:'support_chats', supportMessages:'support_messages', auditLogs:'audit_logs'
};
const page=(rows:any[],n=20)=>({page:rows.slice(0,n),isDone:true,continueCursor:''});
const normalize=(row:any)=>{
 if(!row) return row;
 const x={...row};
 const m:any={id:'_id',created_at:'_creationTime',updated_at:'updatedAt',user_id:'userId',plan_id:'planId',transaction_id:'transactionId',plan_snapshot:'planSnapshot',admin_note:'adminNote',reviewed_by:'reviewedBy',reviewed_at:'reviewedAt',commissions_generated:'commissionsGenerated',account_details:'accountDetails',submitted_on_sunday:'submittedOnSunday',reference_id:'referenceId',reference_type:'referenceType',metadata:'metadata',recipient_id:'recipientId',source_user_id:'sourceUserId',deposit_id:'depositId',plan_name:'planName',is_read:'isRead',sender_id:'senderId',sender_role:'senderRole',last_message_at:'lastMessageAt',last_message_preview:'lastMessagePreview',unread_by_admin:'unreadByAdmin',unread_by_user:'unreadByUser',is_admin:'isAdmin',is_active:'isActive',referral_code:'referralCode',referred_by:'referredBy',avatar_url:'avatarUrl',sort_order:'sortOrder',level1_commission:'level1Commission',level2_commission:'level2Commission',account_name:'accountName',account_number:'accountNumber',ip_address:'ipAddress',wallet_impact:'walletImpact'};
 for(const [k,v] of Object.entries(m) as Array<[string,string]>) if(k in x){x[v]=k==='created_at'?new Date(x[k]).getTime():x[k]; delete x[k];}
 return x;
};
const normalizeRows=(rows:any[]|null)=> (rows??[]).map(normalize);
function err(e:any):never { throw new ConvexError({code:e?.code ?? 'ERROR',message:e?.message ?? 'Request failed'}); }
async function me(){ if(!supabase) throw new ConvexError({code:'CONFIG',message:'Supabase is not configured. Copy .env.example to .env.local and add your project URL and anon key.'}); const {data:{user}}=await supabase.auth.getUser(); if(!user) throw new ConvexError({code:'UNAUTHENTICATED',message:'Not authenticated'}); return user; }
async function profileRaw(){const u=await me(); const {data,error}=await supabase!.from('users').select('*').eq('id',u.id).maybeSingle(); if(error) err(error); return data;}
async function profile(){const data=await profileRaw(); return normalize(data);}
async function rpc(name:string,args:any={}){const {data,error}=await supabase!.rpc(name,args); if(error) err(error); return data;}

export async function executeQuery(path:string,args:any={}) {
  if(!supabase) return null;
  const [ns,fn]=path.split('.');
  try {
    if(ns==='users'){
      if(fn==='getCurrentUser') return await profile();
      if(fn==='isRegistered') return !!(await profile());
      if(fn==='getUserById'){ const {data,error}=await supabase.from('users').select('*').eq('id',args.userId).maybeSingle(); if(error)err(error); return normalize(data); }
      if(fn==='adminListUsers'){ const {data,error}=await supabase.from('users').select('*').order('created_at',{ascending:false}).limit(args?.paginationOpts?.numItems??30); if(error)err(error); return page(normalizeRows(data),args?.paginationOpts?.numItems??30); }
    }
    if(ns==='plans'){
      const q=supabase.from('plans').select('*').order('sort_order',{ascending:true});
      const {data,error}=fn==='getActivePlans'?await q.eq('is_active',true):await q; if(error)err(error); return normalizeRows(data);
    }
    if(ns==='paymentAccounts'){
      const q=supabase.from('payment_accounts').select('*').order('sort_order',{ascending:true});
      const {data,error}=fn==='getActivePaymentAccounts'?await q.eq('is_active',true):await q; if(error)err(error); return normalizeRows(data);
    }
    if(ns==='financial'){
      const p=await profileRaw(); if(!p) return null;
      const n=args?.paginationOpts?.numItems??20;
      if(fn==='getMyWallet') return await rpc('get_my_wallet');
      if(fn==='getMyDeposits'){const {data,error}=await supabase.from('deposits').select('*').eq('user_id',p.id).order('created_at',{ascending:false}).limit(n);if(error)err(error);return page(normalizeRows(data),n);}
      if(fn==='getMyLedger'){const {data,error}=await supabase.from('ledger').select('*').eq('user_id',p.id).order('created_at',{ascending:false}).limit(n);if(error)err(error);return page(normalizeRows(data),n);}
      if(fn==='getMyCommissions'){const {data,error}=await supabase.from('commissions').select('*').eq('recipient_id',p.id).order('created_at',{ascending:false}).limit(n);if(error)err(error);return page(normalizeRows(data),n);}
      if(fn==='getMyWithdrawals'){const {data,error}=await supabase.from('withdrawals').select('*').eq('user_id',p.id).order('created_at',{ascending:false}).limit(n);if(error)err(error);return page(normalizeRows(data),n);}
      if(fn==='getMyReferrals') return await rpc('get_my_referrals');
      if(fn==='getMyNotifications'){const {data,error}=await supabase.from('notifications').select('*').eq('user_id',p.id).order('created_at',{ascending:false}).limit(n);if(error)err(error);return page(normalizeRows(data),n);}
      if(fn==='getUnreadCount'){const {count,error}=await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',p.id).eq('is_read',false);if(error)err(error);return count??0;}
      if(fn==='adminGetDeposits'){let q=supabase.from('deposits').select('*').order('created_at',{ascending:false}).limit(n);if(args.status)q=q.eq('status',args.status);const {data,error}=await q;if(error)err(error);return page(normalizeRows(data),n);}
      if(fn==='adminGetWithdrawals'){let q=supabase.from('withdrawals').select('*').order('created_at',{ascending:false}).limit(n);if(args.status)q=q.eq('status',args.status);const {data,error}=await q;if(error)err(error);return page(normalizeRows(data),n);}
      if(fn==='adminGetStats') return await rpc('admin_get_stats');
      if(fn==='adminGetAuditLogs'){const {data,error}=await supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(n);if(error)err(error);return page(normalizeRows(data),n);}
    }
    if(ns==='support'){
      const p=await profileRaw(); if(!p) return null;
      if(fn==='getMyChat'){const {data,error}=await supabase.from('support_chats').select('*').eq('user_id',p.id).maybeSingle();if(error)err(error);return normalize(data);}
      if(fn==='getMyChatMessages'){const {data,error}=await supabase.from('support_messages').select('*').eq('chat_id',args.chatId).order('created_at',{ascending:true});if(error)err(error);return normalizeRows(data);}
      if(fn==='getMyUnreadCount'){const {data,error}=await supabase.from('support_chats').select('unread_by_user').eq('user_id',p.id).maybeSingle();if(error)err(error);return data?.unread_by_user??0;}
      if(fn==='adminTotalUnread') return await rpc('admin_total_unread');
      if(fn==='adminListChats'){ const rows=await rpc('admin_list_chats'); return rows; }
      if(fn==='adminGetMessages'){const {data,error}=await supabase.from('support_messages').select('*').eq('chat_id',args.chatId).order('created_at',{ascending:true});if(error)err(error);return normalizeRows(data);}
    }
    return null;
  } catch(e:any){ if(e instanceof ConvexError) throw e; err(e); }
}

export async function executeMutation(path:string,args:any={}){
  if(!supabase) throw new ConvexError({code:'CONFIG',message:'Supabase is not configured.'});
  try {
    const [ns,fn]=path.split('.');
    if(ns==='users'){
      if(fn==='registerUser'){const u=await me(); return await rpc('register_user',{p_username:args.username,p_referral_code:args.referralCode??null});}
      if(fn==='updateCurrentUser') return await profile();
      if(fn==='updateProfile') return await rpc('update_profile',{p_name:args.name});
      if(fn==='adminSetAdmin') return await rpc('admin_set_admin',{p_user_id:args.userId,p_is_admin:args.isAdmin});
      if(fn==='adminSetActive') return await rpc('admin_set_active',{p_user_id:args.userId,p_is_active:args.isActive});
      if(fn==='seedAdmin') throw new ConvexError({code:'FORBIDDEN',message:'For security, create the first admin directly in Supabase SQL. See README.'});
    }
    if(ns==='plans'){
      if(fn==='seedDefaultPlans') return await rpc('seed_default_plans');
      if(fn==='adminCreatePlan') return await rpc('admin_create_plan',{p_name:args.name,p_price:args.price,p_level1:args.level1Commission,p_level2:args.level2Commission,p_active:args.isActive,p_sort:args.sortOrder});
      if(fn==='adminUpdatePlan') return await rpc('admin_update_plan',{p_plan_id:args.planId,p_name:args.name??null,p_price:args.price??null,p_level1:args.level1Commission??null,p_level2:args.level2Commission??null,p_active:args.isActive??null,p_sort:args.sortOrder??null});
    }
    if(ns==='paymentAccounts'){
      if(fn==='adminCreatePaymentAccount') return await rpc('admin_create_payment_account',{p_method:args.method,p_account_name:args.accountName,p_account_number:args.accountNumber,p_instructions:args.instructions??null,p_active:args.isActive,p_sort:args.sortOrder});
      if(fn==='adminUpdatePaymentAccount') return await rpc('admin_update_payment_account',{p_account_id:args.accountId,p_method:args.method??null,p_account_name:args.accountName??null,p_account_number:args.accountNumber??null,p_instructions:args.instructions??null,p_active:args.isActive??null,p_sort:args.sortOrder??null});
      if(fn==='adminDeletePaymentAccount') return await rpc('admin_delete_payment_account',{p_account_id:args.accountId});
    }
    if(ns==='financial'){
      if(fn==='submitDeposit') return await rpc('submit_deposit',{p_plan_id:args.planId,p_transaction_id:args.transactionId});
      if(fn==='requestWithdrawal') return await rpc('request_withdrawal',{p_amount:args.amount,p_method:args.method,p_account_number:args.accountNumber,p_account_name:args.accountName??null,p_bank_name:args.bankName??null,p_additional_info:args.additionalInfo??null});
      if(fn==='adminApproveDeposit') return await rpc('admin_approve_deposit',{p_deposit_id:args.depositId,p_note:args.note??null});
      if(fn==='adminRejectDeposit') return await rpc('admin_reject_deposit',{p_deposit_id:args.depositId,p_note:args.note??null});
      if(fn==='adminProcessWithdrawal') return await rpc('admin_process_withdrawal',{p_withdrawal_id:args.withdrawalId,p_action:args.action,p_note:args.note??null});
      if(fn==='markNotificationRead') return await rpc('mark_notification_read',{p_notification_id:args.notificationId});
      if(fn==='markAllNotificationsRead') return await rpc('mark_all_notifications_read');
    }
    if(ns==='support'){
      if(fn==='getOrCreateMyChat') return await rpc('get_or_create_my_chat');
      if(fn==='sendMessage') return await rpc('send_support_message',{p_chat_id:args.chatId,p_body:args.body});
      if(fn==='markAdminMessagesRead') return await rpc('mark_admin_messages_read',{p_chat_id:args.chatId});
      if(fn==='adminReply') return await rpc('admin_reply',{p_chat_id:args.chatId,p_body:args.body});
      if(fn==='adminMarkRead') return await rpc('admin_mark_read',{p_chat_id:args.chatId});
      if(fn==='adminSetChatStatus') return await rpc('admin_set_chat_status',{p_chat_id:args.chatId,p_status:args.status});
    }
    throw new ConvexError({code:'NOT_IMPLEMENTED',message:`Unsupported operation: ${path}`});
  } catch(e:any){ if(e instanceof ConvexError) throw e; err(e); }
}
