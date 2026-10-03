import { Mail, MapPin, Phone, RefreshCw } from "lucide-react";
import { useLanguage } from "@/i18n";
import { Logo } from "@/components/Header";

export default function Footer() {
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <footer data-testid="site-footer" className="bg-ink text-cream/80 py-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-3 gap-10">
        <div>
          <div className="[&_span]:text-cream [&_span_span]:text-gold">
            <Logo />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-cream/60 max-w-xs">{f.tagline}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.25em] uppercase text-gold mb-5">{f.contacts}</h4>
          <ul className="flex flex-col gap-3.5 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-cream/40" />
              <span data-testid="footer-address">{f.address}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail size={15} className="mt-0.5 shrink-0 text-cream/40" />
              <a data-testid="footer-email" href="mailto:danielebrufani@gmail.com" className="hover:text-cream transition-colors duration-200">danielebrufani@gmail.com</a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone size={15} className="mt-0.5 shrink-0 text-cream/40" />
              <a data-testid="footer-phone" href="tel:+393395020625" className="hover:text-cream transition-colors duration-200">+39 339 502 0625</a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-[0.25em] uppercase text-gold mb-5">Appartamenti Brufani</h4>
          <p className="text-sm text-cream/60 flex items-start gap-2.5">
            <RefreshCw size={15} className="mt-0.5 shrink-0 text-cream/40" />
            {f.syncNote}
          </p>
          <p className="mt-4 text-xs text-cream/40">{f.license}</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 mt-12 pt-7 border-t border-cream/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-cream/40">
        <span>© {new Date().getFullYear()} Appartamenti Brufani. {f.rights}</span>
        <span>Santa Maria degli Angeli · Assisi · Umbria</span>
      </div>
    </footer>
  );
}
