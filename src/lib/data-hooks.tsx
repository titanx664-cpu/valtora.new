import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { executeQuery, executeMutation } from './supabase-api';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthState { user: SupabaseUser | null; loading: boolean; }
const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: !!supabase });
  useEffect(() => {
    if (!supabase) { setState({ user: null, loading: false }); return; }
    supabase.auth.getSession().then(({ data }) => setState({ user: data.session?.user ?? null, loading: false }));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setState({ user: session?.user ?? null, loading: false }));
    return () => sub.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const { user, loading } = useContext(AuthContext);
  return useMemo(() => ({
    isAuthenticated: !!user,
    isLoading: loading,
    error: null as Error | null,
    signin: async () => { window.location.assign('/login'); },
    signout: async () => { if (supabase) await supabase.auth.signOut(); },
  }), [user, loading]);
}
export function useUser() { return useContext(AuthContext).user; }

export function Authenticated({ children }: { children: React.ReactNode }) { const {user,loading}=useContext(AuthContext); return !loading && user ? <>{children}</> : null; }
export function Unauthenticated({ children }: { children: React.ReactNode }) { const {user,loading}=useContext(AuthContext); return !loading && !user ? <>{children}</> : null; }
export function AuthLoading({ children }: { children: React.ReactNode }) { return useContext(AuthContext).loading ? <>{children}</> : null; }

export function useDataClientAuth() { const {user,loading}=useContext(AuthContext); return { isAuthenticated: !!user, isLoading: loading }; }

export function useQuery(descriptor: { path: string }, args?: any) {
  const [data,setData]=useState<any>(undefined); const [error,setError]=useState<any>(null);
  const {user,loading}=useContext(AuthContext);
  const key=JSON.stringify(args ?? null);
  useEffect(()=>{
    let alive=true;
    if (loading || args === 'skip') return;
    if (!user && !descriptor.path.startsWith('plans.') && !descriptor.path.startsWith('paymentAccounts.')) { setData(null); return; }
    setData(undefined); setError(null);
    executeQuery(descriptor.path,args).then(v=>{if(alive)setData(v)}).catch(e=>{if(alive){setError(e);setData(undefined)}});
    const refresh=()=>executeQuery(descriptor.path,args).then(v=>{if(alive)setData(v)}).catch(()=>{});
    window.addEventListener('valtora:data-changed',refresh);
    return()=>{alive=false;window.removeEventListener('valtora:data-changed',refresh)};
  },[user?.id,loading,descriptor.path,key,args==='skip']);
  if (error) console.error(error);
  return data;
}

export function useMutation(descriptor: { path: string }) {
  return async (args?: any) => { const result=await executeMutation(descriptor.path,args ?? {}); window.dispatchEvent(new Event('valtora:data-changed')); return result; };
}

export function useDataClient() { return { query: (descriptor: {path:string}, args?:any) => executeQuery(descriptor.path,args) }; }
