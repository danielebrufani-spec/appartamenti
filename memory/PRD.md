# PRD — Appartamenti Brufani · Landing page prenotazioni dirette

## Problema originale
Sito web per trovare clienti per due appartamenti in affitto ad Assisi (Appartamento Brufani — trilocale, e Appartamento Brufani Due — monolocale) per ottenere prenotazioni al di fuori di Booking/Airbnb.

## Requisiti core
- Descrizione, galleria fotografica dedicata per appartamento, prenotazione diretta con calendario sincronizzato Booking/Airbnb (iCal)
- Multilingua: IT, EN, DE, ES
- Stile moderno, colorato, intuitivo; animazioni Framer Motion + Lenis

## Architettura
- Frontend: React (porta 3000), Tailwind, Framer Motion, Lenis, i18n custom (`src/i18n.js`)
- Backend: FastAPI (porta 8001, prefix /api), MongoDB via Motor
- Deploy utente: Frontend su Vercel, Backend su Render, DB su MongoDB Atlas (email via Resend, chiave su Render)
- Foto reali locali in `/app/frontend/public/images/brufani/` (foto-*, giardino-*, mono-*, basilica-sma.webp)

## Implementato (changelog)
- 2026-10-04: Galleria Monolocale con 15 foto reali (mono-1..15.webp), lightbox dedicato per appartamento
- 2026-10-04: Sezione "La Zona" riscritta: Via Risorgimento 27/A e 29; distanze a piedi (Basilica SMA 600m/8min, Stazione Assisi 1km/12min, Emi Supermercato Via Raffaello 500m/6min, Centro Assisi 3km, Aeroporto Perugia 12km); card "Consigliati da noi": Trattoria Da Elide (Viale Patrono d'Italia 48, 800m, rating 4+/5, cucina di Alessandra) e Angelucci Cicli noleggio bici/e-bike (Via Risorgimento 54/A, 2 min, 4,7/5) — tradotto in 4 lingue
- 2026-10-04: Hero con rotazione automatica di 4 immagini (crossfade 6.5s) invece della foto fissa di San Francesco
- 2026-10-04: Foto REALE della Basilica di Santa Maria degli Angeli da Wikimedia Commons (basilica-sma.webp, credito CC BY-SA in footer) — le foto stock Unsplash erano di San Giovanni Rotondo/San Francesco, scartate
- 2026-10-04: Footer con doppia licenza: IT054001C27A035224 · IT054001C21A037467
- 2026-10-04: Rimossa foto duplicata dalla galleria trilocale
- 2026-10-04: SEO completo: title/description keyword-first ("appartamento Santa Maria degli Angeli"), meta keywords, Open Graph + Twitter card, JSON-LD LodgingBusiness con geo (43.0616, 12.5765); titolo e meta description cambiano dinamicamente con la lingua (chiave seo in i18n.js + LanguageProvider)
- 2026-10-04: Mappa Google interattiva (iframe embed, senza API key) nella sezione zona con pin su Via Risorgimento 27/A — chiave i18n: location.mapTitle
- 2026-10-04: iCal sync REALE trilocale: import Booking (65 eventi) + Airbnb in backend/.env come ICAL_FEEDS="apt|source|url;..." — startup registra+sincronizza, lazy re-sync se last_sync>30min su GET /availability, force sync su POST /booking-request, whitelist host su POST /calendar/feeds. Export iCal per portali: GET /api/calendar/export/{apartment_id}.ics (Content-Type text/calendar, status!=cancelled). Le prenotazioni dirette bloccano subito le date sul sito (blocked_dates source="direct" con request_id). Testati: import, 409 su date occupate, export. PULIZIA: rimosse prenotazioni test vecchie. PROD: backend Render = https://appartamenti-brufani-api.onrender.com (da screenshot dashboard utente), codice già live (export risponde 200); ICAL_FEEDS aggiunta a render.yaml con sync:false — l'utente deve valorizzarla nel dashboard Render (Environment) con i due link separati da ";"
- 2026-10-04: iCal monolocale Booking collegato (3 feed totali in ICAL_FEEDS preview). Export monolocale: /api/calendar/export/appartamento-brufani-due.ics
- 2026-10-04: PAGAMENTI STRIPE completi (Flow A sandbox): booking-request crea Stripe Checkout Session (addebito = solo soggiorno, tassa di soggiorno all'arrivo), status pending_payment->paid, webhook /api/stripe/webhook (completed/expired/charge.refunded) + fallback polling /api/payments/status/{session_id}, email proprietario con pulsanti Conferma/Rifiuta (GET /api/bookings/{id}/confirm|reject?token=, reject = rimborso Stripe automatico + date liberate), email ospite in 4 lingue, codice prenotazione BRF-XXXXXX, controllo stato ospite /api/bookings/status/{code}?email=, scadenza sessione 30 min + pulizia lazy dopo 40 min. Telefono OBBLIGATORIO nel form. Fix StrictMode polling post-pagamento + upgrade sonner 2.0.8 (toast non renderizzavano con React 19) + delay 150ms per toast al mount. Test: 19/19 pytest backend + E2E pagamento/rimborso/conferma veri (iteration_2.json). Suite: /app/backend/tests/test_booking_payment_flow.py
- 2026-10-04: Dominio personalizzato LIVE: appartamentibrufani.it (OVH) collegato a Vercel (A 76.76.21.21 + CNAME www → cname.vercel-dns.com; apex redirige 308 a www). Verificato HTTP 200 su entrambi. Aggiornati sitemap.xml, robots.txt, canonical, og:url, JSON-LD url → https://www.appartamentibrufani.it. Vercel mostra "DNS Change Recommended" (warning cosmetico, suggerisce IP più recente). Prossimo: verifica Google Search Console sul nuovo dominio (utente deve incollare il meta tag di verifica)
- 2026-10-04: Fix leggibilità hero su mobile (segnalato da utente): overlay a 3 strati (scrim uniforme + gradiente verticale + gradiente da sinistra), text-shadow rinforzate su titolo/sottotitolo/eyebrow, pannello risparmio scurito (bg-ink/45). Verificato a 375px e 1366px su tutte le foto della rotazione
- 2026-10-04: FIX CRITICO deploy Render: ModuleNotFoundError stripe → aggiunto stripe==14.4.1 a backend/requirements.txt (Render installa solo da lì; in preview era preinstallato e il bug non emergeva). Verificato con venv pulita + 19/19 pytest (iteration_3.json)
- 2026-10-04: PAGAMENTI LIVE ATTIVI IN PRODUZIONE: chiavi Stripe live su Render (fix nome env: era TRIPE_SECRET_KEY, mancava la S). Verificato E2E sul live (iteration_4.json): redirect checkout.stripe.com cs_live_, importo corretto (180 EUR per 2 notti monolocale, tassa soggiorno esclusa), toast annullamento OK, calendari entrambi appartamenti sincronizzati su live, export iCal OK, leggibilità mobile OK. Google Search Console verificato sul dominio + sitemap.xml inviata. RESTA: pulizia manuale 3 prenotazioni di test nel DB live (date set/ott 2027) da MongoDB Atlas; webhook Stripe live opzionale (fallback polling attivo)
- 2026-10-04: RECENSIONI VERE da Booking.com (link pubblici Share-PZkbQf trilocale / Share-4gMfRR monolocale): 8 recensioni reali in data.js (REAL_REVIEWS: nome, paese, voto, data, testo originali), avatar con iniziale colorata, chip voto, "Verificata su Booking.com". Monolocale ha 0 recensioni su Booking (nuovo) → sezione mostra quelle del trilocale. Rimossi items finti da i18n e REVIEW_AVATARS
- 2026-10-04: Pulizia DB produzione fatta dall'utente via Atlas (rimosse 5 prenotazioni test + blocked_dates source=direct). Verificato: export iCal pulito, date test liberate. Export iCal ora esclude anche status "expired" (fix in preview, da deployare)
- 2026-10-04: CHECK-IN ONLINE completo: pagina /?checkin={booking_id}&token={action_token} (query param, compatibile Vercel statico) con form dinamico per ogni ospite (dati Alloggiati Web: nome, cognome, sesso, nascita, cittadinanza, tipo+numero documento, rilascio) + foto documento compressa client-side (max 1400px jpeg, obbligatoria capogruppo) salvata in MongoDB (collezione checkin_documents, accesso solo via token) + consenso privacy. Email conferma ospite include il link check-in; a submit il proprietario riceve email con tabella dati + link sicuri alle foto. Status checker mostra bottone "Fai il check-in online". action_token ora presente in tutte le prenotazioni. Test E2E 100% (iteration_5.json), fix proxy http→https per link email
- Sessioni precedenti: deploy Vercel/Render/Atlas, fix dipendenze React 19 per npm/Vercel, logica prezzi (diretto = totale standard, OTA +15%), galleria trilocale con foto reali, testi aggiornati (giardino solo trilocale, parcheggio entrambi, rimosso vino omaggio)

## Backlog prioritizzato
- P0 (utente): su Render aggiungere chiavi Stripe LIVE (STRIPE_SECRET_KEY sk_live_, STRIPE_PUBLISHABLE_KEY pk_live_ dal suo account Stripe; opzionale STRIPE_WEBHOOK_SECRET da endpoint webhook https://appartamenti-brufani-api.onrender.com/api/stripe/webhook con eventi checkout.session.completed, checkout.session.expired, charge.refunded). Senza chiavi il sito live resta in modalità "richiesta + email" (fallback già gestito)
- P0 (utente): aggiornare ICAL_FEEDS su Render con i 3 feed (istruzioni già date)
- P1 (utente): incollare link export su Airbnb/Booking ("importa calendario")
- 2026-10-04: Creati /public/robots.txt e /public/sitemap.xml (dominio live https://appartamenti.vercel.app) per SEO/Search Console. Verifica proprietà: metodo meta tag HTML da incollare in index.html quando l'utente fornisce il token

## Note critiche

## Aggiornamento 2026-10-04
- Logo ridisegnato: monogramma "AB" in SVG (riquadro oliva, lettere serif panna, barra terracotta) + wordmark "Appartamenti Brufani" con sottotitolo "Holiday Apartments · Assisi" (nascosto sotto i 640px). Footer adattato.
- Nuova sezione "Chi Siamo" (Hosts.jsx) dopo WhyDirect: descrizione di famiglia con tocco personale, card per Oliviero (papà), Nicoletta (mamma), Daniele (figlio), citazione finale. Tradotta in IT/EN/DE/ES in i18n.js (blocco `hosts`).
- Verificato via screenshot a 375/768/1366px: header, sezione hosts e footer corretti.
- DA FARE: l'utente deve cliccare "Save -> Save to GitHub" per aggiornare il sito live (Vercel).

- Usare SEMPRE yarn (mai npm) nel frontend
- Non toccare REACT_APP_BACKEND_URL in frontend/.env (gestito da Vercel)
- Backend raggiungibile via REACT_APP_BACKEND_URL + /api
- Rispondere sempre in italiano
