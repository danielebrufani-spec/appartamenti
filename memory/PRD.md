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
- Sessioni precedenti: deploy Vercel/Render/Atlas, fix dipendenze React 19 per npm/Vercel, logica prezzi (diretto = totale standard, OTA +15%), galleria trilocale con foto reali, testi aggiornati (giardino solo trilocale, parcheggio entrambi, rimosso vino omaggio)

## Backlog prioritizzato
- P1: Sincronizzazione iCal reale Booking/Airbnb — IN ATTESA dei link iCal dall'utente
- P1: L'utente deve cliccare "Save to GitHub" per far ridistribuire Vercel con le nuove foto/sezioni

## Note critiche
- Usare SEMPRE yarn (mai npm) nel frontend
- Non toccare REACT_APP_BACKEND_URL in frontend/.env (gestito da Vercel)
- Backend raggiungibile via REACT_APP_BACKEND_URL + /api
- Rispondere sempre in italiano
