import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Ruler, Check, ArrowRight, X, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useLanguage } from "@/i18n";
import { APARTMENTS } from "@/data";

const EASE = [0.22, 1, 0.36, 1];

function ApartmentLightbox({ photos, index, name, onClose, onNav }) {
  return (
    <motion.div
      data-testid="apartment-lightbox"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex items-center justify-center p-5"
    >
      <motion.img
        key={photos[index]}
        src={photos[index]}
        alt={name}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[82vh] rounded-2xl object-contain"
      />
      <button
        data-testid="lightbox-close"
        onClick={onClose}
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-colors duration-200"
        aria-label="Close"
      >
        <X size={20} />
      </button>
      {photos.length > 1 && (
        <>
          <button
            data-testid="lightbox-prev"
            onClick={(e) => { e.stopPropagation(); onNav(-1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-colors duration-200"
            aria-label="Previous"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            data-testid="lightbox-next"
            onClick={(e) => { e.stopPropagation(); onNav(1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-colors duration-200"
            aria-label="Next"
          >
            <ChevronRight size={22} />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-cream/70 text-sm font-medium">
            {index + 1} / {photos.length}
          </span>
        </>
      )}
    </motion.div>
  );
}

export default function Apartments() {
  const { t } = useLanguage();
  const a = t.apartments;
  const [lightbox, setLightbox] = useState(null); // { photos, index, name }

  const openLightbox = (apt, copy, idx) => {
    const photos = [...new Set(apt.photos || [apt.main, ...apt.gallery])];
    setLightbox({ photos, index: Math.max(0, photos.indexOf(idx === -1 ? apt.main : (idx === "main" ? apt.main : apt.gallery[idx]))), name: copy.name });
  };

  return (
    <section id="appartamenti" data-testid="apartments-section" className="py-24 sm:py-36">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl mb-16 sm:mb-24"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-4">{a.eyebrow}</p>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-ink">{a.title}</h2>
          <p className="mt-5 text-base sm:text-lg text-ink/60 leading-relaxed">{a.sub}</p>
        </motion.div>

        <div className="flex flex-col gap-24 sm:gap-36">
          {APARTMENTS.map((apt, idx) => {
            const copy = a[apt.key];
            const reversed = idx % 2 === 1;
            return (
              <motion.article
                key={apt.id}
                data-testid={`apartment-card-${apt.id}`}
                initial={{ opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.9, ease: EASE }}
                className={`grid lg:grid-cols-12 gap-8 lg:gap-12 items-center`}
              >
                <div className={`lg:col-span-7 relative ${reversed ? "lg:order-2" : ""}`}>
                  <div className="absolute -top-5 -left-5 w-full h-full rounded-3xl border-2 border-gold/50 -z-10 hidden sm:block" aria-hidden="true" />
                  <button
                    data-testid={`apartment-main-btn-${apt.id}`}
                    onClick={() => openLightbox(apt, copy, "main")}
                    className="block w-full overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(28,33,30,0.4)] group relative"
                  >
                    <motion.img
                      src={apt.main}
                      alt={copy.name}
                      data-testid={`apartment-image-${apt.id}`}
                      whileHover={{ scale: 1.04 }}
                      transition={{ duration: 0.9, ease: EASE }}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <span className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-ink/50 backdrop-blur text-cream flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Expand size={16} />
                    </span>
                  </button>
                  <span className="absolute top-5 left-5 rounded-full bg-olive text-cream text-xs font-bold tracking-wider uppercase px-4 py-2 pointer-events-none">
                    {copy.badge}
                  </span>
                  <div className="mt-4 apt-thumbs" style={{ "--n": apt.gallery.length }} data-testid={`apartment-gallery-${apt.id}`}>
                    {apt.gallery.map((src, gi) => (
                      <button
                        key={gi}
                        data-testid={`apartment-thumb-${apt.id}-${gi}`}
                        onClick={() => openLightbox(apt, copy, gi)}
                        className="overflow-hidden rounded-xl group"
                      >
                        <img
                          src={src}
                          alt={`${copy.name} - foto ${gi + 1}`}
                          loading="lazy"
                          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`lg:col-span-5 ${reversed ? "lg:order-1" : ""}`}>
                  <h3 className="font-serif text-3xl sm:text-4xl font-semibold text-ink">{copy.name}</h3>
                  <p className="mt-2 font-serif italic text-lg text-terracotta">{copy.tagline}</p>
                  <div className="mt-4 flex items-center gap-5 text-sm text-ink/60">
                    <span className="inline-flex items-center gap-1.5"><Users size={15} /> {apt.guests} {a.guests}</span>
                    <span className="inline-flex items-center gap-1.5"><Ruler size={15} /> {apt.size} m²</span>
                    <span className="inline-flex items-baseline gap-1 text-ink font-semibold">
                      {a.from} <span className="font-serif text-2xl text-terracotta">€{apt.price}</span> / {a.night}
                    </span>
                  </div>
                  <p className="mt-5 text-ink/70 leading-relaxed">{copy.desc}</p>
                  <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {copy.amenities.map((am) => (
                      <li key={am} className="flex items-center gap-2 text-sm text-ink/70">
                        <Check size={14} className="text-olive shrink-0" /> {am}
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    data-testid={`apartment-book-${apt.id}`}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("select-apartment", { detail: apt.id }));
                      document.querySelector("#prenota")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-terracotta hover:bg-terracotta-dark text-cream font-semibold px-7 py-3.5 text-sm transition-colors duration-200"
                  >
                    {a.book} <ArrowRight size={16} />
                  </motion.button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <ApartmentLightbox
            photos={lightbox.photos}
            index={lightbox.index}
            name={lightbox.name}
            onClose={() => setLightbox(null)}
            onNav={(dir) => setLightbox((lb) => ({ ...lb, index: (lb.index + dir + lb.photos.length) % lb.photos.length }))}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
