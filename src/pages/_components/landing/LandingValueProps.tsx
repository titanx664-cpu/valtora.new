import { motion } from "motion/react";
import { ShieldCheck, Users, WalletCards } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "Reviewed payment flow", text: "Membership payments are submitted for review before a plan is activated." },
  { icon: Users, title: "Defined two-level network", text: "Your referral structure stays focused on the two levels configured by your active plan." },
  { icon: WalletCards, title: "Clear activity records", text: "Keep your plan, network, commission and withdrawal activity in one place." },
];

export function LandingValueProps() {
  return <section className="relative py-10 sm:py-14"><div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8"><div className="grid gap-4 md:grid-cols-3">{items.map((item, index) => <motion.article key={item.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.42, delay: index * 0.07 }} className="clay-card group p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-primary/25">
    <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><item.icon size={21} /></div><h2 className="mt-5 text-lg font-bold tracking-tight">{item.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
  </motion.article>)}</div></div></section>;
}
