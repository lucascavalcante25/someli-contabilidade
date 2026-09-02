"""Redimensiona o símbolo oficial (public/logos) para os tamanhos do PWA."""
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    import subprocess
    import sys

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LOGOS = ROOT / "public" / "logos"
PUBLIC = ROOT / "public"

SOURCE = next(LOGOS.glob("s*mbolo-colorido-01.png"), None)
if SOURCE is None:
    raise FileNotFoundError("Símbolo colorido 01 não encontrado em public/logos")


def resize_icon(size: int, path: Path) -> None:
    img = Image.open(SOURCE).convert("RGBA")
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    img.save(path, "PNG")
    print(f"saved {path} (from {SOURCE.name})")


if __name__ == "__main__":
    for s, name in [
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
        (32, "favicon-32.png"),
    ]:
        resize_icon(s, PUBLIC / name)
