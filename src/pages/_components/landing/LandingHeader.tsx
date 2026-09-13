import { useEffect, useState } from "react";
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
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const updateScrolledState = () => setHasScrolled(window.scrollY > 8);
    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${hasScrolled ? "border-primary/20 bg-background/88 shadow-[0_12px_36px_oklch(0.03_0.005_155_/_0.38)]" : "border-border/60 bg-background/80"}`}>
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

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden h-10 px-4 sm:inline-flex">
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild className="h-10 rounded-xl px-3 text-xs shadow-[0_10px_30px_oklch(0.72_0.18_155_/_0.18)] sm:px-4 sm:text-sm">
            <Link to="/register">Get Started <ArrowRight className="hidden sm:block" size={15} /></Link>
          </Button>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card/70 text-foreground sm:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={19} /> : <Menu size={20} />}
          </button>
        </div>
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
              <div className="mt-3 border-t border-border pt-5">
                <Button asChild variant="secondary" className="h-11 w-full rounded-xl"><Link to="/login" onClick={closeMenu}>Sign In</Link></Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
