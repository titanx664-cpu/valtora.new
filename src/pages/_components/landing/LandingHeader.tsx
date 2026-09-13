import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Network", href: "#network" },
  { label: "Plans", href: "#plans" },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Valtora home" className="group flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-sm font-black text-primary shadow-[0_0_28px_oklch(0.72_0.18_155_/_0.16)]">V</span>
          <span className="text-lg font-black tracking-[0.08em] text-foreground sm:text-xl">VALTORA</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild variant="ghost" className="h-10 px-4">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild className="h-10 rounded-xl px-4 shadow-[0_10px_30px_oklch(0.72_0.18_155_/_0.18)]">
            <Link to="/register">Get Started <ArrowRight size={15} /></Link>
          </Button>
        </div>

        <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex size-11 items-center justify-center rounded-xl border border-border bg-card/70 text-foreground sm:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
          {menuOpen ? <X size={19} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }} className="border-t border-border/70 bg-background/95 px-5 py-5 backdrop-blur-xl sm:hidden">
            <nav aria-label="Mobile navigation" className="mx-auto flex max-w-7xl flex-col gap-1">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={closeMenu} className="rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
                  {item.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-5">
                <Button asChild variant="secondary" className="h-11 rounded-xl"><Link to="/login" onClick={closeMenu}>Sign In</Link></Button>
                <Button asChild className="h-11 rounded-xl"><Link to="/register" onClick={closeMenu}>Get Started</Link></Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
