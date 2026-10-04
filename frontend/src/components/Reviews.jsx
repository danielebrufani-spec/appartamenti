import { motion } from "framer-motion";
import { Star, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/i18n";
import { REAL_REVIEWS } from "@/data";

const EASE = [0.22, 1, 0.36, 1];
const AVATAR_COLORS = ["bg-terracotta", "bg-olive", "bg-gold", "bg-terracotta-dark"];

export default function Reviews() {
  const { t } = useLanguage();
  const r = t.reviews;

  return (
    <section id="recensioni" data-testid="reviews-section" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-4">{r.eyebrow}</p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-ink">{r.title}</h2>
          <div data-testid="booking-score-badge" className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-olive/10 border border-olive/20 px-5 py-2.5">
            <Star size={15} className="fill-gold text-gold" />
            <span className="text-sm font-semibold text-olive">{r.scoreBadge}</span>
          </div>
          <p className="mt-3 text-xs text-ink/45">{r.sourceNote}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REAL_REVIEWS.map((rev, i) => (
            <motion.figure
              key={rev.name + rev.date}
              data-testid={`review-card-${i}`}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: (i % 4) * 0.1, ease: EASE }}
              className="rounded-3xl p-6 bg-white border border-ink/5 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-cream font-serif font-semibold text-lg flex items-center justify-center shrink-0`}
                  aria-hidden="true"
                >
                  {rev.name[0]}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{rev.name}</p>
                  <p className="text-xs text-ink/50">{rev.country} · {rev.date}</p>
                </div>
                <span data-testid={`review-score-${i}`} className="ml-auto rounded-lg bg-olive text-cream text-sm font-bold px-2.5 py-1 shrink-0">
                  {rev.score.toFixed(1).replace(".", ",")}
                </span>
              </div>
              <blockquote className="text-ink/75 leading-relaxed text-sm">{rev.text}</blockquote>
              <figcaption className="mt-auto pt-1 flex items-center gap-1.5 text-[11px] text-ink/40">
                <BadgeCheck size={13} className="text-olive shrink-0" />
                {r.verifiedOn}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
