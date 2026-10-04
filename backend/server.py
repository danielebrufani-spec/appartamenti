from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone, date, timedelta
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
import os
import re
import uuid
import logging
import ipaddress
import httpx
from pathlib import Path
from fastapi import Response, Request

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Residenza Assisi")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
EMAIL_FROM_ADDRESS = os.environ.get("EMAIL_FROM_ADDRESS", "onboarding@resend.dev")

import stripe
import time

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

APARTMENTS = {
    "appartamento-brufani": {"name": "Appartamento Brufani", "base_price": 110, "base_guests": 2, "extra_guest": 10, "max_guests": 4},
    "appartamento-brufani-due": {"name": "Appartamento Brufani Due", "base_price": 90, "base_guests": 2, "extra_guest": 10, "max_guests": 3},
}
CITY_TAX_PER_PERSON_NIGHT = 3
CITY_TAX_MAX_NIGHTS = 3

MESI_IT = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
           "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]


def _fmt_data_it(d: date) -> str:
    return f"{d.day} {MESI_IT[d.month - 1]} {d.year}"

# ---------- Email guardrail gate (G2/G3) ----------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    _assert_safe_email(subject, html)
    if RESEND_API_KEY:
        url = "https://api.resend.com/emails"
        headers = {"Authorization": f"Bearer {RESEND_API_KEY}"}
        payload = {
            "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>",
            "to": [to],
            "subject": subject,
            "html": html,
        }
    else:
        url = f"{EMAIL_BASE_URL}/api/v1/email/send"
        headers = {"X-Email-Key": EMAIL_KEY}
        payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return None


# ---------- Models ----------
class BookingRequestCreate(BaseModel):
    apartment_id: str
    check_in: date
    check_out: date
    guests: int = Field(ge=1, le=8)
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=40)
    message: Optional[str] = Field(default=None, max_length=1000)
    language: str = "it"
    origin_url: Optional[str] = None


class CalendarFeedCreate(BaseModel):
    apartment_id: str
    source: str = Field(min_length=2, max_length=40)
    url: str


# ---------- Helpers ----------
def _date_range(d1: date, d2: date):
    days = []
    cur = d1
    while cur < d2:
        days.append(cur.isoformat())
        cur += timedelta(days=1)
    return days


async def _blocked_dates(apartment_id: str) -> set:
    docs = await db.blocked_dates.find({"apartment_id": apartment_id}, {"_id": 0, "date": 1}).to_list(5000)
    return {d["date"] for d in docs}


def _parse_ical_date(value: str) -> Optional[date]:
    v = value.strip()
    try:
        if "T" in v:
            return datetime.strptime(v[:15], "%Y%m%dT%H%M%S").date()
        return datetime.strptime(v[:8], "%Y%m%d").date()
    except ValueError:
        return None


def _parse_ical(text: str):
    lines = []
    for raw in text.splitlines():
        if raw.startswith((" ", "\t")) and lines:
            lines[-1] += raw[1:]
        else:
            lines.append(raw)
    events = []
    cur = None
    for line in lines:
        if line.startswith("BEGIN:VEVENT"):
            cur = {}
        elif line.startswith("END:VEVENT"):
            if cur and cur.get("start") and cur.get("end"):
                events.append(cur)
            cur = None
        elif cur is not None and line.startswith("DTSTART"):
            cur["start"] = _parse_ical_date(line.split(":", 1)[1])
        elif cur is not None and line.startswith("DTEND"):
            cur["end"] = _parse_ical_date(line.split(":", 1)[1])
    return events


async def _sync_feed(feed: dict) -> int:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as http:
        resp = await http.get(feed["url"])
    resp.raise_for_status()
    events = _parse_ical(resp.text)
    await db.blocked_dates.delete_many({"apartment_id": feed["apartment_id"], "source": feed["source"]})
    docs = []
    for ev in events:
        for day in _date_range(ev["start"], ev["end"]):
            docs.append({"apartment_id": feed["apartment_id"], "source": feed["source"], "date": day})
    if docs:
        await db.blocked_dates.insert_many(docs)
    await db.calendar_feeds.update_one(
        {"apartment_id": feed["apartment_id"], "source": feed["source"]},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}},
    )
    return len(events)


