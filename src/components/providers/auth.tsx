import { AuthProvider as SupabaseAuthProvider } from "@/lib/data-hooks.tsx";
export function AuthProvider({ children }: { children: React.ReactNode }) { return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>; }
