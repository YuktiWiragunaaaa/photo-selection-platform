# [ID] Pengaturan studio yang disimpan di database: identitas, tema, alamat publik, password, logo, video intro.
"""Studio branding stored in the settings table + an optional logo file on disk.

Also holds everything the photographer can customise from the admin panel without touching code:
theme (colours, fonts, intro, guide), the WhatsApp message template, the public address, and an
admin password that overrides ADMIN_PASSWORD from .env.
"""
import hashlib
import hmac
import json
import re
import secrets
from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from ..config import BACKEND_DIR
from ..models import Setting
from ..schemas import Branding

KEYS = ("studio_name", "tagline", "contact", "wa_number")
UPLOAD_DIR = BACKEND_DIR / "uploads"
LOGO_NAME = "logo"
LOGO_TYPES = {"image/png": ".png", "image/jpeg": ".jpg", "image/svg+xml": ".svg", "image/webp": ".webp"}


def logo_path() -> Path | None:
    for ext in LOGO_TYPES.values():
        p = UPLOAD_DIR / f"{LOGO_NAME}{ext}"
        if p.exists():
            return p
    return None


# ---------------------------------------------------------------- theme
DEFAULT_WA_TEMPLATE = (
    "Halo {nama}, fotonya sudah bisa dipilih ya.\n"
    "\n"
    "{link}\n"
    "PIN: {pin}\n"
    "\n"
    "Pilih {paket} foto favorit kalian ya{tambahan}, lalu tekan Kirim.\n"
    "\n"
    "Ditunggu sampai {deadline}.\n"
    "\n"
    "Terima kasih!"
)

FONTS_DISPLAY = ["Instrument Serif", "Playfair Display", "Fraunces", "DM Serif Display", "Cormorant Garamond", "Bricolage Grotesque", "Syne"]
FONTS_BODY = ["Bricolage Grotesque", "Manrope", "DM Sans", "Plus Jakarta Sans", "Outfit", "Work Sans"]

THEME_DEFAULTS = {
    "paper": "#F4F1EA",  # background
    "ink": "#141413",  # text & dark surfaces
    "accent": "#D4FF3A",  # buttons & highlights
    "color_mode": "light",  # light | dark | auto (follow the client's device)
    "font_display": "Instrument Serif",
    "font_body": "Bricolage Grotesque",
    "display_italic": True,
    "intro_enabled": True,
    "intro_style": "morph",  # morph | letters | fade | video | none
    "intro_text": "Galeri untuk",
    "intro_seconds": 2.6,
    "guide_enabled": True,
    "text_scale": 1.12,  # client gallery text size: 1 normal, 1.12 besar, 1.25 sangat besar
    "simple_mode": False,  # hides "Tandai dulu", bigger labelled buttons — for less tech-savvy clients
    "gallery_title": "Pilih foto favorit Anda",
    "wa_template": DEFAULT_WA_TEMPLATE,
}
INTRO_STYLES = ("morph", "letters", "fade", "video", "none")

# Intro video limits — keep the first impression fast on mobile data.
VIDEO_TYPES = {"video/mp4": ".mp4", "video/webm": ".webm"}
VIDEO_MAX_BYTES = 6 * 1024 * 1024  # 6 MB (a 6 s, 720p clip is usually 1.5–4 MB)
VIDEO_MAX_SECONDS = 8  # checked in the browser before upload
VIDEO_VARIANTS = ("desktop", "mobile")  # 16:9 for laptops, 9:16 for phones (optional)


def video_path(variant: str) -> Path | None:
    for ext in VIDEO_TYPES.values():
        p = UPLOAD_DIR / f"intro-{variant}{ext}"
        if p.exists():
            return p
    return None


def save_video(variant: str, content: bytes, content_type: str) -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    remove_video(variant)
    (UPLOAD_DIR / f"intro-{variant}{VIDEO_TYPES[content_type]}").write_bytes(content)


def remove_video(variant: str) -> None:
    p = video_path(variant)
    if p:
        p.unlink(missing_ok=True)


def video_urls() -> dict:
    out = {}
    for v in VIDEO_VARIANTS:
        p = video_path(v)
        out[v] = f"/api/branding/intro-video/{v}?v={int(p.stat().st_mtime)}" if p else None
    return out


HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def normalize_wa(value: str | None) -> str:
    """Rapikan nomor WhatsApp ke format yang diterima wa.me: hanya angka, diawali kode negara.

    "0812-3456-7890" dan "+62 812 3456 7890" sama-sama menjadi "6281234567890".
    Nomor yang terlalu pendek/panjang dianggap kosong supaya tombol chat tidak salah arah.
    """
    digits = re.sub(r"\D", "", value or "")
    if not digits:
        return ""
    if digits.startswith("0"):
        digits = "62" + digits.lstrip("0")
    elif digits.startswith("620"):
        digits = "62" + digits[3:]
    elif len(digits) <= 12 and digits.startswith("8"):
        digits = "62" + digits  # ditulis tanpa 0 maupun kode negara
    return digits if 8 <= len(digits) <= 15 else ""


