import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useLanguage } from "@/i18n";
import { REVIEW_AVATARS } from "@/data";

const EASE = [0.22, 1, 0.36, 1];

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
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {r.items.map((rev, i) => (
            <motion.figure
              key={rev.name}
              data-testid={`review-card-${i}`}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
              className={`rounded-3xl p-8 bg-white border border-ink/5 flex flex-col gap-5 ${i === 1 ? "md:-translate-y-4 shadow-[0_24px_60px_-24px_rgba(28,33,30,0.25)]" : ""}`}
            >
              <Quote size={26} className="text-gold" aria-hidden="true" />
              <blockquote className="text-ink/75 leading-relaxed text-[15px]">{rev.text}</blockquote>
              <figcaption className="mt-auto flex items-center gap-3.5 pt-2">
                <img src={REVIEW_AVATARS[i]} alt={rev.name} className="w-11 h-11 rounded-full object-cover" loading="lazy" />
                <div>
                  <p className="text-sm font-semibold text-ink">{rev.name}</p>
                  <p className="text-xs text-ink/50">{rev.from}</p>
                </div>
                <div className="ml-auto flex gap-0.5" aria-label="5 stars">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} size={13} className="fill-gold text-gold" />
                  ))}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
