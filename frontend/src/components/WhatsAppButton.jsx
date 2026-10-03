import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/i18n";
import { WHATSAPP_NUMBER } from "@/data";

export default function WhatsAppButton() {
  const { t } = useLanguage();
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t.whatsappMsg)}`;

  return (
    <motion.a
      data-testid="whatsapp-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.whatsappTooltip}
      title={t.whatsappTooltip}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.8, duration: 0.5 }}
      className="fixed bottom-6 right-6 z-40 group"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" aria-hidden="true" />
      <span className="relative flex w-14 h-14 rounded-full bg-[#25D366] text-white items-center justify-center shadow-[0_10px_30px_-8px_rgba(37,211,102,0.7)] transition-transform duration-300 group-hover:scale-110">
        <MessageCircle size={26} />
      </span>
    </motion.a>
  );
}
