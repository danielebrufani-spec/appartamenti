import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, ArrowDown } from "lucide-react";
import { useLanguage } from "@/i18n";
import { IMAGES, APARTMENTS } from "@/data";

const EASE = [0.22, 1, 0.36, 1];

export default function Hero() {
  const { t } = useLanguage();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const lines = [t.hero.line1, t.hero.line2, t.hero.line3];
  const ota = APARTMENTS[0].price * 3;
  const direct = Math.round(ota * 0.85);

  return (
    <section ref={ref} id="top" data-testid="hero-section" className="relative min-h-[100svh] flex items-end overflow-hidden bg-ink grain">
      <motion.div style={{ y: bgY }} className="absolute inset-0">
        <img
          src={IMAGES.hero}
          alt="Assisi, Umbria"
          className="w-full h-full object-cover scale-110"
          data-testid="hero-image"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/35 to-ink/20" />
      </motion.div>

      <motion.div style={{ opacity: fade }} className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24 pt-36">
        <motion.p
          data-testid="hero-eyebrow"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
          className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-gold mb-6"
        >
          {t.hero.eyebrow}
        </motion.p>

        <h1 data-testid="hero-headline" className="font-serif text-cream text-5xl sm:text-6xl lg:text-[5.5rem] leading-[1.02] tracking-tight max-w-4xl [text-shadow:0_2px_30px_rgba(0,0,0,0.55)]">
          {lines.map((line, i) => (
            <span key={i} className="block overflow-hidden pb-1">
              <motion.span
                className={`block ${i === 2 ? "italic text-gold" : ""}`}
                initial={{ y: "115%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3 + i * 0.16, duration: 0.9, ease: EASE }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          data-testid="hero-subheadline"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: EASE }}
          className="mt-6 max-w-xl text-base sm:text-lg text-cream/85 leading-relaxed"
        >
          {t.hero.sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.8, ease: EASE }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <motion.button
            data-testid="hero-cta-availability"
            whileTap={{ scale: 0.98 }}
            onClick={() => document.querySelector("#prenota")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full bg-terracotta hover:bg-terracotta-dark text-cream font-semibold px-8 py-4 text-sm sm:text-base transition-colors duration-200 shadow-[0_12px_40px_-10px_rgba(200,90,50,0.7)]"
          >
            {t.hero.ctaPrimary}
          </motion.button>
          <button
            data-testid="hero-cta-apartments"
            onClick={() => document.querySelector("#appartamenti")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full border border-cream/40 text-cream hover:bg-cream/10 font-semibold px-8 py-4 text-sm sm:text-base transition-colors duration-200"
          >
            {t.hero.ctaSecondary}
          </button>
        </motion.div>

        <motion.div
          data-testid="commission-widget"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.9, ease: EASE }}
          className="mt-12 max-w-md rounded-2xl bg-cream/10 backdrop-blur-md border border-cream/20 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-gold" />
            <span className="text-xs font-semibold tracking-widest uppercase text-cream/80">{t.hero.widgetTitle}</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-cream/60">{t.hero.widgetOta}</p>
              <p className="text-lg text-cream/70 line-through decoration-terracotta-light">€{ota}</p>
            </div>
            <div>
              <p className="text-xs text-cream/60">{t.hero.widgetDirect}</p>
              <p className="text-2xl font-serif font-semibold text-cream">€{direct}</p>
            </div>
            <div data-testid="direct-saving-badge" className="rounded-full bg-gold text-ink text-xs font-bold px-3 py-1.5">
              {t.hero.widgetSave} €{ota - direct}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        className="absolute bottom-6 right-6 sm:right-10 z-10 text-cream/60"
      >
        <ArrowDown size={22} />
      </motion.div>
    </section>
  );
}
