import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner.tsx';
import { executeMutation } from '@/lib/supabase-api.ts';
export default function AuthCallback(){const nav=useNavigate(); useEffect(()=>{executeMutation('users.updateCurrentUser').finally(()=>nav('/',{replace:true}));},[nav]); return <div className="flex flex-col items-center justify-center h-svh gap-4"><Spinner className="size-8"/><p className="text-sm text-muted-foreground">Completing sign in…</p></div>}
