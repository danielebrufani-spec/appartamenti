import { useEffect } from "react";
import Lenis from "lenis";
import { LanguageProvider } from "@/i18n";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import TabExplorer from "@/components/TabExplorer";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CheckInPage from "@/components/CheckInPage";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const checkinId = params.get("checkin");
  const checkinToken = params.get("token") || "";

  useEffect(() => {
    if (checkinId) return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [checkinId]);

  return (
    <LanguageProvider>
      {checkinId ? (
        <CheckInPage bookingId={checkinId} token={checkinToken} />
      ) : (
        <div className="min-h-screen bg-cream text-ink overflow-x-clip">
          <Header />
          <main>
            <Hero />
            <Marquee />
            <TabExplorer />
          </main>
          <Footer />
          <WhatsAppButton />
        </div>
      )}
      <Toaster position="top-center" richColors />
    </LanguageProvider>
  );
}