# ---------- iCal feeds: env registration + lazy re-sync ----------
ICAL_ALLOWED_HOSTS = ("ical.booking.com", "admin.booking.com", "www.airbnb.com", "www.airbnb.it", "ical.airbnb.com", "www.vrbo.com")
SYNC_MAX_AGE_MINUTES = 30


def _env_feeds():
    feeds = []
    for item in os.environ.get("ICAL_FEEDS", "").split(";"):
        item = item.strip()
        if not item:
            continue
        try:
            apt, source, url = (p.strip() for p in item.split("|", 2))
        except ValueError:
            logger.warning(f"Invalid ICAL_FEEDS entry skipped: {item[:40]}")
            continue
        if apt in APARTMENTS and url.startswith("https://"):
            feeds.append({"apartment_id": apt, "source": source, "url": url})
    return feeds


@app.on_event("startup")
async def register_env_feeds():
    for feed in _env_feeds():
        await db.calendar_feeds.update_one(
            {"apartment_id": feed["apartment_id"], "source": feed["source"]},
            {"$set": feed},
            upsert=True,
        )
        try:
            events = await _sync_feed(feed)
            logger.info(f"iCal startup sync {feed['apartment_id']}/{feed['source']}: {events} events")
        except Exception as e:
            logger.error(f"iCal startup sync failed for {feed['source']}: {e}")


async def _sync_if_stale(apartment_id: str, force: bool = False):
    feeds = await db.calendar_feeds.find({"apartment_id": apartment_id}).to_list(20)
    now = datetime.now(timezone.utc)
    for feed in feeds:
        stale = True
        last = feed.get("last_sync")
        if last and not force:
            try:
                stale = (now - datetime.fromisoformat(last)) > timedelta(minutes=SYNC_MAX_AGE_MINUTES)
            except ValueError:
                stale = True
        if stale:
            try:
                await _sync_feed(feed)
            except Exception as e:
                logger.error(f"iCal re-sync failed for {feed.get('source')}: {e}")


