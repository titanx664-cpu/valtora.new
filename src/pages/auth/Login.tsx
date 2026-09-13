import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase.ts';
import { executeMutation } from '@/lib/supabase-api.ts';

export default function LoginPage(){
 const nav=useNavigate(); const location=useLocation(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault(); if(!supabase){toast.error('Supabase is not configured');return;} setLoading(true); const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password}); if(error){setLoading(false);toast.error(error.message);return;} if(data.user){const {data:profile}=await supabase.from('users').select('id').eq('id',data.user.id).maybeSingle(); if(!profile){const meta=data.user.user_metadata||{}; const username=meta.username||meta.name; if(username) await executeMutation('users.registerUser',{username,referralCode:meta.referralCode||undefined});}} setLoading(false); toast.success('Welcome back'); nav((location.state as any)?.from || '/dashboard',{replace:true});}
 return <div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="w-full max-w-md space-y-6"><div className="text-center"><span className="text-3xl font-black tracking-tight text-primary emerald-glow-text">VALTORA</span><p className="text-muted-foreground mt-2">Sign in to your account</p></div><Card><CardHeader><CardTitle>Welcome back</CardTitle><CardDescription>Use your email and password to continue.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="bg-input" /></div><div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="bg-input" /></div><Button className="w-full" disabled={loading}>{loading?'Signing in...':'Sign In'}</Button></form><p className="text-sm text-center text-muted-foreground mt-5">No account? <Link className="text-primary hover:underline" to="/register">Create one</Link></p></CardContent></Card></div></div>
}
