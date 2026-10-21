#!/usr/bin/env python3
"""Compose Dexscreener/X banners and promo graphics with exact type."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = Path("/Users/wendellphillips/Documents/GitHub/mew-pokedex")
ASSETS = ROOT / "assets"
PROMOS = ROOT / "promos"
FONT_DIR = Path("/System/Library/Fonts/Supplemental")

BLACK = str(FONT_DIR / "Arial Black.ttf")
BOLD = str(FONT_DIR / "Arial Bold.ttf")
MONO = str(FONT_DIR / "Courier New Bold.ttf")
MONO_REG = str(FONT_DIR / "Courier New.ttf")

CREAM = (246, 235, 232, 255)
PETAL = (232, 160, 180, 255)
INK = (22, 14, 20, 255)
PLUM = (42, 26, 40, 255)


def font(path, size):
    return ImageFont.truetype(path, size)


def fit_cover(im, w, h, focus_y=0.5):
    im = im.convert("RGB")
    scale = max(w / im.width, h / im.height)
    nw, nh = int(im.width * scale), int(im.height * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - w) // 2
    top = int((nh - h) * focus_y)
    top = max(0, min(top, nh - h))
    return im.crop((left, top, left + w, top + h))


def darken_left(im, strength=0.55, width_ratio=0.48):
    overlay = Image.new("RGB", im.size, (16, 10, 18))
    mask = Image.new("L", im.size, 0)
    draw = ImageDraw.Draw(mask)
    w, h = im.size
    band = int(w * width_ratio)
    for x in range(band):
        a = int(255 * strength * (1 - x / band))
        draw.line([(x, 0), (x, h)], fill=a)
    return Image.composite(overlay, im, mask)


def shadow_text(draw, xy, text, font, fill, shadow=(0, 0, 0, 180), offset=3):
    x, y = xy
    draw.text((x + offset, y + offset), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=fill)


def compose_banner():
    """X header. Type sits high so the round avatar does not cover it."""
    src = Image.open(ASSETS / "jungle.jpg")
    im = fit_cover(src, 1500, 500, focus_y=0.08)
    im = darken_left(im, 0.62, 0.5)
    draw = ImageDraw.Draw(im)
    shadow_text(draw, (72, 108), "MEW", font(BLACK, 92), CREAM, offset=4)
    draw.text((76, 220), "NO. 151  ·  NEW SPECIES", font=font(MONO, 22), fill=PETAL)
    draw.text((76, 254), "PSYCHIC  ·  MYTHICAL  ·  THE ANCESTOR", font=font(MONO_REG, 16), fill=(214, 190, 198, 255))
    xdir = PROMOS / "x"
    xdir.mkdir(parents=True, exist_ok=True)
    im.save(ASSETS / "banner-x.jpg", quality=92)
    im.save(PROMOS / "banner-x-1500x500.jpg", quality=92)
    im.save(xdir / "header-1500x500.jpg", quality=92)


def knock_white(im):
    """Turn the paper-white field transparent. Pale pink on Mew stays."""
    import numpy as np

    arr = np.array(im.convert("RGBA")).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn
    # 0 on clean white, 1 once the pixel is pink or lined.
    t = np.clip((mn - 232) / 16.0, 0, 1) * np.clip((14 - sat) / 8.0, 0, 1)
    alpha = (1.0 - t) * 255.0
    arr[:, :, 3] = np.minimum(arr[:, :, 3], alpha)
    # Pull the fringe off the white page so the edge is not a gray halo.
    a = np.clip(arr[:, :, 3] / 255.0, 1e-3, 1)
    for c in range(3):
        arr[:, :, c] = np.clip((arr[:, :, c] - 255.0 * (1.0 - a)) / a, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def fit_in_circle(im, size, margin=0.08, background=None):
    """Scale the opaque pixels so a circular crop keeps the whole figure."""
    im = im.convert("RGBA")
    bbox = im.getchannel("A").point(lambda p: 255 if p > 16 else 0).getbbox()
    if not bbox:
        bbox = (0, 0, im.width, im.height)
    cropped = im.crop(bbox)
    radius = (size / 2) * (1 - margin)
    need = (cropped.width ** 2 + cropped.height ** 2) ** 0.5 / 2
    scale = radius / need
    nw = max(1, int(cropped.width * scale))
    nh = max(1, int(cropped.height * scale))
    cropped = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    if background is None:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    else:
        canvas = Image.new("RGBA", (size, size), background)
    canvas.alpha_composite(cropped, ((size - nw) // 2, (size - nh) // 2))
    return canvas


def compose_marks():
    """Circle-safe logo for X (white) and Dexscreener (transparent PNG)."""
    src = knock_white(Image.open(ASSETS / "mascot.jpg"))
    xdir = PROMOS / "x"
    ddir = PROMOS / "dexscreener"
    xdir.mkdir(parents=True, exist_ok=True)
    ddir.mkdir(parents=True, exist_ok=True)

    x_master = fit_in_circle(src, 1024, margin=0.06, background=(255, 255, 255, 255))
    x_master.convert("RGB").save(xdir / "profile-1024.jpg", quality=94)
    x_master.resize((400, 400), Image.Resampling.LANCZOS).convert("RGB").save(
        xdir / "profile-400.jpg", quality=92
    )
    x_master.convert("RGB").save(PROMOS / "x-pfp.jpg", quality=94)

    dex = fit_in_circle(src, 1024, margin=0.04, background=None)
    dex.save(ddir / "icon-1024.png")
    dex.resize((500, 500), Image.Resampling.LANCZOS).save(ddir / "icon-500.png")
    dex.resize((256, 256), Image.Resampling.LANCZOS).save(ddir / "icon-256.png")


def compose_dex_header():
    """Dexscreener header. Type sits on a bottom bar, clear of a left-side icon."""
    src = Image.open(ASSETS / "jungle.jpg")
    im = fit_cover(src, 1500, 500, focus_y=0.08).convert("RGBA")
    bar = Image.new("RGBA", im.size, (0, 0, 0, 0))
    b = ImageDraw.Draw(bar)
    for y in range(360, 500):
        a = int(210 * (y - 360) / 140)
        b.line([(0, y), (1500, y)], fill=(16, 10, 18, a))
    im = Image.alpha_composite(im, bar)
    draw = ImageDraw.Draw(im)
    title = "MEW"
    sub = "NO. 151   ·   PSYCHIC   ·   MYTHICAL"
    ft = font(BLACK, 64)
    fs = font(MONO, 20)
    tw = draw.textlength(title, font=ft)
    sw = draw.textlength(sub, font=fs)
    shadow_text(draw, ((1500 - tw) / 2, 372), title, ft, CREAM, offset=3)
    draw.text(((1500 - sw) / 2, 448), sub, font=fs, fill=PETAL)
    out = im.convert("RGB")
    ddir = PROMOS / "dexscreener"
    ddir.mkdir(parents=True, exist_ok=True)
    out.save(ddir / "header-1500x500.jpg", quality=92)
    out.save(PROMOS / "banner-dexscreener.jpg", quality=92)


def compose_dex_ad():
    """Square ad creative. Dexscreener ads take 500×500."""
    src = knock_white(Image.open(ASSETS / "mascot.jpg"))
    mark = fit_in_circle(src, 500, margin=0.16, background=None)
    canvas = Image.new("RGBA", (500, 500), (22, 14, 20, 255))
    canvas.alpha_composite(mark, (0, -18))
    draw = ImageDraw.Draw(canvas)
    label = "MEW"
    fl = font(BLACK, 42)
    tw = draw.textlength(label, font=fl)
    draw.text(((500 - tw) / 2, 430), label, font=fl, fill=CREAM)
    ddir = PROMOS / "dexscreener"
    ddir.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(ddir / "ad-500.jpg", quality=92)


def compose_x_post():
    """16:9 still for an X post. The header crop is too short for the feed."""
    src = Image.open(ASSETS / "jungle.jpg")
    im = fit_cover(src, 1600, 900, focus_y=0.12)
    im = darken_left(im, 0.55, 0.46)
    draw = ImageDraw.Draw(im)
    shadow_text(draw, (72, 620), "MEW", font(BLACK, 96), CREAM, offset=4)
    draw.text((76, 740), "NO. 151  ·  NEW SPECIES", font=font(MONO, 26), fill=PETAL)
    draw.text((76, 784), "PSYCHIC  ·  MYTHICAL  ·  THE ANCESTOR", font=font(MONO_REG, 18), fill=(214, 190, 198, 255))
    xdir = PROMOS / "x"
    xdir.mkdir(parents=True, exist_ok=True)
    im.save(xdir / "post-1600x900.jpg", quality=92)


def compose_og():
    src = Image.open(ASSETS / "jungle.jpg")
    im = fit_cover(src, 1200, 630)
    im = darken_left(im, 0.58, 0.52)
    draw = ImageDraw.Draw(im)
    shadow_text(draw, (56, 210), "MEW", font(BLACK, 108), CREAM, offset=4)
    draw.text((60, 340), "NO. 151", font=font(MONO, 24), fill=PETAL)
    draw.text((60, 380), "Said to hold the genes of every Pokémon.", font=font(MONO_REG, 18), fill=CREAM)
    im.save(ASSETS / "og.jpg", quality=92)
    im.save(PROMOS / "og-1200x630.jpg", quality=92)


def compose_truck_promo():
    src = Image.open(ASSETS / "truck.jpg")
    im = fit_cover(src, 1600, 900)
    # top bar
    bar = Image.new("RGBA", im.size, (0, 0, 0, 0))
    b = ImageDraw.Draw(bar)
    b.rectangle([0, 0, 1600, 150], fill=(16, 10, 18, 170))
    b.rectangle([0, 760, 1600, 900], fill=(16, 10, 18, 180))
    im = Image.alpha_composite(im.convert("RGBA"), bar)
    draw = ImageDraw.Draw(im)
    shadow_text(draw, (70, 38), "NEVER UNDER THE TRUCK", font(BLACK, 58), CREAM, offset=3)
    draw.text((70, 800), "MEW  ·  THE DOCK RUMOR  ·  AN EMPTY TRUCK", font=font(MONO, 26), fill=PETAL)
    out = im.convert("RGB")
    out.save(PROMOS / "promo-never-in-the-truck.jpg", quality=92)


def compose_cat_szn():
    src = Image.open(ASSETS / "cat-season.jpg")
    im = fit_cover(src, 1080, 1080)
    bar = Image.new("RGBA", im.size, (0, 0, 0, 0))
    b = ImageDraw.Draw(bar)
    b.rectangle([0, 860, 1080, 1080], fill=(16, 10, 18, 200))
    im = Image.alpha_composite(im.convert("RGBA"), bar)
    draw = ImageDraw.Draw(im)
    draw.text((48, 890), "THE ANCESTOR.", font=font(BLACK, 58), fill=CREAM)
    draw.text((52, 970), "ONE BODY. EVERY GENE.", font=font(MONO, 28), fill=PETAL)
    im.convert("RGB").save(PROMOS / "promo-cat-szn.jpg", quality=92)


def compose_story():
    src = Image.open(ASSETS / "story.jpg")
    im = fit_cover(src, 1080, 1920)
    bar = Image.new("RGBA", im.size, (0, 0, 0, 0))
    b = ImageDraw.Draw(bar)
    b.rectangle([0, 1640, 1080, 1920], fill=(16, 10, 18, 150))
    im = Image.alpha_composite(im.convert("RGBA"), bar)
    draw = ImageDraw.Draw(im)
    shadow_text(draw, (70, 1680), "MEW", font(BLACK, 120), CREAM, offset=4)
    draw.text((76, 1810), "A JUNGLE SIGHTING", font=font(MONO, 32), fill=PETAL)
    im.convert("RGB").save(PROMOS / "promo-story-9x16.jpg", quality=92)


def compose_degen():
    src = Image.open(ASSETS / "degen.jpg")
    im = fit_cover(src, 1600, 1200)
    bar = Image.new("RGBA", im.size, (0, 0, 0, 0))
    b = ImageDraw.Draw(bar)
    b.rectangle([0, 0, 1600, 130], fill=(16, 10, 18, 175))
    im = Image.alpha_composite(im.convert("RGBA"), bar)
    draw = ImageDraw.Draw(im)
    draw.text((48, 36), "A CELL FROM MEW. A CLONE NAMED MEWTWO.", font=font(MONO, 28), fill=PETAL)
    im.convert("RGB").save(PROMOS / "promo-psychic-entry.jpg", quality=92)


def compose_token_square():
    src = Image.open(ASSETS / "token-logo.jpg").convert("RGB")
    # crop to the circular mark, leave a little white
    w, h = src.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    crop = src.crop((left, top, left + side, top + side))
    crop = crop.resize((1024, 1024), Image.Resampling.LANCZOS)
    crop.save(ASSETS / "logo-1024.jpg", quality=94)
    crop.save(PROMOS / "token-logo-1024.jpg", quality=94)
    crop.resize((512, 512), Image.Resampling.LANCZOS).save(ASSETS / "icon-512.jpg", quality=92)
    crop.resize((192, 192), Image.Resampling.LANCZOS).save(ASSETS / "icon-192.jpg", quality=92)
    crop.resize((180, 180), Image.Resampling.LANCZOS).save(ASSETS / "apple-touch-icon.jpg", quality=92)
    crop.resize((32, 32), Image.Resampling.LANCZOS).save(ASSETS / "favicon-32.jpg", quality=90)


def compose_pokedex_promo():
    src = Image.open(ASSETS / "pokedex.jpg")
    im = fit_cover(src, 1600, 1200)
    bar = Image.new("RGBA", im.size, (0, 0, 0, 0))
    b = ImageDraw.Draw(bar)
    b.rectangle([0, 1040, 1600, 1200], fill=(16, 10, 18, 190))
    im = Image.alpha_composite(im.convert("RGBA"), bar)
    draw = ImageDraw.Draw(im)
    draw.text((48, 1078), "STILL CALLED A MIRAGE.", font=font(BLACK, 48), fill=CREAM)
    im.convert("RGB").save(PROMOS / "promo-wild-appeared.jpg", quality=92)


if __name__ == "__main__":
    compose_banner()
    compose_og()
    compose_truck_promo()
    compose_cat_szn()
    compose_story()
    compose_degen()
    compose_token_square()
    compose_pokedex_promo()
    compose_marks()
    compose_dex_header()
    compose_dex_ad()
    compose_x_post()
    print("composed")
