import { useLanguage } from "@/i18n";

export default function Marquee() {
  const { t } = useLanguage();
  const items = [...t.marquee, ...t.marquee];
  return (
    <div data-testid="marquee-strip" className="relative overflow-hidden bg-olive py-4 border-y border-olive-light">
      <div className="flex w-max animate-marquee gap-0">
        {items.map((item, i) => (
          <span key={i} className="flex items-center whitespace-nowrap text-cream/90 font-serif italic text-lg sm:text-xl px-6">
            {item}
            <span className="ml-12 inline-block w-1.5 h-1.5 rounded-full bg-gold" aria-hidden="true" />
          </span>
        ))}
      </div>
    </div>
  );
}