GUEST_TPL = {
    "it": {
        "confirmed_subject": "Prenotazione confermata · {apt}",
        "confirmed_title": "La tua prenotazione è confermata!",
        "confirmed_intro": "Ciao {name}, la tua prenotazione è confermata. Ti aspettiamo ad Assisi!",
        "rejected_subject": "La tua richiesta di prenotazione · {apt}",
        "rejected_title": "Ci dispiace, non possiamo confermare",
        "rejected_intro": "Ciao {name}, purtroppo non possiamo confermare il soggiorno richiesto. Il rimborso completo è già stato avviato sulla tua carta: lo vedrai entro 5-10 giorni lavorativi.",
        "apt": "Appartamento", "in": "Check-in", "out": "Check-out", "guests": "Ospiti",
        "paid": "Pagato online", "tax": "Tassa di soggiorno (da pagare all'arrivo)", "code": "Codice prenotazione", "addr": "Indirizzo",
        "footer": "Per qualsiasi necessità rispondi a questa email o scrivici su WhatsApp al +39 339 502 0625.",
    },
    "en": {
        "confirmed_subject": "Booking confirmed · {apt}",
        "confirmed_title": "Your booking is confirmed!",
        "confirmed_intro": "Hello {name}, your booking is confirmed. See you in Assisi!",
        "rejected_subject": "Your booking request · {apt}",
        "rejected_title": "Sorry, we cannot confirm",
        "rejected_intro": "Hello {name}, unfortunately we cannot confirm the requested stay. A full refund has already been issued to your card: it will appear within 5-10 business days.",
        "apt": "Apartment", "in": "Check-in", "out": "Check-out", "guests": "Guests",
        "paid": "Paid online", "tax": "City tax (payable on arrival)", "code": "Booking code", "addr": "Address",
        "footer": "For anything you need, reply to this email or message us on WhatsApp at +39 339 502 0625.",
    },
    "de": {
        "confirmed_subject": "Buchung bestätigt · {apt}",
        "confirmed_title": "Deine Buchung ist bestätigt!",
        "confirmed_intro": "Hallo {name}, deine Buchung ist bestätigt. Wir freuen uns auf dich in Assisi!",
        "rejected_subject": "Deine Buchungsanfrage · {apt}",
        "rejected_title": "Leider können wir nicht bestätigen",
        "rejected_intro": "Hallo {name}, leider können wir den gewünschten Aufenthalt nicht bestätigen. Die volle Rückerstattung wurde bereits auf deine Karte veranlasst: sie ist in 5-10 Werktagen sichtbar.",
        "apt": "Wohnung", "in": "Check-in", "out": "Check-out", "guests": "Gäste",
        "paid": "Online bezahlt", "tax": "Kurtaxe (bei Ankunft zu zahlen)", "code": "Buchungscode", "addr": "Adresse",
        "footer": "Bei Fragen antworte einfach auf diese E-Mail oder schreib uns auf WhatsApp: +39 339 502 0625.",
    },
    "es": {
        "confirmed_subject": "Reserva confirmada · {apt}",
        "confirmed_title": "¡Tu reserva está confirmada!",
        "confirmed_intro": "Hola {name}, tu reserva está confirmada. ¡Te esperamos en Assisi!",
        "rejected_subject": "Tu solicitud de reserva · {apt}",
        "rejected_title": "Lo sentimos, no podemos confirmar",
        "rejected_intro": "Hola {name}, lamentablemente no podemos confirmar la estancia solicitada. El reembolso completo ya se ha iniciado en tu tarjeta: lo verás en 5-10 días laborables.",
        "apt": "Apartamento", "in": "Entrada", "out": "Salida", "guests": "Huéspedes",
        "paid": "Pagado online", "tax": "Tasa turística (a pagar a la llegada)", "code": "Código de reserva", "addr": "Dirección",
        "footer": "Para cualquier cosa, responde a este email o escríbenos por WhatsApp al +39 339 502 0625.",
    },
}

ADDRESS_LINE = "Via Risorgimento 27/A e 29, 06081 Santa Maria degli Angeli, Assisi (PG)"


async def _send_guest_email(booking: dict, kind: str):
    tpl = GUEST_TPL.get(booking.get("language", "it"), GUEST_TPL["it"])
    apt_name = booking.get("apartment_name", "")
    ci = _fmt_data_it(date.fromisoformat(booking["check_in"]))
    co = _fmt_data_it(date.fromisoformat(booking["check_out"]))
    rows = "".join([
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['apt']}</td><td style='padding:6px 12px'><strong>{escape(apt_name)}</strong></td></tr>",
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['in']}</td><td style='padding:6px 12px'>{ci}</td></tr>",
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['out']}</td><td style='padding:6px 12px'>{co}</td></tr>",
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['guests']}</td><td style='padding:6px 12px'>{booking['guests']}</td></tr>",
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['paid']}</td><td style='padding:6px 12px'><strong>&euro;{booking.get('stay_online', booking.get('direct_price'))}</strong></td></tr>",
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['tax']}</td><td style='padding:6px 12px'>&euro;{booking.get('city_tax', 0)}</td></tr>",
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['code']}</td><td style='padding:6px 12px'><strong>{escape(booking.get('code', ''))}</strong></td></tr>",
        f"<tr><td style='padding:6px 12px;color:#6E7570'>{tpl['addr']}</td><td style='padding:6px 12px'>{ADDRESS_LINE}</td></tr>",
    ])
    title = tpl[f"{kind}_title"]
    intro = tpl[f"{kind}_intro"].format(name=escape(booking.get("name", "")))
    html = (
        "<table role='presentation' width='100%'><tr><td style='padding:24px;font-family:Arial,sans-serif'>"
        f"<h2 style='color:#2C4231;margin:0 0 12px'>{title}</h2>"
        f"<p style='margin:0 0 16px'>{intro}</p>"
        f"<table role='presentation' style='border-collapse:collapse'>{rows}</table>"
        f"<p style='font-size:12px;color:#888;margin-top:24px'>{tpl['footer']}</p>"
        "</td></tr></table>"
    )
    email_id = await send_email(to=booking["email"], subject=tpl[f"{kind}_subject"].format(apt=apt_name), html=html)
    logger.info(f"Guest {kind} email id: {email_id}")


