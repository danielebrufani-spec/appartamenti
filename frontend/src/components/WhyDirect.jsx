import { motion } from "framer-motion";
import { BadgePercent, Car, MessagesSquare, CalendarClock } from "lucide-react";
import { useLanguage } from "@/i18n";

const EASE = [0.22, 1, 0.36, 1];
const ICONS = [BadgePercent, Car, MessagesSquare, CalendarClock];

export default function WhyDirect() {
  const { t } = useLanguage();
  const w = t.why;

  return (
    <section id="perche-diretto" data-testid="why-direct-section" className="py-24 sm:py-32 bg-stonewarm/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-4">{w.eyebrow}</p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-ink">{w.title}</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="why-bento">
          {w.cards.map((card, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div
                key={card.title}
                data-testid={`why-card-${i}`}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
                whileHover={{ y: -6 }}
                className={`rounded-3xl p-7 flex flex-col gap-4 min-h-[220px] ${
                  i === 0
                    ? "bg-terracotta text-cream sm:col-span-2 lg:col-span-1"
                    : "bg-white border border-ink/5 text-ink"
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${i === 0 ? "bg-cream/15" : "bg-olive/10"}`}>
                  <Icon size={20} className={i === 0 ? "text-cream" : "text-olive"} />
                </div>
                <h3 className="font-serif text-xl font-semibold">{card.title}</h3>
                <p className={`text-sm leading-relaxed ${i === 0 ? "text-cream/85" : "text-ink/60"}`}>{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
