import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MapPin, Star, UtensilsCrossed, Bike, Sandwich, ShoppingCart, Footprints, Car, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "@/i18n";
import { AREA_IMAGES } from "@/data";

const EASE = [0.22, 1, 0.36, 1];

const ELIDE_PHOTOS = [1, 2, 3, 4, 5].map((n) => `/images/consigli/elide-${n}.webp`);
const PORCELLINO_PHOTOS = [1, 2, 3, 4, 5].map((n) => `/images/consigli/porcellino-${n}.webp`);
const SERVICE_MEDIA = [ELIDE_PHOTOS, PORCELLINO_PHOTOS, [], [AREA_IMAGES.bici]];
const SERVICE_ICONS = [UtensilsCrossed, Sandwich, ShoppingCart, Bike];
const SERVICE_IDS = ["elide", "porcellino", "emi", "angelucci"];

function ServicePhotos({ images, name, tag, Icon, sid }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  if (!images.length) return null;

  const nav = (dir, e) => {
    e.stopPropagation();
    setIdx((i) => (i + dir + images.length) % images.length);
  };

  return (
    <>
      <div className="relative h-52 overflow-hidden group" data-testid={`service-photos-${sid}`}>
        <button className="block w-full h-full" onClick={() => setZoom(true)} aria-label={name}>
          <img
            key={images[idx]}
            src={images[idx]}
            alt={`${name} - foto ${idx + 1}`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </button>
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-ink/60 backdrop-blur px-3 py-1.5 text-[11px] font-semibold tracking-widest uppercase text-gold pointer-events-none">
          <Icon size={13} /> {tag}
        </span>
        {images.length > 1 && (
          <>
            <button
              data-testid={`service-photo-prev-${sid}`}
              onClick={(e) => nav(-1, e)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/55 hover:bg-ink/75 text-cream flex items-center justify-center transition-colors duration-200"
              aria-label="Foto precedente"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              data-testid={`service-photo-next-${sid}`}
              onClick={(e) => nav(1, e)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/55 hover:bg-ink/75 text-cream flex items-center justify-center transition-colors duration-200"
              aria-label="Foto successiva"
            >
              <ChevronRight size={16} />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/55 text-cream/90 text-[11px] font-semibold px-2.5 py-1 pointer-events-none">
              {idx + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      {zoom &&
        createPortal(
          <motion.div
            data-testid={`service-lightbox-${sid}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(false)}
            className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex items-center justify-center p-5"
          >
            <motion.img
              key={images[idx]}
              src={images[idx]}
              alt={name}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[82vh] rounded-2xl object-contain"
            />
            <button
              data-testid="service-lightbox-close"
              onClick={() => setZoom(false)}
              className="absolute top-5 right-5 w-11 h-11 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-colors duration-200"
              aria-label="Chiudi"
            >
              <X size={20} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => nav(-1, e)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-colors duration-200"
                  aria-label="Precedente"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={(e) => nav(1, e)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-colors duration-200"
                  aria-label="Successiva"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </motion.div>,
          document.body
        )}
    </>
  );
}

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
            const images = SERVICE_MEDIA[i % SERVICE_MEDIA.length];
            const sid = SERVICE_IDS[i] || i;
            return (
              <motion.article
                key={s.name}
                data-testid={`service-card-${sid}`}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
                className="rounded-3xl overflow-hidden bg-cream/[0.06] border border-cream/15 backdrop-blur-sm"
              >
                <ServicePhotos images={images} name={s.name} tag={s.tag} Icon={Icon} sid={sid} />
                <div className="p-6">
                  {!images.length && (
                    <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1.5 text-[11px] font-semibold tracking-widest uppercase text-gold">
                      <Icon size={13} /> {s.tag}
                    </span>
                  )}
                  <h4 className="font-serif text-2xl text-cream">{s.name}</h4>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-cream/70">
                      <MapPin size={14} className="text-gold shrink-0" /> {s.addr}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-cream/70" data-testid={`service-walk-${sid}`}>
                      <Footprints size={14} className="text-gold shrink-0" /> {s.walk}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-cream/70" data-testid={`service-car-${sid}`}>
                      <Car size={14} className="text-gold shrink-0" /> {s.car}
                    </span>
                    {s.rating && (
                      <span className="inline-flex items-center gap-1.5 text-gold font-medium">
                        <Star size={14} fill="currentColor" className="shrink-0" />
                        <span data-testid={`service-rating-${sid}`}>{s.rating}</span>
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
