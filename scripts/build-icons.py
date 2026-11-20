import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "pulvis-source.webp"
PNG = ROOT / "assets" / "pulvis-icon.png"
ICO = ROOT / "installer" / "src-tauri" / "icons" / "icon.ico"
ICNS = ROOT / "installer" / "src-tauri" / "icons" / "icon.icns"
PNG_OUTPUTS = [
    ROOT / "installer" / "ui" / "pulvis-icon.png",
    ROOT / "installer" / "src-tauri" / "icons" / "icon.png",
]
WIZARD_IMAGE = ROOT / "installer" / "windows" / "wizard-image.png"
WIZARD_SMALL_IMAGE = ROOT / "installer" / "windows" / "wizard-small.png"

image = Image.open(SOURCE).convert("RGBA")
if image.width != image.height:
    raise SystemExit(f"Expected a square source icon, got {image.size}.")
icon = image.resize((512, 512), Image.Resampling.LANCZOS)
icon.save(PNG, format="PNG", optimize=True)

for output in PNG_OUTPUTS:
    output.parent.mkdir(parents=True, exist_ok=True)
    icon.save(output, format="PNG", optimize=True)

ICO.parent.mkdir(parents=True, exist_ok=True)
icon.save(ICO, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
icon.save(ICNS, format="ICNS")

version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
WIZARD_IMAGE.parent.mkdir(parents=True, exist_ok=True)
width, height = 492, 942  # Inno Setup's required 164:314 image ratio at 3x.
panel = Image.new("RGB", (width, height))
pixels = panel.load()
top = (12, 15, 30)
bottom = (26, 22, 50)
for y in range(height):
    amount = y / max(1, height - 1)
    color = tuple(round(top[channel] * (1 - amount) + bottom[channel] * amount) for channel in range(3))
    for x in range(width):
        pixels[x, y] = color

draw = ImageDraw.Draw(panel, "RGBA")
draw.rounded_rectangle((24, 24, width - 24, height - 24), radius=30, outline=(148, 155, 255, 34), width=2)
for ring in range(7):
    inset = 52 + ring * 18
    draw.ellipse((inset, 142 + ring * 12, width - inset, 142 + ring * 12 + 310),
                 outline=(120, 137, 255, max(9, 38 - ring * 4)), width=2)

source_icon = Image.open(PNG).convert("RGBA").resize((300, 300), Image.Resampling.LANCZOS)
panel_rgba = panel.convert("RGBA")
panel_rgba.alpha_composite(source_icon, ((width - source_icon.width) // 2, 152))
draw = ImageDraw.Draw(panel_rgba, "RGBA")

font_paths = [
    (Path("C:/Windows/Fonts/segoeui.ttf"), Path("C:/Windows/Fonts/seguisb.ttf")),
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
]
regular_path, bold_path = next(((regular, bold) for regular, bold in font_paths if regular.exists() and bold.exists()), (None, None))
font = lambda size, bold=False: ImageFont.truetype(str(bold_path if bold else regular_path), size) if regular_path else ImageFont.load_default()

for wave in range(9):
    points = []
    phase = wave * 0.33
    amplitude = 10 + (wave % 4) * 7
    baseline = 600 + wave * 8
    for x in range(26, width - 26, 3):
        envelope = 0.25 + 0.75 * abs(math.sin(math.pi * (x - 26) / (width - 52)))
        y = baseline + math.sin((x / 56) + phase) * amplitude * envelope
        points.append((x, y))
    draw.line(points, fill=(149, 160, 255, 24 + (wave % 3) * 8), width=2)

for row in range(5):
    for column in range(9):
        x = 55 + column * 48 + (row % 2) * 13
        y = 690 + row * 23
        radius = 2 + ((row + column) % 3)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius),
                     fill=(184, 194, 255, 32 + ((row * 3 + column) % 5) * 10))

brand_font = font(49, bold=True)
subtitle_font = font(19)
version_font = font(20, bold=True)
brand = "P U L V I S"
draw.text((52, 790), brand, font=brand_font, fill=(248, 249, 255, 255))
draw.text((55, 856), "CSMODULAR  /  PULVIS LIBRARY", font=subtitle_font, fill=(175, 184, 222, 255))
draw.text((55, 886), version, font=version_font, fill=(142, 157, 255, 255))
panel_rgba.convert("RGB").save(WIZARD_IMAGE, format="PNG", optimize=True)

small = icon.resize((256, 256), Image.Resampling.LANCZOS)
WIZARD_SMALL_IMAGE.parent.mkdir(parents=True, exist_ok=True)
small.save(WIZARD_SMALL_IMAGE, format="PNG", optimize=True)

print("Generated product icons and the custom Inno Setup wizard artwork from assets/pulvis-source.webp.")
