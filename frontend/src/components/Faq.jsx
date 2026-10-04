import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/i18n";

const EASE = [0.22, 1, 0.36, 1];

export default function Faq() {
  const { t } = useLanguage();
  const f = t.faq;

  return (
    <section id="faq" data-testid="faq-section" className="py-24 sm:py-32 bg-stonewarm/60">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mb-12"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-4">{f.eyebrow}</p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-ink">{f.title}</h2>
        </motion.div>

        <Accordion type="single" collapsible className="flex flex-col gap-3">
          {f.items.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              data-testid={`faq-item-${i}`}
              className="rounded-2xl bg-white border border-ink/5 px-6 overflow-hidden"
            >
              <AccordionTrigger data-testid={`faq-question-${i}`} className="text-left font-serif text-lg font-semibold text-ink hover:text-terracotta py-5 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent data-testid={`faq-answer-${i}`} className="text-sm text-ink/65 leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
