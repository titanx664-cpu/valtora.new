import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Network, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

export function LandingHero() {
  return (
    <section id="platform" className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_78%_28%,oklch(0.72_0.18_155_/_0.16),transparent_68%),radial-gradient(ellipse_55%_45%_at_18%_88%,oklch(0.62_0.14_180_/_0.09),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full opacity-[0.18] [background-image:linear-gradient(oklch(0.72_0.18_155_/_0.12)_1px,transparent_1px),linear-gradient(90deg,oklch(0.72_0.18_155_/_0.12)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-14 px-5 py-20 sm:px-6 md:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-8 xl:py-28">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.09 } } }} className="relative z-10 max-w-2xl">
          <motion.div variants={rise} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary">
            <span className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_oklch(0.72_0.18_155)]" /> Membership & referral platform
          </motion.div>
          <motion.h1 variants={rise} transition={{ duration: 0.55 }} className="mt-7 text-5xl font-black tracking-[-0.055em] text-balance leading-[0.97] sm:text-6xl md:text-7xl xl:text-[5.25rem]">
            Build meaningful <span className="text-primary emerald-glow-text">connections.</span><br /> Move with clarity.
          </motion.h1>
          <motion.p variants={rise} transition={{ duration: 0.55 }} className="mt-7 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Valtora brings membership, referral activity, verified payment review and controlled withdrawals into one focused platform.
          </motion.p>
          <motion.div variants={rise} transition={{ duration: 0.5 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 text-sm shadow-[0_14px_36px_oklch(0.72_0.18_155_/_0.2)]"><Link to="/register">Create your account <ArrowRight size={16} /></Link></Button>
            <Button asChild size="lg" variant="secondary" className="h-12 rounded-xl px-6 text-sm"><a href="#plans">Explore membership plans</a></Button>
          </motion.div>
          <motion.div variants={rise} transition={{ duration: 0.5 }} className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
            {['Transparent plan details', 'Two-level referral structure', 'Verified payment review'].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check size={15} className="text-primary" />{item}</span>)}
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.16, ease: "easeOut" }} className="relative mx-auto w-full max-w-[35rem] lg:max-w-none">
          <PlatformVisual />
        </motion.div>
      </div>
    </section>
  );
}

function PlatformVisual() {
  return <div className="relative aspect-[1.02/1] rounded-[2rem] border border-primary/20 bg-card/65 p-4 shadow-[0_35px_100px_oklch(0.03_0.005_155_/_0.8),inset_0_1px_0_oklch(0.95_0.005_155_/_0.06)] backdrop-blur-xl sm:p-6">
    <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_40%,oklch(0.72_0.18_155_/_0.16),transparent_42%)]" />
    <div className="absolute inset-[12%] rounded-full border border-primary/15" />
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 32, repeat: Infinity, ease: "linear" }} className="absolute inset-[18%] rounded-full border border-dashed border-primary/25" />
    <div className="absolute left-[21%] top-[27%] h-px w-[58%] -rotate-[28deg] bg-gradient-to-r from-primary/5 via-primary/60 to-primary/5" />
    <div className="absolute left-[26%] top-[55%] h-px w-[48%] rotate-[31deg] bg-gradient-to-r from-primary/5 via-primary/60 to-primary/5" />
    <div className="absolute left-[50%] top-[49%] size-28 -translate-x-1/2 -translate-y-1/2 rounded-[1.7rem] border border-primary/35 bg-background/70 p-1 shadow-[0_0_70px_oklch(0.72_0.18_155_/_0.25)] sm:size-32">
      <div className="flex size-full items-center justify-center rounded-[1.4rem] bg-primary/15"><WalletCards size={38} className="text-primary sm:size-11" /></div>
    </div>
    <Node className="left-[16%] top-[20%]" label="Members" icon={<Network size={14} />} />
    <Node className="right-[12%] top-[26%]" label="Network" icon={<span className="size-2 rounded-full bg-primary" />} />
    <Node className="bottom-[16%] left-[17%]" label="Activity" icon={<span className="size-2 rounded-full bg-primary" />} />
    <div className="absolute bottom-5 right-5 rounded-2xl border border-border/80 bg-background/75 px-3.5 py-3 backdrop-blur-md sm:bottom-7 sm:right-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Platform ledger</p><p className="mt-1 text-sm font-bold text-foreground">Designed for clarity</p>
    </div>
  </div>;
}

function Node({ className, label, icon }: { className: string; label: string; icon: ReactNode }) {
  return <div className={`absolute ${className} rounded-2xl border border-primary/20 bg-background/80 px-3 py-2.5 shadow-lg backdrop-blur-md`}><div className="flex items-center gap-2 text-xs font-semibold text-foreground"><span className="flex size-6 items-center justify-center rounded-lg bg-primary/15 text-primary">{icon}</span>{label}</div></div>;
}
