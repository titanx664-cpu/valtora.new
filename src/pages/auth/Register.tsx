import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PhoneNumberField } from '@/components/auth/phone-number-field.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.tsx';
import { normalizePhoneNumber } from '@/lib/phone.ts';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase.ts';
import { executeMutation } from '@/lib/supabase-api.ts';

function registrationError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('already registered') || message.includes('already been registered')) return 'An account already exists for this phone number.';
  if (message.includes('network') || message.includes('fetch')) return 'Network error. Check your connection and try again.';
  return 'We could not create your account. Please try again.';
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const [countryCode, setCountryCode] = useState('PK');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') ?? '');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) { toast.error('Supabase is not configured'); return; }
    const phone = normalizePhoneNumber(countryCode, phoneNumber);
    if (!phone) { toast.error('Enter a valid phone number for the selected country.'); return; }
    const uname = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) { toast.error('Username must be 3-20 characters, letters/numbers/underscores'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        phone,
        password,
        options: { data: { name: uname, username: uname, referralCode: referralCode.trim() || null } },
      });
      if (error) throw error;
      if (!data.session) {
        toast.error('Phone confirmation is enabled in Supabase. Disable phone confirmation to use Valtora phone and password sign-up.');
        return;
      }
      await executeMutation('users.registerUser', { username: uname, referralCode: referralCode.trim() || undefined });
      toast.success('Account created successfully!');
      nav('/dashboard');
    } catch (error) {
      toast.error(registrationError(error));
    } finally {
      setLoading(false);
    }
  }

  return <div className="min-h-screen bg-background flex items-center justify-center p-4"><div className="w-full max-w-md space-y-6"><div className="text-center"><span className="text-3xl font-black tracking-tight text-primary emerald-glow-text">VALTORA</span><p className="text-muted-foreground mt-2">Create your account</p></div><Card><CardHeader><CardTitle>Create Account</CardTitle><CardDescription>Set up your Valtora membership.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><PhoneNumberField countryCode={countryCode} number={phoneNumber} onCountryChange={setCountryCode} onNumberChange={setPhoneNumber} /><div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="bg-input" /></div><div className="space-y-2"><Label>Username</Label><Input placeholder="yourname" value={username} onChange={(event) => setUsername(event.target.value)} required className="bg-input" /><p className="text-xs text-muted-foreground">3-20 chars, letters/numbers/underscores</p></div><div className="space-y-2"><Label>Referral Code (optional)</Label><Input placeholder="e.g. JOHN1A2B" value={referralCode} onChange={(event) => setReferralCode(event.target.value)} className="bg-input" /></div><Button className="w-full" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</Button></form><p className="text-sm text-center text-muted-foreground mt-5">Already registered? <Link className="text-primary hover:underline" to="/login">Sign in</Link></p></CardContent></Card></div></div>;
}
