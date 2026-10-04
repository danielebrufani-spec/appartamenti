import { motion } from "framer-motion";
import { MapPin, Star, UtensilsCrossed, Bike, Sandwich, ShoppingCart, Footprints, Car } from "lucide-react";
import { useLanguage } from "@/i18n";
import { AREA_IMAGES } from "@/data";

const EASE = [0.22, 1, 0.36, 1];
const SERVICE_IMAGES = [AREA_IMAGES.trattoria, AREA_IMAGES.trattoria2, null, AREA_IMAGES.bici];
const SERVICE_ICONS = [UtensilsCrossed, Sandwich, ShoppingCart, Bike];
const SERVICE_IDS = ["elide", "porcellino", "emi", "angelucci"];

export default function Consigli() {
  const { t } = useLanguage();
  const l = t.location;

  return (
    <section id="consigli" data-testid="consigli-section" className="py-16 sm:py-24 bg-olive text-cream relative overflow-hidden grain">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold mb-4">{l.servicesEyebrow}</p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight">{l.servicesTitle}</h2>
        </motion.div>

        <div className="mt-10 grid md:grid-cols-2 gap-6" data-testid="location-services">
          {l.services.map((s, i) => {
            const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
            const img = SERVICE_IMAGES[i % SERVICE_IMAGES.length];
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
                {img && (
                  <div className="relative h-52 overflow-hidden">
                    <img src={img} alt={s.name} loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-ink/60 backdrop-blur px-3 py-1.5 text-[11px] font-semibold tracking-widest uppercase text-gold">
                      <Icon size={13} /> {s.tag}
                    </span>
                  </div>
                )}
                <div className="p-6">
                  {!img && (
                    <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-[11px] font-semibold tracking-widest uppercase text-gold">
                      <Icon size={13} /> {s.tag}
                    </span>
                  )}
                  <h4 className="font-serif text-2xl text-cream">{s.name}</h4>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-cream/70">
                      <MapPin size={14} className="text-gold shrink-0" /> {s.addr}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-cream/70" data-testid={`service-walk-${SERVICE_IDS[i] || i}`}>
                      <Footprints size={14} className="text-gold shrink-0" /> {s.walk}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-cream/70" data-testid={`service-car-${SERVICE_IDS[i] || i}`}>
                      <Car size={14} className="text-gold shrink-0" /> {s.car}
                    </span>
                    {s.rating && (
                      <span className="inline-flex items-center gap-1.5 text-gold font-medium">
                        <Star size={14} fill="currentColor" className="shrink-0" />
                        <span data-testid={`service-rating-${SERVICE_IDS[i] || i}`}>{s.rating}</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-3.5 text-sm text-cream/70 leading-relaxed">{s.desc}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
