"""Gera ícones PNG para PWA a partir do gradiente Someli."""
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    import subprocess
    import sys

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image, ImageDraw, ImageFont


def make_icon(size: int, path: Path) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            r = int(234 * (1 - t) + 78 * t)
            g = int(93 * (1 - t) + 47 * t)
            b = int(185 * (1 - t) + 143 * t)
            margin = size * 0.12
            if margin <= x <= size - margin - 1 and margin <= y <= size - margin - 1:
                img.putpixel((x, y), (r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    radius = int(size * 0.22)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.putalpha(mask)

    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", int(size * 0.48))
    except OSError:
        font = ImageFont.load_default()
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - size * 0.06), text, fill="white", font=font)
    img.save(path, "PNG")
    print(f"saved {path}")


if __name__ == "__main__":
    public = Path(__file__).resolve().parent.parent / "public"
    for s, name in [
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
        (32, "favicon-32.png"),
    ]:
        make_icon(s, public / name)
