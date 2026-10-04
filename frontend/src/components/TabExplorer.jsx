import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartHandshake, Image as ImageIcon, MapPin, Star, CalendarCheck, ChevronRight, UtensilsCrossed } from "lucide-react";
import { useLanguage } from "@/i18n";
import { APARTMENTS } from "@/data";
import ApartmentPanel from "@/components/ApartmentPanel";
import WhyDirect from "@/components/WhyDirect";
import Hosts from "@/components/Hosts";
import Gallery from "@/components/Gallery";
import Location from "@/components/Location";
import Faq from "@/components/Faq";
import Consigli from "@/components/Consigli";
import Reviews from "@/components/Reviews";
import BookingSection from "@/components/BookingSection";

const EASE = [0.22, 1, 0.36, 1];

const APT_TABS = [
  { id: "brufani", apt: "appartamento-brufani" },
  { id: "brufanidue", apt: "appartamento-brufani-due" },
];

const INFO_TABS = [
  { id: "perche", icon: HeartHandshake },
  { id: "galleria", icon: ImageIcon },
  { id: "posizione", icon: MapPin },
  { id: "consigli", icon: UtensilsCrossed },
  { id: "recensioni", icon: Star },
];

const ALL_IDS = [...APT_TABS.map((x) => x.id), ...INFO_TABS.map((x) => x.id), "prenota"];

export default function TabExplorer() {
  const { t } = useLanguage();
  const [active, setActive] = useState(() =>
    new URLSearchParams(window.location.search).get("pagamento") ? "prenota" : "brufani"
  );
  const rootRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!ALL_IDS.includes(e.detail)) return;
      setActive(e.detail);
      scrollToContent();
    };
    window.addEventListener("open-tab", handler);
    return () => window.removeEventListener("open-tab", handler);
  }, []);

  const scrollToContent = () => {
    requestAnimationFrame(() => {
      const target = window.innerWidth < 1024 ? contentRef.current : rootRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const select = (id) => {
    setActive(id);
    scrollToContent();
  };

  const panels = {
    brufani: <ApartmentPanel aptId="appartamento-brufani" />,
    brufanidue: <ApartmentPanel aptId="appartamento-brufani-due" />,
    perche: (
      <>
        <WhyDirect />
        <Hosts />
        <Faq />
      </>
    ),
    galleria: <Gallery />,
    consigli: <Consigli />,
    posizione: <Location />,
    recensioni: <Reviews />,
  };

  return (
    <div ref={rootRef} data-testid="tab-explorer" className="scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10 items-start">
        <aside data-testid="main-tab-bar" className="lg:sticky lg:top-24 flex flex-col gap-6 mb-8 lg:mb-0">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-terracotta mb-3 px-1">{t.apartments.eyebrow}</p>
            <div className="flex flex-col gap-2.5">
              {APT_TABS.map((tab) => {
                const apt = APARTMENTS.find((x) => x.id === tab.apt);
                const copy = t.apartments[apt.key];
                const isActive = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-testid={`tab-${tab.id}`}
                    onClick={() => select(tab.id)}
                    className={`flex items-center gap-3.5 rounded-2xl border p-3 text-left transition-colors duration-200 ${
                      isActive
                        ? "border-terracotta bg-terracotta text-cream shadow-[0_14px_40px_-14px_rgba(200,90,50,0.55)]"
                        : "border-ink/10 bg-white/80 hover:border-terracotta/40 hover:bg-white"
                    }`}
                  >
                    <img
                      src={apt.main}
                      alt={copy.name}
                      loading="lazy"
                      className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl object-cover shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block font-serif text-lg font-semibold leading-tight ${isActive ? "text-cream" : "text-ink"}`}>
                        {copy.name}
                      </span>
                      <span className={`block text-xs mt-1 leading-snug ${isActive ? "text-cream/85" : "text-ink/55"}`}>
                        {copy.tagline}
                      </span>
                      <span className={`block text-[11px] font-semibold mt-1.5 ${isActive ? "text-gold" : "text-terracotta"}`}>
                        {apt.size} m² · {apt.guests} {t.apartments.guests} · {t.apartments.from} €{apt.price}/{t.apartments.night}
                      </span>
                    </span>
                    <ChevronRight size={18} className={`shrink-0 ${isActive ? "text-cream/80" : "text-ink/25"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-terracotta mb-3 px-1">{t.tabs.explore}</p>
            <div className="flex flex-col gap-2">
              {INFO_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-testid={`tab-${tab.id}`}
                    onClick={() => select(tab.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold text-left transition-colors duration-200 ${
                      isActive
                        ? "border-olive bg-olive text-cream shadow-[0_14px_40px_-14px_rgba(44,66,49,0.55)]"
                        : "border-ink/10 bg-white/80 text-ink/70 hover:border-olive/40 hover:text-ink"
                    }`}
                  >
                    <Icon size={17} className={`shrink-0 ${isActive ? "text-gold" : "text-terracotta"}`} />
                    <span className="flex-1">{t.tabs[tab.id]}</span>
                    <ChevronRight size={16} className={isActive ? "text-cream/70" : "text-ink/20"} />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            data-testid="tab-prenota"
            onClick={() => select("prenota")}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-bold transition-colors duration-200 ${
              active === "prenota"
                ? "border-terracotta bg-terracotta text-cream shadow-[0_14px_40px_-14px_rgba(200,90,50,0.6)]"
                : "border-terracotta/40 bg-terracotta/10 text-terracotta hover:bg-terracotta/15"
            }`}
          >
            <CalendarCheck size={18} className="shrink-0" />
            <span className="flex-1 text-left">{t.tabs.prenota}</span>
            <ChevronRight size={16} />
          </button>
        </aside>

        <div ref={contentRef} className="min-w-0 scroll-mt-24 relative">
          <AnimatePresence mode="wait">
            {active !== "prenota" && (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {panels[active]}
              </motion.div>
            )}
          </AnimatePresence>
          <div className={active === "prenota" ? "" : "hidden"}>
            <BookingSection />
          </div>
        </div>
      </div>
    </div>
  );
}
