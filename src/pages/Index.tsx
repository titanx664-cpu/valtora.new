import LandingSupportChat from "./_components/LandingSupportChat.tsx";
import { LandingFooter } from "./_components/landing/LandingFooter.tsx";
import { LandingHeader } from "./_components/landing/LandingHeader.tsx";
import { LandingHero } from "./_components/landing/LandingHero.tsx";
import { LandingHowItWorks } from "./_components/landing/LandingHowItWorks.tsx";
import { LandingNetwork } from "./_components/landing/LandingNetwork.tsx";
import { LandingOperations } from "./_components/landing/LandingOperations.tsx";
import { LandingPlans } from "./_components/landing/LandingPlans.tsx";
import { LandingValueProps } from "./_components/landing/LandingValueProps.tsx";
import { useQuery } from "@/lib/data-hooks.tsx";
import { api } from "@/lib/api.ts";

export default function Index() {
  const plans = useQuery(api.plans.getActivePlans);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/30">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingValueProps />
        <LandingHowItWorks />
        <LandingNetwork hasPlans={Boolean(plans?.length)} />
        <LandingPlans plans={plans} />
        <LandingOperations />
      </main>
      <LandingFooter />
      <LandingSupportChat />
    </div>
  );
}
