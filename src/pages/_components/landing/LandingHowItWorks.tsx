import { motion } from "motion/react";
import { ArrowDown, BadgeCheck, CreditCard, LayoutDashboard } from "lucide-react";

const steps = [
  { icon: BadgeCheck, title: "Create your account", text: "Register with your details and add a referral code if one was shared with you." },
  { icon: CreditCard, title: "Choose a membership plan", text: "Select a plan and submit your membership payment for review." },
  { icon: LayoutDashboard, title: "Manage your activity", text: "Follow your network, commissions, activity and withdrawals from your dashboard." },
];

export function LandingHowItWorks() {
  return <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-28"><div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">A clear starting point</p><h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">A focused path from membership to activity.</h2><p className="mt-4 text-base leading-7 text-muted-foreground">The experience is intentionally simple: join, submit your selected membership payment for review, then manage the platform activity available to you.</p></div><div className="relative mt-12 grid gap-4 md:grid-cols-3 md:gap-6">{steps.map((step, index) => <motion.article key={step.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.09 }} className="clay-card relative p-6 sm:p-7"><span className="text-xs font-bold tracking-[0.16em] text-primary">0{index + 1}</span><div className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary"><step.icon size={23} /></div><h3 className="mt-6 text-xl font-bold tracking-tight">{step.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>{index < steps.length - 1 && <ArrowDown className="absolute -bottom-7 left-1/2 z-10 -translate-x-1/2 text-primary/60 md:-right-5 md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2 md:-rotate-90" size={20} />}</motion.article>)}</div></div></section>;
}
