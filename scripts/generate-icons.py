#!/usr/bin/env python3
"""Generate DropDeploy PWA/favicon icons matching the webapp UI.

Ikuti logo navbar: lingkaran hitam + roket putih meluncur ke atas,
plus glow aksen periwinkle & ekor api kuning/magenta (warna sticker UI).
Rendered di supersampling lalu di-downscale (anti-aliasing).
"""
from PIL import Image, ImageDraw, ImageFilter
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SS = 4                 # supersampling factor
S = 512 * SS           # canvas float
cx, cy = S / 2, S / 2
R = 236 * SS           # ikon radius

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
PERIWINKLE = (117, 117, 240)
SOFT_PERI = (147, 158, 235)
YELLOW = (255, 196, 53)
PINK = (230, 153, 217)
GREEN = (60, 221, 140)


def rounded_rocket(dw):
    """Roket runcing bernuansa UI: badan hijau, jendela ungu, api kuning."""
    ox, oy = cx, cy + 20 * SS

    # --- ekor api (kuning) ---
    dw.polygon([
        (ox - 46 * SS, oy + 118 * SS),
        (ox + 46 * SS, oy + 118 * SS),
        (ox, oy + 215 * SS),
    ], fill=YELLOW)
    # lidah api dalam (ungu muda)
    dw.polygon([
        (ox - 24 * SS, oy + 120 * SS),
        (ox + 24 * SS, oy + 120 * SS),
        (ox, oy + 172 * SS),
    ], fill=PERIWINKLE)

    # --- badan roket (hijau) ---
    body_w = 92 * SS
    top_y = oy - 130 * SS          # puncak kerucut
    base_y = oy + 20 * SS          # pertemuan kerucut & kapsul
    bottom_y = oy + 150 * SS       # dasar kapsul
    body_h = bottom_y - top_y

    # kerucut atas (runcing), hijau
    dw.polygon([
        (ox, top_y),
        (ox - body_w / 2, base_y),
        (ox + body_w / 2, base_y),
    ], fill=GREEN)

    # kapsul bawah (elips), hijau
    kapsul_left = ox - body_w / 2
    kapsul_top = bottom_y - body_h
    dw.pieslice(
        [kapsul_left, kapsul_top, kapsul_left + body_w, kapsul_top + 2 * body_h],
        180, 360, fill=GREEN,
    )
    # persegi penyambung biar mulus
    dw.rectangle(
        [kapsul_left, base_y - 6 * SS, kapsul_left + body_w, bottom_y],
        fill=GREEN,
    )

    # --- fins / sayap (hijau) ---
    fin_top = base_y - 40 * SS
    fin_bot = bottom_y + 6 * SS
    dw.polygon([
        (kapsul_left, fin_top),
        (kapsul_left - 40 * SS, fin_bot),
        (kapsul_left + 10 * SS, fin_bot),
    ], fill=GREEN)
    dw.polygon([
        (kapsul_left + body_w, fin_top),
        (kapsul_left + body_w + 40 * SS, fin_bot),
        (kapsul_left + body_w - 10 * SS, fin_bot),
    ], fill=GREEN)

    # --- jendela kapsul (ungu) ---
    win_r = 26 * SS
    dw.ellipse(
        [ox - win_r, oy + 62 * SS - win_r, ox + win_r, oy + 62 * SS + win_r],
        fill=PERIWINKLE, outline=WHITE, width=int(7 * SS),
    )

    # --- stripe hijau muda di badan (aksen vertikal) ---
    strip_x = kapsul_left + body_w / 2
    dw.rectangle([strip_x - 2 * SS, top_y, strip_x + 2 * SS, bottom_y], fill=SOFT_PERI)

    # --- highlight / sinar putih tipis di sisi kiri kerucut ---
    dw.ellipse(
        [ox - 26 * SS, top_y + 24 * SS, ox - 6 * SS, top_y + 42 * SS],
        fill=WHITE,
    )


def make_icon(size):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dw = ImageDraw.Draw(img)

    # --- glow periwinkle di belakang lingkaran ---
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([cx - R, cy - R, cx + R, cy + R], fill=SOFT_PERI + (150,))
    glow = glow.filter(ImageFilter.GaussianBlur(28 * SS))
    img.alpha_composite(glow)

    # --- lingkaran hitam utama (dasar logo) ---
    dw.ellipse([cx - R, cy - R, cx + R, cy + R], fill=BLACK)

    # --- roket ---
    rounded_rocket(dw)

    # --- shrink to target ---
    return img.resize((size, size), Image.LANCZOS)


def save(rel, size):
    icon = make_icon(size)
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    icon.convert("RGB").save(path, "PNG")
    print(f"✓ {rel} ({size}x{size})")


if __name__ == "__main__":
    save("app/icon.png", 32)
    save("app/icon192.png", 192)
    save("app/icon512.png", 512)
    save("app/apple-icon.png", 180)
    save("public/icon.png", 32)
    save("public/icon192.png", 192)
    save("public/icon512.png", 512)
    save("public/apple-icon.png", 180)