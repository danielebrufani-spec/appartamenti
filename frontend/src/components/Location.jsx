import { motion } from "framer-motion";
import { MapPin, ExternalLink, Star, UtensilsCrossed, Bike } from "lucide-react";
import { useLanguage } from "@/i18n";
import { AREA_IMAGES } from "@/data";

const EASE = [0.22, 1, 0.36, 1];
const SERVICE_IMAGES = [AREA_IMAGES.trattoria, AREA_IMAGES.bici];
const SERVICE_ICONS = [UtensilsCrossed, Bike];
const SERVICE_IDS = ["elide", "angelucci"];

export default function Location() {
  const { t } = useLanguage();
  const l = t.location;

  return (
    <section id="posizione" data-testid="location-section" className="py-24 sm:py-32 bg-olive text-cream relative overflow-hidden grain">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold mb-4">{l.eyebrow}</p>
            <h2 className="font-serif text-4xl sm:text-5xl tracking-tight">{l.title}</h2>
            <p className="mt-5 text-cream/75 leading-relaxed max-w-md">{l.sub}</p>

            <ul className="mt-9 flex flex-col divide-y divide-cream/10" data-testid="poi-list">
              {l.points.map((p, i) => (
                <motion.li
                  key={p.name}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <span className="flex items-center gap-3 text-cream/90">
                    <MapPin size={16} className="text-gold shrink-0" /> {p.name}
                  </span>
                  <span className="text-sm text-cream/60 text-right shrink-0">{p.dist}</span>
                </motion.li>
              ))}
            </ul>

            <a
              data-testid="google-maps-link"
              href="https://www.google.com/maps/search/?api=1&query=Via+Risorgimento+29+Santa+Maria+degli+Angeli+Assisi"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-cream/30 hover:bg-cream/10 text-cream font-semibold px-6 py-3 text-sm transition-colors duration-200"
            >
              {l.map} <ExternalLink size={15} />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: EASE }}
            className="relative"
          >
            <div className="absolute -bottom-5 -right-5 w-full h-full rounded-3xl border-2 border-gold/40 -z-0 hidden sm:block" aria-hidden="true" />
            <img
              src={AREA_IMAGES.basilica}
              alt="Basilica di Santa Maria degli Angeli"
              data-testid="location-image"
              className="relative rounded-3xl w-full aspect-[4/3] object-cover shadow-2xl"
            />
            <img
              src={AREA_IMAGES.scorcioFiori}
              alt="Scorcio di Assisi"
              data-testid="location-image-secondary"
              className="absolute -bottom-10 -left-4 sm:-left-10 w-32 sm:w-44 aspect-[3/4] object-cover rounded-2xl border-4 border-cream/90 shadow-xl hidden sm:block"
            />
          </motion.div>
        </div>

        <div className="mt-24 sm:mt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="max-w-2xl"
          >
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold mb-4">{l.servicesEyebrow}</p>
            <h3 className="font-serif text-3xl sm:text-4xl tracking-tight">{l.servicesTitle}</h3>
          </motion.div>

          <div className="mt-10 grid md:grid-cols-2 gap-6" data-testid="location-services">
            {l.services.map((s, i) => {
              const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
              return (
                <motion.article
                  key={s.name}
                  data-testid={`service-card-${SERVICE_IDS[i] || i}`}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
                  className="rounded-3xl overflow-hidden bg-cream/[0.06] border border-cream/15 backdrop-blur-sm"
                >
                  <div className="relative h-52 overflow-hidden">
                    <img src={SERVICE_IMAGES[i % SERVICE_IMAGES.length]} alt={s.name} loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-ink/60 backdrop-blur px-3 py-1.5 text-[11px] font-semibold tracking-widest uppercase text-gold">
                      <Icon size={13} /> {s.tag}
                    </span>
                  </div>
                  <div className="p-6">
                    <h4 className="font-serif text-2xl text-cream">{s.name}</h4>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-cream/70">
                        <MapPin size={14} className="text-gold shrink-0" /> {s.dist}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-gold font-medium">
                        <Star size={14} fill="currentColor" className="shrink-0" />
                        <span data-testid={`service-rating-${SERVICE_IDS[i] || i}`}>{s.rating}</span>
                      </span>
                    </div>
                    <p className="mt-3.5 text-sm text-cream/70 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mt-16"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold mb-5">{l.mapTitle}</p>
          <iframe
            title="Mappa — Appartamenti Brufani, Via Risorgimento 27/A e 29, Santa Maria degli Angeli"
            data-testid="google-map-embed"
            src="https://maps.google.com/maps?q=Via%20Risorgimento%2027%2FA%2C%2006081%20Santa%20Maria%20degli%20Angeli%20PG%2C%20Italia&z=16&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-80 sm:h-96 rounded-3xl border border-cream/15 shadow-2xl"
          />
        </motion.div>
      </div>
    </section>
  );
}
