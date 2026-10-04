import { useState } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/i18n";

export function Logo({ compact = false }) {
  return (
    <a href="#top" data-testid="logo-link" className="flex items-center gap-3 group">
      <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl transition-transform duration-300 group-hover:rotate-3 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#2C4231" />
        <path d="M13 45 L21 19 L29 45" fill="none" stroke="#FAF7F2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 36 H25.5" stroke="#E6A15C" strokeWidth="4" strokeLinecap="round" />
        <path d="M36 19 V45" fill="none" stroke="#FAF7F2" strokeWidth="4" strokeLinecap="round" />
        <path d="M36 19 h6.5 a6.5 6.5 0 0 1 0 13 H36" fill="none" stroke="#FAF7F2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 32 h8 a6.5 6.5 0 0 1 0 13 H36" fill="none" stroke="#FAF7F2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 53 H51" stroke="#C85A32" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="logo-name font-serif text-base sm:text-2xl font-semibold tracking-tight text-ink">
            Appartamenti <span className="logo-b text-terracotta">Brufani</span>
          </span>
          <span className="logo-subtitle text-[10px] font-bold tracking-[0.3em] uppercase text-ink/55 mt-1 sm:hidden">
            Assisi
          </span>
          <span className="logo-subtitle hidden sm:block text-xs font-bold tracking-[0.22em] uppercase text-ink/55 mt-1.5">
            Assisi · Holiday Apartments
          </span>
        </span>
      )}
    </a>
  );
}

function openTab(id) {
  window.dispatchEvent(new CustomEvent("open-tab", { detail: id }));
}

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const links = [
    { tab: "brufani", label: t.nav.apartments, testid: "nav-apartments" },
    { tab: "perche", label: t.nav.why, testid: "nav-why" },
    { tab: "posizione", label: t.nav.location, testid: "nav-location" },
    { tab: "recensioni", label: t.nav.reviews, testid: "nav-reviews" },
  ];

  return (
    <header data-testid="site-header" className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl bg-cream/75 border-b border-ink/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4">
        <Logo />
        <nav className="hidden lg:flex items-center gap-7" data-testid="main-nav">
          {links.map((l) => (
            <button
              key={l.tab}
              data-testid={l.testid}
              onClick={() => openTab(l.tab)}
              className="text-sm font-medium text-ink/70 hover:text-terracotta transition-colors duration-200"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div data-testid="language-switcher" className="flex items-center rounded-full border border-ink/10 bg-white/60 p-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                data-testid={`lang-${l.code}`}
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${
                  lang === l.code ? "bg-olive text-cream" : "text-ink/60 hover:text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <motion.button
            data-testid="nav-book-cta"
            whileTap={{ scale: 0.98 }}
            onClick={() => openTab("prenota")}
            className="hidden sm:inline-flex items-center rounded-full bg-terracotta hover:bg-terracotta-dark text-cream text-sm font-semibold px-5 py-2.5 transition-colors duration-200"
          >
            {t.nav.book}
          </motion.button>
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-ink"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <motion.nav
          data-testid="mobile-nav"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden border-t border-ink/5 bg-cream/95 backdrop-blur-xl px-5 py-4 flex flex-col gap-3"
        >
          {links.map((l) => (
            <button
              key={l.tab}
              data-testid={`mobile-${l.testid}`}
              onClick={() => { openTab(l.tab); setOpen(false); }}
              className="text-left text-base font-medium text-ink/80 py-1.5"
            >
              {l.label}
            </button>
          ))}
          <button
            data-testid="mobile-nav-book-cta"
            onClick={() => { openTab("prenota"); setOpen(false); }}
            className="mt-2 rounded-full bg-terracotta text-cream font-semibold px-5 py-3 text-center"
          >
            {t.nav.book}
          </button>
        </motion.nav>
      )}
    </header>
  );
}
