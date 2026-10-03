# PRD — Residenza Assisi

## Problem statement (originale)
"Crea una landing page: vorrei creare un sito web per trovare clienti per i miei due appartamenti in affitto ad Assisi cercando di trovare prenotazioni al di fuori di Booking, si può creare qualcosa dove la gente possa trovarmi indipendentemente da Booking?"

## Scelte dell'utente
- Sezioni: descrizione, galleria immagini, prenotazione diretta con calendario sincronizzato Booking/Airbnb
- Stile: moderno, colorato, intuitivo
- Lingue: italiano, inglese, tedesco, spagnolo con selettore
- L'utente ha foto proprie da caricare in seguito

## Architettura
- Frontend: React 19 + Tailwind + framer-motion + lenis + react-day-picker (`/app/frontend/src/`)
- Backend: FastAPI + MongoDB (`/app/backend/server.py`)
- Brand: "Appartamenti Brufani" — "Appartamento Brufani" (trilocale 65 m², 4 ospiti, giardino privato) e "Appartamento Brufani Due" (monolocale 40 m², 2 ospiti)
- Dati reali da Booking.com: punteggio 9,2/10 (44 recensioni), pet friendly, Via Risorgimento 27/A e 29, Santa Maria degli Angeli, 350m dalla Basilica, 800m stazione, licenza IT054001C27A035224
- i18n: `/app/frontend/src/i18n.js` (IT/EN/DE/ES, persistito in localStorage)
- Email: proxy gestito Emergent (Resend) — `EMERGENT_EMAIL_KEY` + `EMAIL_FROM_NAME` in backend/.env

## Endpoint API
- `POST /api/booking-request` — salva richiesta, calcola prezzo diretto (-15%), email al proprietario se `OWNER_EMAIL` configurata
- `GET /api/availability?apartment_id=` — date bloccate
- `POST /api/calendar/feeds` — registra feed iCal (Booking/Airbnb) e sincronizza
- `POST /api/calendar/sync` — risincronizza tutti i feed
- `GET /api/calendar/feeds` — lista feed

## Implementato (03/10/2026)
- Landing page completa: hero cinetico con reveal riga-per-riga + parallasse + widget risparmio commissioni
- Marquee editoriale, showcase 2 appartamenti, bento "Perché prenotare diretto", galleria con lightbox, sezione posizione Assisi, recensioni, footer
- Selettore lingua IT/EN/DE/ES funzionante su tutto il sito
- Calendario disponibilità con selezione range, riepilogo prezzo (diretto vs portali), form richiesta prenotazione con toast e conferma
- Pulsante WhatsApp flottante, logo SVG originale + favicon
- Verificato: booking request end-to-end (4 notti, €540 → €459), switch lingue, responsive 375/768/1366

## Contenuti MOCKED / da completare con dati reali
- Foto: placeholder Unsplash (l'utente caricherà le sue)
- Recensioni: 3 testimonianze di esempio (il badge 9,2/10 con 44 recensioni Booking.com è REALE)
- Email footer info@appartamentibrufani.it: di esempio
- Numero WhatsApp: placeholder `REACT_APP_WHATSAPP_NUMBER=390000000000` in frontend/.env
- Prezzi €135/€115: indicativi, NON confermati dall'utente — da chiedere

## Azioni pendenti che richiedono l'utente
1. `OWNER_EMAIL` in backend/.env → email reale del proprietario per ricevere le richieste di prenotazione
2. `REACT_APP_WHATSAPP_NUMBER` → numero WhatsApp reale
3. URL iCal export di Booking.com e Airbnb → poi `POST /api/calendar/feeds`
4. Foto reali degli appartamenti

## Backlog prioritizzato
- P0: collegare email proprietario, numero WhatsApp reale, feed iCal reali, foto reali
- P1: pagina/pannello semplice per il proprietario per vedere le richieste ricevute; SEO (meta OG, sitemap, Google Business); dominio personalizzato
- P2: blog/guida di Assisi per SEO, recensioni vere importate, pagamento caparra online (Stripe), cookie banner/Privacy (GDPR)
