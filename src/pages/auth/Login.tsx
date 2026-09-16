import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase.ts';
import { executeMutation } from '@/lib/supabase-api.ts';

function loginError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('network') || message.includes('fetch')) return 'Network error. Check your connection and try again.';
  return 'Authentication failed. Please try again.';
}

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) { toast.error('Supabase is not configured'); return; }
    if (!email.trim()) { toast.error('Enter your email address.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (data.user) {
        const metadata = data.user.user_metadata || {};
        const username = metadata.username || metadata.name;
        const referralCode = typeof metadata.referralCode === 'string' ? metadata.referralCode.trim() : undefined;
        if (username) await executeMutation('users.registerUser', { username, referralCode: referralCode || undefined });
      }
      toast.success('Welcome back');
      nav((location.state as { from?: string } | null)?.from || '/dashboard', { replace: true });
    } catch (error) {
      toast.error(loginError(error));
    } finally {
      setLoading(false);
    }
  }

  return <div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="w-full max-w-md space-y-6"><div className="text-center"><span className="text-3xl font-black tracking-tight text-primary emerald-glow-text">VALTORA</span><p className="text-muted-foreground mt-2">Sign in to your account</p></div><Card><CardHeader><CardTitle>Welcome back</CardTitle><CardDescription>Use your email and password to continue.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="bg-input" /></div><div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="bg-input" /></div><Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button></form><p className="text-sm text-center text-muted-foreground mt-5">No account? <Link className="text-primary hover:underline" to="/register">Create one</Link></p></CardContent></Card></div></div>;
}
