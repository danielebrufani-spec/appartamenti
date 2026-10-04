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

    doc = {
        "id": request_id,
        "apartment_id": payload.apartment_id,
        "apartment_name": apt["name"],
        "check_in": payload.check_in.isoformat(),
        "check_out": payload.check_out.isoformat(),
        "guests": payload.guests,
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "message": payload.message,
        "language": payload.language,
        "nights": nights,
        "nightly_rate": nightly,
        "ota_price": ota_total,
        "direct_price": direct_total,
        "city_tax": city_tax,
        "status": "received",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.booking_requests.insert_one(doc)

    if OWNER_EMAIL:
        subject = f"Nuova richiesta di prenotazione - {apt['name']}"
        rows = "".join([
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Appartamento</td><td style='padding:6px 12px'><strong>{escape(apt['name'])}</strong></td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Check-in</td><td style='padding:6px 12px'>{_fmt_data_it(payload.check_in)}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Check-out</td><td style='padding:6px 12px'>{_fmt_data_it(payload.check_out)}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Ospiti</td><td style='padding:6px 12px'>{payload.guests}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Nome</td><td style='padding:6px 12px'>{escape(payload.name)}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Email</td><td style='padding:6px 12px'>{escape(payload.email)}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Telefono</td><td style='padding:6px 12px'>{escape(payload.phone or '-')}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Messaggio</td><td style='padding:6px 12px'>{escape(payload.message or '-')}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Notti</td><td style='padding:6px 12px'>{nights}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Tariffa a notte</td><td style='padding:6px 12px'>&euro;{nightly}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Soggiorno</td><td style='padding:6px 12px'>{nights} notti x &euro;{nightly} = &euro;{stay}</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Stesso soggiorno sui portali</td><td style='padding:6px 12px'>&euro;{ota_stay} (con commissioni ~15%)</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Tassa di soggiorno</td><td style='padding:6px 12px'>&euro;{city_tax} (da versare al Comune)</td></tr>",
            f"<tr><td style='padding:6px 12px;color:#6E7570'>Totale ospite</td><td style='padding:6px 12px'><strong>&euro;{direct_total}</strong> (sui portali: &euro;{ota_total})</td></tr>",
        ])
        html = (
            "<table role='presentation' width='100%'><tr><td style='padding:24px;font-family:Arial,sans-serif'>"
            f"<h2 style='color:#2C4231;margin:0 0 16px'>Nuova richiesta di prenotazione</h2>"
            f"<table role='presentation' style='border-collapse:collapse'>{rows}</table>"
            f"<p style='font-size:12px;color:#888;margin-top:24px'>Inviata dal sito {escape(EMAIL_FROM_NAME)}. "
            "Non chiediamo mai password o dati di pagamento via email.</p>"
            "</td></tr></table>"
        )
        email_id = await send_email(to=OWNER_EMAIL, subject=subject, html=html)
        logger.info(f"Owner notification email id: {email_id}")
    else:
        logger.warning("OWNER_EMAIL not configured - booking request stored without email notification")

    return {
        "id": request_id,
        "status": "received",
        "nights": nights,
        "nightly_rate": nightly,
        "ota_price": ota_total,
        "direct_price": direct_total,
        "city_tax": city_tax,
    }


@api_router.get("/availability")
async def get_availability(apartment_id: str):
    if apartment_id not in APARTMENTS:
        raise HTTPException(status_code=400, detail="Unknown apartment")
    blocked = sorted(await _blocked_dates(apartment_id))
    return {"apartment_id": apartment_id, "blocked": blocked}


@api_router.post("/calendar/feeds")
async def add_calendar_feed(payload: CalendarFeedCreate):
    if payload.apartment_id not in APARTMENTS:
        raise HTTPException(status_code=400, detail="Unknown apartment")
    if not payload.url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Feed URL must be https")
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