def _owner_page(title: str, subtitle: str) -> str:
    return (
        "<!doctype html><html lang='it'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
        f"<title>{escape(title)}</title></head>"
        "<body style='font-family:Arial,sans-serif;background:#FAF7F2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0'>"
        "<div style='background:#fff;border-radius:24px;padding:40px;max-width:420px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.08)'>"
        f"<h1 style='color:#2C4231;font-size:24px;margin:0 0 12px'>{escape(title)}</h1>"
        f"<p style='color:#6E7570;margin:0'>{escape(subtitle)}</p>"
        "</div></body></html>"
    )


async def _release_dates(booking_id: str):
    await db.blocked_dates.delete_many({"request_id": booking_id, "source": "direct"})


async def _mark_paid(session_id: str, base_url: str):
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        logger.warning(f"Payment session unknown: {session_id}")
        return
    booking = await db.booking_requests.find_one({"id": tx["booking_id"]})
    if not booking or booking.get("status") != "pending_payment":
        return
    pi = None
    try:
        s = stripe.checkout.Session.retrieve(session_id)
        pi = s.payment_intent
    except Exception as e:
        logger.error(f"Stripe session retrieve failed: {e}")
    now = datetime.now(timezone.utc).isoformat()
    await db.booking_requests.update_one(
        {"id": booking["id"]},
        {"$set": {"status": "paid", "payment_status": "paid", "paid_at": now, "stripe_payment_intent": pi}},
    )
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": "completed", "payment_status": "paid", "stripe_payment_intent_id": pi, "updated_at": now}},
    )
    if OWNER_EMAIL:
        confirm_url = f"{base_url}api/bookings/{booking['id']}/confirm?token={booking['action_token']}"
        reject_url = f"{base_url}api/bookings/{booking['id']}/reject?token={booking['action_token']}"
        ci = _fmt_data_it(date.fromisoformat(booking["check_in"]))
        co = _fmt_data_it(date.fromisoformat(booking["check_out"]))
        rows = "".join([
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Appartamento</td><td style='padding:6px 12px'><strong>{escape(booking['apartment_name'])}</strong></td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Check-in</td><td style='padding:6px 12px'>{ci}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Check-out</td><td style='padding:6px 12px'>{co}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Ospiti</td><td style='padding:6px 12px'>{booking['guests']}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Nome</td><td style='padding:6px 12px'>{escape(booking['name'])}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Email</td><td style='padding:6px 12px'>{escape(booking['email'])}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Telefono</td><td style='padding:6px 12px'>{escape(booking.get('phone') or '-')}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Messaggio</td><td style='padding:6px 12px'>{escape(booking.get('message') or '-')}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Incassato online</td><td style='padding:6px 12px'><strong>&euro;{booking.get('stay_online')}</strong> (tassa di soggiorno &euro;{booking.get('city_tax')} all'arrivo)</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Codice</td><td style='padding:6px 12px'>{booking.get('code')}</td></tr>",
        ])
        html = (
            "<table role='presentation' width='100%'><tr><td style='padding:24px;font-family:Arial,sans-serif'>"
            f"<h2 style='color:#2C4231;margin:0 0 8px'>Prenotazione PAGATA - {escape(booking['apartment_name'])}</h2>"
            "<p style='margin:0 0 16px;color:#6E7570'>L'ospite ha già pagato online. Conferma o rifiuta (rimborso automatico):</p>"
            f"<p style='margin:0 0 20px'>"
            f"<a href='{confirm_url}' style='background:#2C4231;color:#FAF7F2;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold'>Conferma prenotazione</a>"
            "&nbsp;&nbsp;"
            f"<a href='{reject_url}' style='background:#C85A32;color:#FAF7F2;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold'>Rifiuta e rimborsa</a>"
            "</p>"
            f"<table role='presentation' style='border-collapse:collapse'>{rows}</table>"
            f"<p style='font-size:12px;color:#888;margin-top:24px'>Inviata dal sito {escape(EMAIL_FROM_NAME)}. "
            "Non chiediamo mai password o dati di pagamento via email.</p>"
            "</td></tr></table>"
        )
        email_id = await send_email(to=OWNER_EMAIL, subject=f"Prenotazione PAGATA - {booking['apartment_name']} ({booking.get('code')})", html=html)
        logger.info(f"Owner paid-booking email id: {email_id}")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Appartamenti Brufani API"}


@api_router.post("/booking-request")
async def create_booking_request(payload: BookingRequestCreate):
    apt = APARTMENTS.get(payload.apartment_id)
    if not apt:
        raise HTTPException(status_code=400, detail="Unknown apartment")
    if payload.check_out <= payload.check_in:
        raise HTTPException(status_code=400, detail="invalid_dates")
    if payload.check_in < date.today():
        raise HTTPException(status_code=400, detail="past_dates")

    requested = set(_date_range(payload.check_in, payload.check_out))
    await _sync_if_stale(payload.apartment_id, force=True)
    blocked = await _blocked_dates(payload.apartment_id)
    if requested & blocked:
        raise HTTPException(status_code=409, detail="dates_unavailable")

    if payload.guests > apt["max_guests"]:
        raise HTTPException(status_code=400, detail="too_many_guests")

    nights = len(requested)
    nightly = apt["base_price"] + max(0, payload.guests - apt["base_guests"]) * apt["extra_guest"]
    stay = nightly * nights
    direct_stay = stay
    ota_stay = int(stay * 1.15 + 0.5)
    city_tax = CITY_TAX_PER_PERSON_NIGHT * payload.guests * min(nights, CITY_TAX_MAX_NIGHTS)
    ota_total = ota_stay + city_tax
    direct_total = direct_stay + city_tax
    request_id = str(uuid.uuid4())
    booking_code = "BRF-" + uuid.uuid4().hex[:6].upper()

    doc = {
        "id": request_id,
        "code": booking_code,
        "apartment_id": payload.apartment_id,
        "apartment_name": apt["name"],
        "check_in": payload.check_in.isoformat(),
        "check_out": payload.check_out.isoformat(),
        "guests": payload.guests,
        "name": payload.name,
        "email": payload.email.lower(),
        "phone": payload.phone,
        "message": payload.message,
        "language": payload.language,
        "nights": nights,
        "nightly_rate": nightly,
        "ota_price": ota_total,
        "direct_price": direct_total,
        "stay_online": direct_stay,
        "city_tax": city_tax,
        "status": "pending_payment",
        "payment_status": "pending",
        "action_token": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if not stripe.api_key:
        # Fallback senza pagamento online: vecchia logica (richiesta + email al proprietario)
        doc["status"] = "received"
        doc.pop("action_token", None)
        await db.booking_requests.insert_one(doc)
        await db.blocked_dates.insert_many([
            {"apartment_id": payload.apartment_id, "source": "direct", "request_id": request_id, "date": d}
            for d in requested
        ])
        if OWNER_EMAIL:
            html = (
                "<table role='presentation' width='100%'><tr><td style='padding:24px;font-family:Arial,sans-serif'>"
                f"<h2 style='color:#2C4231;margin:0 0 16px'>Nuova richiesta di prenotazione</h2>"
                f"<p>Appartamento: <strong>{escape(apt['name'])}</strong> · {_fmt_data_it(payload.check_in)} → {_fmt_data_it(payload.check_out)} · "
                f"{payload.guests} ospiti · {escape(payload.name)} · {escape(payload.email)} · Totale &euro;{direct_total}</p>"
                "</td></tr></table>"
            )
            await send_email(to=OWNER_EMAIL, subject=f"Nuova richiesta di prenotazione - {apt['name']}", html=html)
        return {
            "id": request_id,
            "code": booking_code,
            "status": "received",
            "nights": nights,
            "nightly_rate": nightly,
            "ota_price": ota_total,
            "direct_price": direct_total,
            "city_tax": city_tax,
        }

    origin = (payload.origin_url or "").rstrip("/")
    if not origin.startswith("https://"):
        raise HTTPException(status_code=400, detail="invalid_origin")

    await db.booking_requests.insert_one(doc)
    await db.blocked_dates.insert_many([
        {"apartment_id": payload.apartment_id, "source": "direct", "request_id": request_id, "date": d}
        for d in requested
    ])

    try:
        session = stripe.checkout.Session.create(
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": int(round(direct_stay * 100)),
                    "product_data": {
                        "name": f"{apt['name']} · {_fmt_data_it(payload.check_in)} → {_fmt_data_it(payload.check_out)}",
                    },
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{origin}/?pagamento=successo&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/?pagamento=annullato",
            metadata={"booking_id": request_id},
            customer_email=payload.email,
            expires_at=int(time.time()) + 1800,
        )
    except Exception as e:
        logger.error(f"Stripe checkout creation failed: {e}")
        await db.booking_requests.delete_one({"id": request_id})
        await _release_dates(request_id)
        raise HTTPException(status_code=502, detail="payment_unavailable")

    await db.booking_requests.update_one({"id": request_id}, {"$set": {"stripe_session_id": session.id}})
    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "booking_id": request_id,
        "amount": float(direct_stay),
        "currency": "eur",
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "id": request_id,
        "code": booking_code,
        "status": "pending_payment",
        "checkout_url": session.url,
        "nights": nights,
        "nightly_rate": nightly,
        "ota_price": ota_total,
        "direct_price": direct_total,
        "city_tax": city_tax,
    }


@api_router.get("/availability")
async def get_availability(request: Request, apartment_id: str):
    if apartment_id not in APARTMENTS:
        raise HTTPException(status_code=400, detail="Unknown apartment")
    await _expire_stale_pending(apartment_id, str(request.base_url))
    await _sync_if_stale(apartment_id)
    blocked = sorted(await _blocked_dates(apartment_id))
    return {"apartment_id": apartment_id, "blocked": blocked}


async def _expire_stale_pending(apartment_id: str, base_url: str):
    if not stripe.api_key:
        return
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=40)).isoformat()
    olds = await db.booking_requests.find(
        {"apartment_id": apartment_id, "status": "pending_payment", "created_at": {"$lt": cutoff}},
        {"_id": 0, "id": 1, "stripe_session_id": 1},
    ).to_list(50)
    for b in olds:
        sid = b.get("stripe_session_id")
        if not sid:
            await db.booking_requests.update_one({"id": b["id"]}, {"$set": {"status": "expired", "payment_status": "expired"}})
            await _release_dates(b["id"])
            continue
        try:
            s = stripe.checkout.Session.retrieve(sid)
            if s.payment_status == "paid":
                await _mark_paid(sid, base_url)
                continue
        except Exception as e:
            logger.error(f"Stripe session check failed: {e}")
            continue
        await db.booking_requests.update_one({"id": b["id"]}, {"$set": {"status": "expired", "payment_status": "expired"}})
        await db.payment_transactions.update_one({"session_id": sid}, {"$set": {"status": "expired", "payment_status": "expired"}})
        await _release_dates(b["id"])


