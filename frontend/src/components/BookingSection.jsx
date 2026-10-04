import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { it as localeIt, enUS, de as localeDe, es as localeEs } from "date-fns/locale";
import { differenceInCalendarDays, format } from "date-fns";
import { RefreshCw, CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import { APARTMENTS, API } from "@/data";

const EASE = [0.22, 1, 0.36, 1];
const LOCALES = { it: localeIt, en: enUS, de: localeDe, es: localeEs };

export default function BookingSection() {
  const { lang, t } = useLanguage();
  const b = t.booking;

  const [apartmentId, setApartmentId] = useState(APARTMENTS[0].id);
  const [range, setRange] = useState(undefined);
  const [blocked, setBlocked] = useState([]);
  const [guests, setGuests] = useState(2);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [statusForm, setStatusForm] = useState({ code: "", email: "" });
  const [statusResult, setStatusResult] = useState(null);
  const [statusError, setStatusError] = useState(false);

  const apt = APARTMENTS.find((x) => x.id === apartmentId);

  const toasted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const esito = params.get("pagamento");
    const sessionId = params.get("session_id");
    if (!esito) return;
    if (esito === "annullato") {
      window.history.replaceState({}, "", window.location.pathname + "#prenota");
      setTimeout(() => {
        if (!toasted.current) {
          toasted.current = true;
          toast.error(b.payCancelled);
        }
      }, 150);
      return;
    }
    if (esito === "successo" && sessionId) {
      setVerifying(true);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts += 1;
        try {
          const r = await fetch(`${API}/payments/status/${sessionId}`);
          if (r.ok) {
            const d = await r.json();
            if (d.payment_status === "paid" && d.booking) {
              clearInterval(poll);
              setVerifying(false);
              setConfirmed(d.booking);
              if (!toasted.current) {
                toasted.current = true;
                toast.success(b.paySuccessTitle);
              }
              window.history.replaceState({}, "", window.location.pathname + "#prenota");
              return;
            }
          }
        } catch { /* riprova */ }
        if (attempts >= 10) {
          clearInterval(poll);
          setVerifying(false);
          toast.error(b.errorGeneric);
        }
      }, 2000);
      return () => clearInterval(poll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e) => setApartmentId(e.detail);
    window.addEventListener("select-apartment", handler);
    return () => window.removeEventListener("select-apartment", handler);
  }, []);

  useEffect(() => {
    fetch(`${API}/availability?apartment_id=${apartmentId}`)
      .then((r) => r.json())
      .then((d) => setBlocked((d.blocked || []).map((s) => new Date(s + "T12:00:00"))))
      .catch(() => setBlocked([]));
  }, [apartmentId]);

  const nights = useMemo(() => {
    if (range?.from && range?.to) return differenceInCalendarDays(range.to, range.from);
    return 0;
  }, [range]);

  const nightly = apt.price + Math.max(0, guests - apt.baseGuests) * apt.extraGuest;
  const stay = nightly * nights;
  const directStay = stay;
  const otaStay = Math.round(stay * 1.15);
  const cityTax = 3 * guests * Math.min(nights, 3);
  const otaTotal = otaStay + cityTax;
  const directTotal = directStay + cityTax;

  const submit = async (e) => {
    e.preventDefault();
    if (!range?.from || !range?.to || nights < 1) {
      toast.error(b.errorDates);
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API}/booking-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartment_id: apartmentId,
          check_in: format(range.from, "yyyy-MM-dd"),
          check_out: format(range.to, "yyyy-MM-dd"),
          guests,
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message || null,
          language: lang,
          origin_url: window.location.origin,
        }),
      });
      if (res.status === 409) {
        toast.error(b.errorBlocked);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setConfirmed(data);
      toast.success(b.successTitle);
    } catch {
      toast.error(b.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  const checkStatus = async (e) => {
    e.preventDefault();
    setStatusError(false);
    setStatusResult(null);
    try {
      const r = await fetch(`${API}/bookings/status/${encodeURIComponent(statusForm.code.trim())}?email=${encodeURIComponent(statusForm.email.trim())}`);
      if (!r.ok) throw new Error();
      setStatusResult(await r.json());
    } catch {
      setStatusError(true);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-terracotta/40 transition-shadow duration-200";

  return (
    <section id="prenota" data-testid="booking-section" className="py-24 sm:py-32 bg-stonewarm/60">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl mb-12"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-4">{b.eyebrow}</p>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tight text-ink">{b.title}</h2>
          <p data-testid="ical-sync-badge" className="mt-4 inline-flex items-center gap-2 text-sm text-olive font-medium">
            <RefreshCw size={14} /> {b.sync}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: EASE }}
            className="lg:col-span-5 rounded-3xl bg-white border border-ink/5 p-4 sm:p-8"
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-ink/50 mb-3 text-center sm:text-left">{b.selectApartment}</p>
            <div data-testid="apartment-select" className="grid grid-cols-2 gap-2 mb-7">
              {APARTMENTS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  data-testid={`apt-toggle-${x.id}`}
                  onClick={() => { setApartmentId(x.id); setRange(undefined); }}
                  className={`rounded-2xl border px-4 py-3.5 text-left transition-colors duration-200 ${
                    apartmentId === x.id
                      ? "border-terracotta bg-terracotta/5"
                      : "border-ink/10 hover:border-ink/25"
                  }`}
                >
                  <span className="block font-serif font-semibold text-ink text-base leading-tight">{t.apartments[x.key].name}</span>
                  <span className="block text-xs text-ink/50 mt-1">
                    {t.apartments.from} €{x.price} / {t.apartments.night}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold tracking-widest uppercase text-ink/50 mb-3 text-center sm:text-left">{b.selectDates}</p>
            <div className="flex justify-center" data-testid="booking-calendar">
              <DayPicker
                mode="range"
                selected={range}
                onSelect={setRange}
                locale={LOCALES[lang]}
                disabled={[{ before: new Date() }, ...blocked]}
                numberOfMonths={1}
                showOutsideDays={false}
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-5 text-xs text-ink/50">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-ink/25 inline-block" /> {b.legendAvailable}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-ink/15 inline-block" /> {b.legendBooked}</span>
            </div>

            {nights > 0 && (
              <div data-testid="price-summary" className="mt-6 rounded-2xl bg-olive/5 border border-olive/15 p-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-ink/50 mb-3">
                  {b.summary} · {nights} {nights === 1 ? b.nightOne : b.nights}
                </p>
                <div className="flex justify-between text-sm text-ink/60">
                  <span>{b.otaPrice}</span>
                  <span className="line-through decoration-terracotta">€{otaTotal}</span>
                </div>
                <div className="flex justify-between text-sm text-ink/60 mt-1.5">
                  <span>{b.cityTax} · {b.taxOnArrival}</span>
                  <span>€{cityTax}</span>
                </div>
                <p className="text-[11px] text-ink/40 mt-1">{b.taxNote}</p>
                <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-olive/15">
                  <span className="text-sm font-semibold text-ink">{b.directPrice} · {b.total}</span>
                  <span className="font-serif text-2xl font-semibold text-terracotta">€{directTotal}</span>
                </div>
                <div className="flex justify-between items-baseline mt-1.5">
                  <span className="text-sm text-ink/70">{b.payNow}</span>
                  <span data-testid="pay-now-amount" className="text-lg font-bold text-olive">€{stay}</span>
                </div>
                <p className="mt-2 text-xs font-bold text-olive">{b.youSave} €{otaTotal - directTotal}</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="lg:col-span-7 rounded-3xl bg-white border border-ink/5 p-4 sm:p-8"
          >
            {verifying ? (
              <div data-testid="payment-verifying" className="h-full flex flex-col items-center justify-center text-center py-10">
                <RefreshCw size={40} className="text-terracotta mb-5 animate-spin" />
                <p className="text-ink/60">{b.payVerifying}</p>
              </div>
            ) : confirmed ? (
              <div data-testid="booking-success" className="h-full flex flex-col items-center justify-center text-center py-10">
                <CheckCircle2 size={52} className="text-olive mb-5" />
                <h3 className="font-serif text-3xl font-semibold text-ink">{b.paySuccessTitle}</h3>
                <p className="mt-3 max-w-sm text-ink/60 leading-relaxed">{b.paySuccessMsg}</p>
                <p className="mt-6 rounded-full bg-olive/10 text-olive text-sm font-semibold px-5 py-2.5">
                  {b.codeIs}: <strong data-testid="booking-code">{confirmed.code}</strong>
                </p>
                {confirmed.apartment_name && (
                  <p className="mt-3 text-sm text-ink/50">
                    {confirmed.apartment_name} · {confirmed.check_in} → {confirmed.check_out} · {confirmed.guests} {b.guests.toLowerCase()}
                  </p>
                )}
              </div>
            ) : (
              <form data-testid="booking-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">{b.name} *</label>
                  <input
                    data-testid="booking-name-input"
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                    placeholder="Maria Rossi"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">{b.email} *</label>
                  <input
                    data-testid="booking-email-input"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                    placeholder="maria@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">{b.phone}</label>
                  <input
                    data-testid="booking-phone-input"
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputCls}
                    placeholder="+39 ..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">{b.guests}</label>
                  <div className="relative">
                    <Users size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
                    <select
                      data-testid="guests-count"
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className={`${inputCls} pl-10 appearance-none`}
                    >
                      {[...Array(apt.guests)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-ink/60 mb-1.5">{b.message}</label>
                  <textarea
                    data-testid="booking-message-input"
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
                  <motion.button
                    data-testid="booking-submit-button"
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={sending}
                    className="rounded-full bg-terracotta hover:bg-terracotta-dark disabled:opacity-60 text-cream font-semibold px-9 py-4 text-sm transition-colors duration-200 shadow-[0_12px_36px_-12px_rgba(200,90,50,0.6)]"
                  >
                    {sending ? b.sending : b.submitPay}
                  </motion.button>
                  <p className="text-xs text-ink/45 max-w-xs">{b.payNote}</p>
                </div>
              </form>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-10 max-w-2xl mx-auto rounded-3xl bg-white border border-ink/5 p-6 sm:p-7"
          data-testid="booking-status-checker"
        >
          <p className="text-sm font-semibold text-ink mb-4">{b.statusTitle}</p>
          <form onSubmit={checkStatus} className="flex flex-col sm:flex-row gap-3">
            <input
              data-testid="status-code-input"
              required
              value={statusForm.code}
              onChange={(e) => setStatusForm({ ...statusForm, code: e.target.value })}
              placeholder={b.statusCode}
              className={inputCls}
            />
            <input
              data-testid="status-email-input"
              required
              type="email"
              value={statusForm.email}
              onChange={(e) => setStatusForm({ ...statusForm, email: e.target.value })}
              placeholder={b.email}
              className={inputCls}
            />
            <button
              data-testid="status-check-button"
              type="submit"
              className="rounded-full bg-olive hover:bg-olive/90 text-cream text-sm font-semibold px-6 py-3 whitespace-nowrap transition-colors duration-200"
            >
              {b.statusCheck}
            </button>
          </form>
          {statusError && (
            <p data-testid="status-not-found" className="mt-3 text-sm text-terracotta">{b.statusNotFound}</p>
          )}
          {statusResult && (
            <div data-testid="status-result" className="mt-4 rounded-2xl bg-olive/5 border border-olive/15 p-4 text-sm">
              <p className="font-semibold text-ink">
                {statusResult.apartment_name} · {statusResult.check_in} → {statusResult.check_out}
              </p>
              <p className="mt-1.5 font-semibold text-olive" data-testid="status-label">
                {b.statuses[statusResult.status] || statusResult.status}
              </p>
              {statusResult.checkin_booking_id && !statusResult.checkin_completed && (
                <a
                  data-testid="status-checkin-link"
                  href={`${window.location.origin}/?checkin=${statusResult.checkin_booking_id}&token=${statusResult.checkin_token}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-terracotta hover:bg-terracotta-dark text-cream text-xs font-semibold px-5 py-2.5 transition-colors duration-200"
                >
                  {b.checkinCta}
                </a>
              )}
              {statusResult.checkin_completed && (
                <p className="mt-2 text-xs text-olive font-medium">{b.checkinDone}</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
