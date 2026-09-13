import { forwardRef, useEffect } from "react";
import { type VariantProps } from "class-variance-authority";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/data-hooks.tsx";
import { Button, buttonVariants } from "@/components/ui/button.tsx";

export interface SignInButtonProps extends Omit<React.ComponentProps<"button">, "onClick">, VariantProps<typeof buttonVariants> {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showIcon?: boolean; signInText?: string; signOutText?: string; loadingText?: string; asChild?: boolean;
}
export const SignInButton = forwardRef<HTMLButtonElement, SignInButtonProps>(({onClick,disabled,showIcon=true,signInText="Sign In",signOutText="Sign Out",loadingText,className,variant,size,asChild=false,...props},ref)=>{
 const {isAuthenticated,signin,signout,isLoading,error}=useAuth();
 useEffect(()=>{if(error) toast.error(error.message);},[error]);
 const handleClick=async(e:React.MouseEvent<HTMLButtonElement>)=>{onClick?.(e); try{if(isAuthenticated) await signout(); else await signin();}catch(err){console.error(err);}};
 const label=isLoading?(loadingText || (isAuthenticated?"Signing Out...":"Signing In...")):(isAuthenticated?signOutText:signInText);
 return <Button ref={ref} onClick={handleClick} disabled={disabled||isLoading} variant={variant} size={size} className={className} asChild={asChild} {...props}>{showIcon&&(isLoading?<Loader2 className="size-4 animate-spin"/>:isAuthenticated?<LogOut className="size-4"/>:<LogIn className="size-4"/>)}{label}</Button>;
});
SignInButton.displayName="SignInButton";