def get_theme(db: DbSession) -> dict:
    row = db.get(Setting, "theme")
    try:
        saved = json.loads(row.value) if row and row.value else {}
    except ValueError:
        saved = {}
    return {**THEME_DEFAULTS, **{k: v for k, v in saved.items() if k in THEME_DEFAULTS}}


def clean_theme(values: dict) -> dict:
    """Validate a theme update; unknown keys are dropped, bad values fall back to defaults."""
    out = {}
    for k, default in THEME_DEFAULTS.items():
        if k not in values:
            continue
        v = values[k]
        if k in ("paper", "ink", "accent"):
            v = v if isinstance(v, str) and HEX.match(v) else default
        elif k == "color_mode":
            v = v if v in ("light", "dark", "auto") else default
        elif k == "intro_style":
            v = v if v in INTRO_STYLES else default
        elif k == "font_display":
            v = v if v in FONTS_DISPLAY else default
        elif k == "font_body":
            v = v if v in FONTS_BODY else default
        elif isinstance(default, bool):
            v = bool(v)
        elif k == "text_scale":
            try:
                v = min(1.3, max(1.0, float(v)))
            except (TypeError, ValueError):
                v = default
        elif k == "intro_seconds":
            try:
                v = min(6.0, max(1.5, float(v)))
            except (TypeError, ValueError):
                v = default
        else:
            v = str(v or "")[:2000] or default
        out[k] = v
    return out


def set_theme(db: DbSession, values: dict) -> dict:
    theme = {**get_theme(db), **clean_theme(values)}
    _put(db, "theme", json.dumps(theme))
    db.commit()
    return theme


# ---------------------------------------------------------------- public address
def public_url(db: DbSession) -> str:
    row = db.get(Setting, "public_url")
    return (row.value or "").strip().rstrip("/") if row else ""


def set_public_url(db: DbSession, url: str) -> None:
    url = (url or "").strip().rstrip("/")
    if url and not re.match(r"^https?://[^\s/]+", url):
        raise ValueError("Alamat harus diawali http:// atau https://")
    _put(db, "public_url", url)
    db.commit()


# ---------------------------------------------------------------- admin password (overrides .env)
def _hash_pw(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


def check_admin_password(db: DbSession, password: str) -> bool | None:
    """True/False when a password was set from the admin panel; None when .env should be used."""
    row = db.get(Setting, "admin_password")
    if not row or not row.value:
        return None
    salt, digest = row.value.split("$", 1)
    return hmac.compare_digest(_hash_pw(password, salt), digest)


def set_admin_password(db: DbSession, password: str) -> None:
    salt = secrets.token_hex(8)
    _put(db, "admin_password", f"{salt}${_hash_pw(password, salt)}")
    db.commit()


def _put(db: DbSession, key: str, value: str) -> None:
    row = db.get(Setting, key)
    if row is None:
        db.add(Setting(key=key, value=value))
    else:
        row.value = value


def get(db: DbSession) -> Branding:
    rows = {r.key: r.value for r in db.query(Setting).filter(Setting.key.in_(KEYS)).all()}
    lp = logo_path()
    theme = get_theme(db)
    theme.pop("wa_template", None)  # admin-only; not needed by the client gallery
    return Branding(
        studio_name=rows.get("studio_name") or "",
        tagline=rows.get("tagline") or "",
        contact=rows.get("contact") or "",
        wa_number=rows.get("wa_number") or "",
        logo_url=f"/api/branding/logo?v={int(lp.stat().st_mtime)}" if lp else None,
        theme=theme,
        intro_video=video_urls(),
    )


def set_values(db: DbSession, values: dict[str, str]) -> None:
    for k in KEYS:
        if k not in values:
            continue
        v = normalize_wa(values[k]) if k == "wa_number" else values[k].strip()
        row = db.get(Setting, k)
        if row is None:
            db.add(Setting(key=k, value=v))
        else:
            row.value = v
    db.commit()


def save_logo(content: bytes, content_type: str) -> None:
    ext = LOGO_TYPES[content_type]
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    remove_logo()
    (UPLOAD_DIR / f"{LOGO_NAME}{ext}").write_bytes(content)


def remove_logo() -> None:
    p = logo_path()
    if p:
        p.unlink(missing_ok=True)