@api_router.post("/calendar/feeds")
async def add_calendar_feed(payload: CalendarFeedCreate):
    if payload.apartment_id not in APARTMENTS:
        raise HTTPException(status_code=400, detail="Unknown apartment")
    if not payload.url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Feed URL must be https")
    host = urlparse(payload.url).hostname or ""
    if not any(host == h or host.endswith("." + h) for h in ICAL_ALLOWED_HOSTS):
        raise HTTPException(status_code=400, detail="Feed host not allowed (Booking, Airbnb, Vrbo only)")
    feed = {"apartment_id": payload.apartment_id, "source": payload.source, "url": payload.url}
    await db.calendar_feeds.update_one(
        {"apartment_id": payload.apartment_id, "source": payload.source},
        {"$set": feed},
        upsert=True,
    )
    try:
        events = await _sync_feed(feed)
    except Exception as e:
        logger.error(f"iCal sync failed: {e}")
        raise HTTPException(status_code=502, detail="Could not fetch or parse the iCal feed")
    return {"status": "synced", "events": events}


@api_router.post("/calendar/sync")
async def sync_all_calendars():
    feeds = await db.calendar_feeds.find({}, {"_id": 0}).to_list(50)
    results = []
    for feed in feeds:
        try:
            events = await _sync_feed(feed)
            results.append({"source": feed["source"], "apartment_id": feed["apartment_id"], "events": events, "status": "ok"})
        except Exception as e:
            results.append({"source": feed["source"], "apartment_id": feed["apartment_id"], "status": f"error: {e}"})
    return {"results": results}


