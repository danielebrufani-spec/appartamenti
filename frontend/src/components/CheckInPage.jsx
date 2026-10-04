import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Upload, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import { API } from "@/data";

const EASE = [0.22, 1, 0.36, 1];

const emptyGuest = {
  first_name: "",
  last_name: "",
  sex: "M",
  birth_date: "",
  birth_place: "",
  birth_province: "",
  citizenship: "Italiana",
  doc_type: "carta_identita",
  doc_number: "",
  doc_issued_by: "",
};

async function compressImage(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
}

const inputCls =
  "w-full rounded-xl border border-ink/10 bg-cream px-4 py-3 text-sm outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/15 transition";

export default function CheckInPage({ bookingId, token }) {
  const { t } = useLanguage();
  const c = t.checkin;
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [guests, setGuests] = useState([]);
  const [photos, setPhotos] = useState({});
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/checkin/${bookingId}/info?token=${encodeURIComponent(token)}`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        setInfo(d);
        if (d.completed) setDone(true);
        setGuests(Array.from({ length: d.guests }, () => ({ ...emptyGuest })));
      } catch {
        setLoadError(true);
      }
    })();
  }, [bookingId, token]);

  const setGuest = (i, field, value) => {
    setGuests((gs) => gs.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));
  };

  const pickPhoto = async (i, file) => {
    if (!file) return;
    try {
      const blob = await compressImage(file);
      setPhotos((p) => ({ ...p, [i]: { blob, preview: URL.createObjectURL(blob) } }));
    } catch {
      toast.error(c.errorGeneric);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    for (const g of guests) {
      if (!g.first_name || !g.last_name || !g.birth_date || !g.birth_place || !g.citizenship || !g.doc_number || !g.doc_issued_by) {
        toast.error(c.errorFields);
        return;
      }
    }
    if (!photos[0]) {
      toast.error(c.errorPhoto);
      return;
    }
    if (!consent) {
      toast.error(c.errorConsent);
      return;
    }
    setSending(true);
    try {
      for (const [idx, p] of Object.entries(photos)) {
        const fd = new FormData();
        fd.append("file", p.blob, "documento.jpg");
        const r = await fetch(`${API}/checkin/${bookingId}/document?token=${encodeURIComponent(token)}&guest_index=${idx}`, { method: "POST", body: fd });
        if (!r.ok) throw new Error("upload");
      }
      const r2 = await fetch(`${API}/checkin/${bookingId}/submit?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests, consent }),
      });
      if (!r2.ok) {
        const d = await r2.json().catch(() => ({}));
        if (d.detail === "document_required") throw new Error("photo");
        throw new Error("generic");
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err.message === "photo" ? c.errorPhoto : c.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-testid="checkin-page" className="min-h-screen bg-cream text-ink">
      <header className="border-b border-ink/5 bg-cream/90 backdrop-blur">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between">
          <a href="/" className="font-serif text-xl font-semibold">Appartamenti <span className="italic text-terracotta">Brufani</span></a>
          <a data-testid="checkin-back-home" href="/" className="text-sm text-ink/50 hover:text-ink transition-colors">{c.backHome}</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        {loadError ? (
          <div className="text-center py-16">
            <AlertTriangle size={44} className="text-terracotta mx-auto mb-5" />
            <h1 className="font-serif text-3xl font-semibold">{c.errorLink}</h1>
          </div>
        ) : !info ? (
          <div className="flex justify-center py-24"><Loader2 size={36} className="animate-spin text-terracotta" /></div>
        ) : done ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="text-center py-16" data-testid="checkin-success">
            <CheckCircle2 size={56} className="text-olive mx-auto mb-6" />
            <h1 className="font-serif text-4xl font-semibold">{info.completed && !sending ? c.alreadyTitle : c.successTitle}</h1>
            <p className="mt-4 text-ink/60 max-w-md mx-auto leading-relaxed">{info.completed && !sending ? c.alreadyMsg : c.successMsg}</p>
          </motion.div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-terracotta mb-3">{info.apartment_name}</p>
              <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">{c.title}</h1>
              <p className="mt-3 text-ink/60 leading-relaxed">{c.subtitle}</p>
              <div className="mt-6 rounded-2xl bg-white border border-ink/5 p-5 flex flex-wrap gap-x-8 gap-y-2 text-sm" data-testid="checkin-summary">
                <span><span className="text-ink/45">{c.bookingSummary}:</span> <strong>{info.code}</strong></span>
                <span>{info.check_in} → {info.check_out}</span>
                <span>{info.guest_name}</span>
              </div>
            </motion.div>

            <form onSubmit={submit} className="mt-10 flex flex-col gap-8" data-testid="checkin-form">
              {guests.map((g, i) => (
                <motion.fieldset
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
                  className="rounded-3xl bg-white border border-ink/5 p-6 sm:p-7"
                  data-testid={`checkin-guest-${i}`}
                >
                  <legend className="sr-only">{c.guest} {i + 1}</legend>
                  <p className="font-serif text-xl font-semibold mb-5">
                    {c.guest} {i + 1} {i === 0 && <span className="text-sm font-sans font-medium text-terracotta">({c.leader})</span>}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input data-testid={`guest-${i}-first-name`} className={inputCls} placeholder={c.firstName} value={g.first_name} onChange={(e) => setGuest(i, "first_name", e.target.value)} />
                    <input data-testid={`guest-${i}-last-name`} className={inputCls} placeholder={c.lastName} value={g.last_name} onChange={(e) => setGuest(i, "last_name", e.target.value)} />
                    <select data-testid={`guest-${i}-sex`} className={inputCls} value={g.sex} onChange={(e) => setGuest(i, "sex", e.target.value)}>
                      <option value="M">{c.sex}: M</option>
                      <option value="F">{c.sex}: F</option>
                    </select>
                    <div>
                      <label className="block text-xs text-ink/45 mb-1.5">{c.birthDate}</label>
                      <input data-testid={`guest-${i}-birth-date`} type="date" max={today} className={inputCls} value={g.birth_date} onChange={(e) => setGuest(i, "birth_date", e.target.value)} />
                    </div>
                    <input data-testid={`guest-${i}-birth-place`} className={inputCls} placeholder={c.birthPlace} value={g.birth_place} onChange={(e) => setGuest(i, "birth_place", e.target.value)} />
                    <input className={inputCls} placeholder={c.birthProvince} value={g.birth_province} onChange={(e) => setGuest(i, "birth_province", e.target.value)} />
                    <input data-testid={`guest-${i}-citizenship`} className={inputCls} placeholder={c.citizenship} value={g.citizenship} onChange={(e) => setGuest(i, "citizenship", e.target.value)} />
                    <select data-testid={`guest-${i}-doc-type`} className={inputCls} value={g.doc_type} onChange={(e) => setGuest(i, "doc_type", e.target.value)}>
                      <option value="carta_identita">{c.docTypes.carta_identita}</option>
                      <option value="passaporto">{c.docTypes.passaporto}</option>
                      <option value="patente">{c.docTypes.patente}</option>
                    </select>
                    <input data-testid={`guest-${i}-doc-number`} className={inputCls} placeholder={c.docNumber} value={g.doc_number} onChange={(e) => setGuest(i, "doc_number", e.target.value)} />
                    <input className={inputCls} placeholder={c.docIssuedBy} value={g.doc_issued_by} onChange={(e) => setGuest(i, "doc_issued_by", e.target.value)} />
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-medium mb-2">
                      {c.photo} {i === 0 ? <span className="text-terracotta text-xs">· {c.photoRequired}</span> : <span className="text-ink/40 text-xs">· {c.photoOptional}</span>}
                    </p>
                    <label className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-ink/15 hover:border-terracotta/40 p-4 cursor-pointer transition-colors" data-testid={`checkin-photo-${i}`}>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickPhoto(i, e.target.files[0])} />
                      {photos[i] ? (
                        <>
                          <img src={photos[i].preview} alt="" className="w-16 h-16 rounded-xl object-cover" />
                          <span className="text-sm text-olive font-medium">{c.photoChange}</span>
                        </>
                      ) : (
                        <>
                          <span className="w-12 h-12 rounded-xl bg-olive/10 text-olive flex items-center justify-center"><Upload size={20} /></span>
                          <span className="text-sm text-ink/55">{c.photoBtn}</span>
                        </>
                      )}
                    </label>
                  </div>
                </motion.fieldset>
              ))}

              <label className="flex items-start gap-3 rounded-2xl bg-white border border-ink/5 p-5 cursor-pointer">
                <input data-testid="checkin-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-4 h-4 accent-terracotta" />
                <span className="text-sm text-ink/65 leading-relaxed">{c.consent}</span>
              </label>

              <div className="flex flex-col items-center gap-3">
                <motion.button
                  data-testid="checkin-submit-btn"
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={sending}
                  className="rounded-full bg-terracotta hover:bg-terracotta-dark disabled:opacity-50 text-cream font-semibold px-10 py-4 text-sm transition-colors duration-200 shadow-[0_12px_40px_-10px_rgba(200,90,50,0.5)]"
                >
                  {sending ? c.sending : c.submit}
                </motion.button>
                <p className="text-xs text-ink/45 flex items-center gap-1.5 max-w-sm text-center">
                  <ShieldCheck size={14} className="text-olive shrink-0" /> {c.privacyNote}
                </p>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
