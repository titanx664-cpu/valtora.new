import { AuthProvider } from "./auth.tsx";
import { DataProvider } from "./data.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <QueryClientProvider>
          <TooltipProvider>
            <Toaster />
            {children}
          </TooltipProvider>
        </QueryClientProvider>
      </DataProvider>
    </AuthProvider>
  );
}
