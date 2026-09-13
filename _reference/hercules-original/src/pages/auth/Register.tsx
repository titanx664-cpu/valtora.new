import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { useQuery } from "convex/react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.72_0.18_155/0.08)_0%,transparent_60%)] pointer-events-none" />
      <AuthLoading>
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="w-full max-w-md text-center space-y-6">
          <div>
            <span className="text-3xl font-bold tracking-tight text-primary emerald-glow-text">VALTORA</span>
            <p className="text-muted-foreground mt-2">Sign in to create your account</p>
          </div>
          <Card className="border-border">
            <CardContent className="pt-6">
              <SignInButton className="w-full" />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <Authenticated>
        <RegisterForm />
      </Authenticated>
    </div>
  );
}

function RegisterForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const registerUser = useMutation(api.users.registerUser);
  const isRegistered = useQuery(api.users.isRegistered);

  const [username, setUsername] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") ?? "");
  const [loading, setLoading] = useState(false);

  if (isRegistered === undefined) return <Skeleton className="h-64 w-full max-w-md" />;
  if (isRegistered) {
    navigate("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
      toast.error("Username must be 3-20 characters, letters/numbers/underscores only");
      return;
    }
    setLoading(true);
    try {
      await registerUser({
        username: username.toLowerCase(),
        referralCode: referralCode.trim() || undefined,
      });
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { code: string; message: string };
        toast.error(data.message);
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <span className="text-3xl font-bold tracking-tight text-primary emerald-glow-text">VALTORA</span>
        <p className="text-muted-foreground mt-2">Complete your registration</p>
      </div>
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Choose a username to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-input"
              />
              <p className="text-xs text-muted-foreground">3-20 chars, letters/numbers/underscores</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Referral Code (optional)</Label>
              <Input
                id="ref"
                placeholder="e.g. JOHN1A2B"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="bg-input"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
