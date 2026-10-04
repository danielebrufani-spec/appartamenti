"""
Backend tests for the Stripe-powered booking flow of Appartamenti Brufani.

Covers:
- Availability endpoint & iCal-synced blocked dates
- booking-request creates a Stripe Checkout session with correct amount
- 409 when requesting unavailable (iCal-blocked) dates
- 409 when requesting dates currently held by a pending_payment booking
- /api/payments/status/{session_id} for unknown + known sessions
- /api/bookings/status/{code} for unknown + known bookings
- Owner confirm & reject endpoints token validation
- Reject (refund) flow against Stripe test API by manually marking a booking paid
- iCal export endpoint (.ics)
"""
import os
import time
import uuid
import pytest
import requests
import stripe
from datetime import date, timedelta, datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

load_dotenv("/app/backend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://book-assisi-direct.preview.emergentagent.com"
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

APT_MONO = "appartamento-brufani-due"
APT_TRILO = "appartamento-brufani"


@pytest.fixture(scope="module")
def db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def _future_range(start_days: int, nights: int):
    ci = date.today() + timedelta(days=start_days)
    co = ci + timedelta(days=nights)
    return ci.isoformat(), co.isoformat()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Health & availability ----
def test_api_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("message")


def test_availability_mono(api):
    r = api.get(f"{BASE_URL}/api/availability", params={"apartment_id": APT_MONO})
    assert r.status_code == 200
    data = r.json()
    assert data["apartment_id"] == APT_MONO
    assert isinstance(data["blocked"], list)
    # Monolocale: only Oct 3 & Oct 17, 2026 blocked per request
    oct26 = [d for d in data["blocked"] if d.startswith("2026-10")]
    assert "2026-10-03" in oct26
    assert "2026-10-17" in oct26


def test_availability_trilo_october_blocked(api):
    r = api.get(f"{BASE_URL}/api/availability", params={"apartment_id": APT_TRILO})
    assert r.status_code == 200
    oct26 = set(d for d in r.json()["blocked"] if d.startswith("2026-10"))
    for d in ["2026-10-16", "2026-10-17", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-30"]:
        assert d in oct26, f"Trilocale should have {d} blocked by iCal, got {sorted(oct26)}"


def test_availability_unknown_apartment(api):
    r = api.get(f"{BASE_URL}/api/availability", params={"apartment_id": "nope"})
    assert r.status_code == 400


# ---- booking-request validation ----
def test_booking_request_invalid_dates(api):
    r = api.post(f"{BASE_URL}/api/booking-request", json={
        "apartment_id": APT_MONO, "check_in": "2027-05-13", "check_out": "2027-05-10",
        "guests": 2, "name": "TEST invalid", "email": "test_invalid@example.com", "phone": "+393331234567",
        "origin_url": BASE_URL,
    })
    assert r.status_code == 400


def test_booking_request_409_on_blocked(api):
    # Trilocale 2026-10-16..18 is blocked by iCal
    r = api.post(f"{BASE_URL}/api/booking-request", json={
        "apartment_id": APT_TRILO, "check_in": "2026-10-16", "check_out": "2026-10-18",
        "guests": 2, "name": "TEST blocked", "email": "test_blocked@example.com", "phone": "+393331234567",
        "origin_url": BASE_URL,
    })
    assert r.status_code == 409
    assert r.json().get("detail") == "dates_unavailable"


def test_booking_request_requires_https_origin(api):
    ci, co = _future_range(500, 3)
    r = api.post(f"{BASE_URL}/api/booking-request", json={
        "apartment_id": APT_MONO, "check_in": ci, "check_out": co,
        "guests": 2, "name": "TEST origin", "email": "test_origin@example.com", "phone": "+393331234567",
        "origin_url": "http://unsafe.example",
    })
    assert r.status_code == 400


# ---- Stripe checkout session creation ----
@pytest.fixture(scope="module")
def created_booking(api):
    """Create a real pending_payment booking (uses a far-future set of dates to avoid clashes)."""
    ci, co = _future_range(600, 3)  # 3 nights
    payload = {
        "apartment_id": APT_MONO,
        "check_in": ci,
        "check_out": co,
        "guests": 2,
        "name": "TEST E2E Backend",
        "email": "test_backend@example.com", "phone": "+393331234567",
        "language": "it",
        "origin_url": BASE_URL,
    }
    r = api.post(f"{BASE_URL}/api/booking-request", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    yield data
    # cleanup: release blocked dates & delete booking
    client = AsyncIOMotorClient(MONGO_URL)
    adb = client[DB_NAME]

    async def _clean():
        await adb.blocked_dates.delete_many({"request_id": data["id"]})
        await adb.booking_requests.delete_many({"id": data["id"]})
        await adb.payment_transactions.delete_many({"booking_id": data["id"]})
    _run(_clean())


def test_booking_request_amount_and_checkout_url(created_booking):
    d = created_booking
    assert d["status"] == "pending_payment"
    assert d["code"].startswith("BRF-")
    assert d["nights"] == 3
    # 90 base price * 3 nights = 270 (monolocale, 2 guests = base)
    assert d["direct_price"] == 270 + d["city_tax"], f"direct_price mismatch, got {d}"
    assert d["nightly_rate"] == 90
    assert d["city_tax"] == 3 * 2 * 3  # €18
    assert d["checkout_url"].startswith("https://checkout.stripe.com/")


def test_booking_request_409_double_booking(api, created_booking):
    """Second booking on same dates should be rejected because dates are now blocked (direct hold)."""
    r = api.post(f"{BASE_URL}/api/booking-request", json={
        "apartment_id": APT_MONO,
        "check_in": (date.today() + timedelta(days=601)).isoformat(),
        "check_out": (date.today() + timedelta(days=602)).isoformat(),
        "guests": 2, "name": "TEST double", "email": "test_double@example.com", "phone": "+393331234567",
        "origin_url": BASE_URL,
    })
    assert r.status_code == 409
    assert r.json().get("detail") == "dates_unavailable"


def test_stripe_session_amount_matches(created_booking):
    """Verify the actual Stripe session has unit_amount = 27000 cents."""
    # Grab session id from booking record
    client = AsyncIOMotorClient(MONGO_URL)
    adb = client[DB_NAME]

    async def _get():
        return await adb.booking_requests.find_one({"id": created_booking["id"]}, {"_id": 0, "stripe_session_id": 1})
    rec = _run(_get())
    sid = rec["stripe_session_id"]
    s = stripe.checkout.Session.retrieve(sid, expand=["line_items"])
    assert s.amount_total == 27000
    assert s.currency == "eur"
    assert s.payment_status == "unpaid"


# ---- Payment status endpoint ----
def test_payments_status_unknown(api):
    r = api.get(f"{BASE_URL}/api/payments/status/cs_test_unknown_xxx")
    assert r.status_code == 404


def test_payments_status_known_pending(api, created_booking):
    client = AsyncIOMotorClient(MONGO_URL)
    adb = client[DB_NAME]

    async def _get():
        return await adb.booking_requests.find_one({"id": created_booking["id"]}, {"_id": 0, "stripe_session_id": 1})
    sid = _run(_get())["stripe_session_id"]
    r = api.get(f"{BASE_URL}/api/payments/status/{sid}")
    assert r.status_code == 200
    data = r.json()
    assert data["payment_status"] in ("pending", "paid")
    assert data["booking"]["code"] == created_booking["code"]


# ---- Guest status endpoint ----
def test_guest_booking_status_not_found(api):
    r = api.get(f"{BASE_URL}/api/bookings/status/BRF-NOTEXIST", params={"email": "nope@example.com"})
    assert r.status_code == 404


def test_guest_booking_status_found(api, created_booking):
    r = api.get(f"{BASE_URL}/api/bookings/status/{created_booking['code']}",
                params={"email": "test_backend@example.com"})
    assert r.status_code == 200
    assert r.json()["status"] == "pending_payment"


# ---- Owner confirm/reject link token validation ----
def test_confirm_invalid_token(api, created_booking):
    r = api.get(f"{BASE_URL}/api/bookings/{created_booking['id']}/confirm", params={"token": "wrong"})
    assert r.status_code == 403


def test_confirm_pending_payment_rejected(api, created_booking):
    client = AsyncIOMotorClient(MONGO_URL)
    adb = client[DB_NAME]

    async def _get():
        return await adb.booking_requests.find_one({"id": created_booking["id"]}, {"_id": 0, "action_token": 1})
    tok = _run(_get())["action_token"]
    r = api.get(f"{BASE_URL}/api/bookings/{created_booking['id']}/confirm", params={"token": tok})
    assert r.status_code == 409  # not paid yet


# ---- Simulated paid booking: confirm & reject + Stripe refund ----
@pytest.fixture(scope="module")
def paid_booking_for_reject(api):
    """
    Create a booking, perform a real test-mode payment via Stripe PaymentIntents API
    (simulate a card_present-free payment with a test token so we can refund it),
    then manually mark the booking paid in DB to exercise reject -> refund flow.

    Because Checkout Sessions need a browser, we instead use PaymentIntents.create
    with payment_method=pm_card_visa and confirm=True so Stripe gives us a real
    succeeded payment_intent that we can refund.
    """
    ci, co = _future_range(700, 2)
    r = api.post(f"{BASE_URL}/api/booking-request", json={
        "apartment_id": APT_MONO, "check_in": ci, "check_out": co,
        "guests": 2, "name": "TEST Reject Flow", "email": "test_reject@example.com", "phone": "+393331234567",
        "origin_url": BASE_URL,
    })
    assert r.status_code == 200
    booking = r.json()

    # Create a succeeded PaymentIntent in Stripe test mode
    pi = stripe.PaymentIntent.create(
        amount=int(booking["direct_price"] * 100),  # arbitrary (will be refunded)
        currency="eur",
        payment_method="pm_card_visa",
        confirm=True,
        automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
    )
    assert pi.status == "succeeded"

    # Mark booking as paid directly in DB
    client = AsyncIOMotorClient(MONGO_URL)
    adb = client[DB_NAME]

    async def _mark():
        await adb.booking_requests.update_one(
            {"id": booking["id"]},
            {"$set": {"status": "paid", "payment_status": "paid",
                      "stripe_payment_intent": pi.id,
                      "paid_at": datetime.now(timezone.utc).isoformat()}},
        )
        return await adb.booking_requests.find_one({"id": booking["id"]}, {"_id": 0, "action_token": 1})
    rec = _run(_mark())
    booking["action_token"] = rec["action_token"]
    booking["payment_intent"] = pi.id
    yield booking

    async def _clean():
        await adb.blocked_dates.delete_many({"request_id": booking["id"]})
        await adb.booking_requests.delete_many({"id": booking["id"]})
        await adb.payment_transactions.delete_many({"booking_id": booking["id"]})
    _run(_clean())


def test_reject_flow_refunds_and_releases_dates(api, paid_booking_for_reject):
    b = paid_booking_for_reject
    r = api.get(f"{BASE_URL}/api/bookings/{b['id']}/reject", params={"token": b["action_token"]})
    assert r.status_code == 200
    assert "Prenotazione rifiutata" in r.text

    # Verify Stripe PaymentIntent is refunded (check refunds list)
    refunds = stripe.Refund.list(payment_intent=b["payment_intent"], limit=5).data
    assert refunds, "No refund created for PaymentIntent"
    assert refunds[0].status in ("succeeded", "pending")
    pi = stripe.PaymentIntent.retrieve(b["payment_intent"])
    total_refunded = sum(r.amount for r in refunds)
    assert total_refunded == pi.amount, f"Not fully refunded: {total_refunded}/{pi.amount}"

    # Verify dates are released
    client = AsyncIOMotorClient(MONGO_URL)
    adb = client[DB_NAME]

    async def _check():
        return await adb.blocked_dates.count_documents({"request_id": b["id"]})
    assert _run(_check()) == 0

    # Status endpoint should now say cancelled
    r2 = api.get(f"{BASE_URL}/api/bookings/status/{b['code']}", params={"email": "test_reject@example.com"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "cancelled"


@pytest.fixture(scope="module")
def paid_booking_for_confirm(api):
    ci, co = _future_range(800, 2)
    r = api.post(f"{BASE_URL}/api/booking-request", json={
        "apartment_id": APT_MONO, "check_in": ci, "check_out": co,
        "guests": 2, "name": "TEST Confirm Flow", "email": "test_confirm@example.com", "phone": "+393331234567",
        "origin_url": BASE_URL,
    })
    assert r.status_code == 200
    booking = r.json()

    pi = stripe.PaymentIntent.create(
        amount=int(booking["direct_price"] * 100),
        currency="eur",
        payment_method="pm_card_visa",
        confirm=True,
        automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
    )
    client = AsyncIOMotorClient(MONGO_URL)
    adb = client[DB_NAME]

    async def _mark():
        await adb.booking_requests.update_one(
            {"id": booking["id"]},
            {"$set": {"status": "paid", "payment_status": "paid",
                      "stripe_payment_intent": pi.id}},
        )
        return await adb.booking_requests.find_one({"id": booking["id"]}, {"_id": 0, "action_token": 1})
    rec = _run(_mark())
    booking["action_token"] = rec["action_token"]
    booking["payment_intent"] = pi.id
    yield booking

    async def _clean():
        # Refund so we don't leave money on test account
        try:
            stripe.Refund.create(payment_intent=pi.id)
        except Exception:
            pass
        await adb.blocked_dates.delete_many({"request_id": booking["id"]})
        await adb.booking_requests.delete_many({"id": booking["id"]})
        await adb.payment_transactions.delete_many({"booking_id": booking["id"]})
    _run(_clean())


def test_confirm_flow_sets_confirmed(api, paid_booking_for_confirm):
    b = paid_booking_for_confirm
    r = api.get(f"{BASE_URL}/api/bookings/{b['id']}/confirm", params={"token": b["action_token"]})
    assert r.status_code == 200
    assert "Prenotazione confermata" in r.text

    r2 = api.get(f"{BASE_URL}/api/bookings/status/{b['code']}", params={"email": "test_confirm@example.com"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "confirmed"


# ---- iCal export ----
def test_ical_export(api):
    r = api.get(f"{BASE_URL}/api/calendar/export/{APT_MONO}.ics")
    assert r.status_code == 200
    assert "BEGIN:VCALENDAR" in r.text
    assert "END:VCALENDAR" in r.text