@api_router.get("/calendar/feeds")
async def list_calendar_feeds():
    feeds = await db.calendar_feeds.find({}, {"_id": 0, "url": 0}).to_list(50)
    return {"feeds": feeds}


# ---------- iCal export (per importare su Booking/Airbnb le prenotazioni dirette) ----------
def _ical_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


async def _export_ical(apartment_id: str) -> str:
    apt = APARTMENTS[apartment_id]
    bookings = await db.booking_requests.find(
        {"apartment_id": apartment_id, "status": {"$ne": "cancelled"}},
        {"_id": 0},
    ).to_list(2000)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Appartamenti Brufani//Prenotazioni Dirette//IT",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_ical_escape(apt['name'])} - prenotazioni dirette",
    ]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    for b in bookings:
        lines += [
            "BEGIN:VEVENT",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{b['check_in'].replace('-', '')}",
            f"DTEND;VALUE=DATE:{b['check_out'].replace('-', '')}",
            f"UID:{b['id']}@appartamentibrufani",
            f"SUMMARY:{_ical_escape('Prenotazione diretta - ' + b.get('name', 'ospite'))}",
            "STATUS:CONFIRMED",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


@api_router.get("/calendar/export/{apartment_id}.ics")
@api_router.get("/calendar/export/{apartment_id}")
async def export_calendar(apartment_id: str):
    apartment_id = apartment_id.removesuffix(".ics")
    if apartment_id not in APARTMENTS:
        raise HTTPException(status_code=400, detail="Unknown apartment")
    return Response(content=await _export_ical(apartment_id), media_type="text/calendar")


# ---------- Payments (Stripe) ----------
@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("payment_status") != "paid" and stripe.api_key:
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid":
                await _mark_paid(session_id, str(request.base_url))
        except Exception as e:
            logger.error(f"Stripe status poll failed: {e}")
    booking = await db.booking_requests.find_one(
        {"id": tx["booking_id"]},
        {"_id": 0, "code": 1, "status": 1, "apartment_name": 1, "check_in": 1, "check_out": 1, "guests": 1, "stay_online": 1, "city_tax": 1},
    )
    return {
        "session_id": session_id,
        "payment_status": tx.get("payment_status"),
        "booking": booking,
    }


@api_router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    obj, t = event["data"]["object"], event["type"]
    base_url = str(request.base_url)
    if t == "checkout.session.completed":
        await _mark_paid(obj["id"], base_url)
    elif t in ("checkout.session.async_payment_failed", "checkout.session.expired"):
        tx = await db.payment_transactions.find_one({"session_id": obj["id"]})
        if tx:
            upd = await db.booking_requests.update_one(
                {"id": tx["booking_id"], "status": "pending_payment"},
                {"$set": {"status": "expired", "payment_status": "expired"}},
            )
            if upd.modified_count:
                await _release_dates(tx["booking_id"])
        await db.payment_transactions.update_one(
            {"session_id": obj["id"]},
            {"$set": {"status": "expired", "payment_status": "expired", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    elif t == "charge.refunded":
        await db.payment_transactions.update_one(
            {"stripe_payment_intent_id": obj.get("payment_intent")},
            {"$set": {"status": "refunded", "payment_status": "refunded", "updated_at": datetime.now(timezone.utc).isoformat()}},
        )
    return {"status": "ok"}


# ---------- Owner confirm / reject (link nell'email) ----------
@api_router.get("/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, token: str = ""):
    b = await db.booking_requests.find_one({"id": booking_id})
    if not b or b.get("action_token") != token:
        return Response(content=_owner_page("Link non valido", "Questo link non è valido o è scaduto."), media_type="text/html", status_code=403)
    if b["status"] == "confirmed":
        return Response(content=_owner_page("Già confermata", f"La prenotazione {b.get('code')} era già confermata."), media_type="text/html")
    if b["status"] != "paid":
        return Response(content=_owner_page("Azione non disponibile", f"La prenotazione {b.get('code')} è in stato '{b['status']}' e non può essere confermata."), media_type="text/html", status_code=409)
    await db.booking_requests.update_one(
        {"id": booking_id},
        {"$set": {"status": "confirmed", "confirmed_at": datetime.now(timezone.utc).isoformat()}},
    )
    await _send_guest_email(b, "confirmed")
    return Response(content=_owner_page("Prenotazione confermata", f"{b.get('code')} · {b['apartment_name']} · {b['name']}: l'ospite ha ricevuto l'email di conferma."), media_type="text/html")


@api_router.get("/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, token: str = ""):
    b = await db.booking_requests.find_one({"id": booking_id})
    if not b or b.get("action_token") != token:
        return Response(content=_owner_page("Link non valido", "Questo link non è valido o è scaduto."), media_type="text/html", status_code=403)
    if b["status"] in ("cancelled", "refunded"):
        return Response(content=_owner_page("Già rifiutata", f"La prenotazione {b.get('code')} era già stata rifiutata e rimborsata."), media_type="text/html")
    if b["status"] != "paid":
        return Response(content=_owner_page("Azione non disponibile", f"La prenotazione {b.get('code')} è in stato '{b['status']}' e non può essere rifiutata."), media_type="text/html", status_code=409)
    refund_ok = False
    if b.get("stripe_payment_intent") and stripe.api_key:
        try:
            stripe.Refund.create(payment_intent=b["stripe_payment_intent"])
            refund_ok = True
        except Exception as e:
            logger.error(f"Stripe refund failed for {booking_id}: {e}")
            return Response(content=_owner_page("Rimborso non riuscito", "Errore durante il rimborso. Riprova tra poco o contatta l'assistenza."), media_type="text/html", status_code=502)
    await db.booking_requests.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled", "payment_status": "refunded" if refund_ok else b.get("payment_status"), "cancelled_at": datetime.now(timezone.utc).isoformat()}},
    )
    await _release_dates(booking_id)
    await _send_guest_email(b, "rejected")
    return Response(content=_owner_page("Prenotazione rifiutata", f"{b.get('code')} · rimborso completo avviato, le date sono di nuovo disponibili."), media_type="text/html")


# ---------- Stato prenotazione per l'ospite ----------
@api_router.get("/bookings/status/{code}")
async def guest_booking_status(code: str, email: str = ""):
    b = await db.booking_requests.find_one(
        {"code": code.strip().upper(), "email": email.strip().lower()},
        {"_id": 0, "code": 1, "status": 1, "payment_status": 1, "apartment_name": 1, "check_in": 1, "check_out": 1, "guests": 1, "stay_online": 1, "city_tax": 1, "created_at": 1},
    )
    if not b:
        raise HTTPException(status_code=404, detail="not_found")
    return b


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
