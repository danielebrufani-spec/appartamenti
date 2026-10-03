import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "@/i18n";
import { GALLERY } from "@/data";

const EASE = [0.22, 1, 0.36, 1];

export default function Gallery() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);

  return (
    <section id="galleria" data-testid="gallery-section" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl mb-14"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-4">{t.gallery.eyebrow}</p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-ink">{t.gallery.title}</h2>
        </motion.div>

        <div className="columns-2 md:columns-3 gap-4 [column-fill:balance]" data-testid="gallery-grid">
          {GALLERY.map((src, i) => (
            <motion.button
              key={src}
              data-testid={`gallery-item-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: EASE }}
              onClick={() => setSelected(src)}
              className="mb-4 block w-full overflow-hidden rounded-2xl group break-inside-avoid"
            >
              <img
                src={src}
                alt={`Residenza Assisi ${i + 1}`}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${i % 3 === 1 ? "aspect-[3/4]" : "aspect-square"}`}
              />
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            data-testid="gallery-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex items-center justify-center p-5"
          >
            <motion.img
              src={selected}
              alt="Residenza Assisi"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            />
            <button
              data-testid="lightbox-close"
              onClick={() => setSelected(null)}
              className="absolute top-5 right-5 w-11 h-11 rounded-full bg-cream/10 hover:bg-cream/20 text-cream flex items-center justify-center transition-colors duration-200"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
