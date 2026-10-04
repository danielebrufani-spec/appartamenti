import { motion } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import { useLanguage } from "@/i18n";

const EASE = [0.22, 1, 0.36, 1];

const HOST_PHOTOS = {
  Oliviero: "/images/hosts/oliviero.webp",
  Nicoletta: "/images/hosts/nicoletta.webp",
  Daniele: "/images/hosts/daniele.webp",
};

export default function Hosts() {
  const { t } = useLanguage();
  const h = t.hosts;

  return (
    <section id="chi-siamo" data-testid="hosts-section" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-4">{h.eyebrow}</p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-ink">{h.title}</h2>
          <p className="mt-5 text-base sm:text-lg text-ink/60 leading-relaxed">{h.desc}</p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5" data-testid="hosts-members">
          {h.members.map((m, i) => (
            <motion.div
              key={m.name}
              data-testid={`host-card-${i}`}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
              whileHover={{ y: -6 }}
              className="rounded-3xl p-7 bg-white border border-ink/5 flex flex-col gap-4"
            >
              {HOST_PHOTOS[m.name] ? (
                <img
                  src={HOST_PHOTOS[m.name]}
                  alt={m.name}
                  data-testid={`host-photo-${i}`}
                  loading="lazy"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-olive/10"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-olive flex items-center justify-center">
                  <span className="font-serif text-2xl font-semibold text-cream">{m.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h3 className="font-serif text-xl font-semibold text-ink">{m.name}</h3>
                <p className="text-xs font-semibold tracking-[0.18em] uppercase text-terracotta mt-1">{m.role}</p>
              </div>
              <p className="text-sm leading-relaxed text-ink/60">{m.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          data-testid="hosts-quote"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="mt-12 flex items-center gap-3 font-serif text-xl sm:text-2xl italic text-olive"
        >
          <HeartHandshake size={26} className="shrink-0 text-terracotta" />
          {h.quote}
        </motion.p>
      </div>
    </section>
  );
}
