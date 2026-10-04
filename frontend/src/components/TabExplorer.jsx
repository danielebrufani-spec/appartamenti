import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Sparkles, HeartHandshake, Image as ImageIcon, MapPin, Star, CalendarCheck } from "lucide-react";
import { useLanguage } from "@/i18n";
import { APARTMENTS } from "@/data";
import ApartmentPanel from "@/components/ApartmentPanel";
import WhyDirect from "@/components/WhyDirect";
import Hosts from "@/components/Hosts";
import Gallery from "@/components/Gallery";
import Location from "@/components/Location";
import Reviews from "@/components/Reviews";
import BookingSection from "@/components/BookingSection";

const EASE = [0.22, 1, 0.36, 1];

const TABS = [
  { id: "brufani", icon: Home, apt: "appartamento-brufani" },
  { id: "brufanidue", icon: Sparkles, apt: "appartamento-brufani-due" },
  { id: "perche", icon: HeartHandshake },
  { id: "galleria", icon: ImageIcon },
  { id: "posizione", icon: MapPin },
  { id: "recensioni", icon: Star },
  { id: "prenota", icon: CalendarCheck, highlight: true },
];

export default function TabExplorer() {
  const { t } = useLanguage();
  const [active, setActive] = useState("brufani");
  const rootRef = useRef(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pagamento")) setActive("prenota");
    const handler = (e) => {
      setActive(e.detail);
      requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener("open-tab", handler);
    return () => window.removeEventListener("open-tab", handler);
  }, []);

  const select = (id, e) => {
    setActive(id);
    e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const panels = {
    brufani: <ApartmentPanel aptId="appartamento-brufani" />,
    brufanidue: <ApartmentPanel aptId="appartamento-brufani-due" />,
    perche: (
      <>
        <WhyDirect />
        <Hosts />
      </>
    ),
    galleria: <Gallery />,
    posizione: <Location />,
    recensioni: <Reviews />,
  };

  return (
    <div ref={rootRef} data-testid="tab-explorer" className="scroll-mt-16 sm:scroll-mt-[72px]">
      <div className="sticky top-16 sm:top-[72px] z-30 px-3 sm:px-6 py-3 bg-cream/80 backdrop-blur-xl border-b border-ink/5">
        <div
          data-testid="main-tab-bar"
          className="max-w-6xl mx-auto flex gap-1.5 overflow-x-auto rounded-full bg-white/70 border border-ink/10 shadow-[0_10px_40px_-18px_rgba(28,33,30,0.3)] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            const apt = tab.apt ? APARTMENTS.find((x) => x.id === tab.apt) : null;
            return (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={(e) => select(tab.id, e)}
                className={`relative flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-200 ${
                  isActive
                    ? tab.highlight
                      ? "bg-olive text-cream shadow-[0_8px_24px_-8px_rgba(44,66,49,0.6)]"
                      : "bg-terracotta text-cream shadow-[0_8px_24px_-8px_rgba(200,90,50,0.6)]"
                    : tab.highlight
                      ? "text-olive hover:bg-olive/10"
                      : "text-ink/60 hover:text-ink hover:bg-ink/5"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span>{t.tabs[tab.id]}</span>
                {apt && (
                  <span className={`hidden xl:inline text-[10px] font-medium ${isActive ? "text-cream/75" : "text-ink/40"}`}>
                    {apt.size} m² · {apt.guests} {t.apartments.guests}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {active !== "prenota" && (
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -32 }}
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
  );
}
