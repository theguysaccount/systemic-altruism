"""Build an intentional, distinct 1200×630 card for every public route."""
import json, textwrap, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
routes = json.loads((root / 'dist/routes.json').read_text())
out = root / 'public/share'
out.mkdir(exist_ok=True)
fonts = [Path('/System/Library/Fonts/Supplemental/Arial.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
font_path = next((p for p in fonts if p.exists()), None)
def font(size):
    return ImageFont.truetype(str(font_path), size) if font_path else ImageFont.load_default(size=size)
for route in routes:
    im = Image.new('RGB', (1200, 630), '#164b38')
    draw = ImageDraw.Draw(im)
    draw.text((58, 44), 'SYSTEMIC ALTRUISM', font=font(23), fill='#d5ed74')
    draw.line((58, 90, 1142, 90), fill='#54755d', width=1)
    title = route['title']
    lines = textwrap.wrap(title, width=29 if len(title) < 80 else 34)
    size = 59 if len(lines) <= 3 else 48
    y = 145
    for line in lines[:4]:
        draw.text((58, y), line, font=font(size), fill='#f5f5ed'); y += size + 14
    subtitle = 'OPEN CHARITY TRACKER  /  EVIDENCE · STRUCTURAL CHANGE · UNCERTAINTY'
    draw.text((58, 520), subtitle, font=font(17), fill='#c2d2b7')
    draw.text((58, 563), route['path'], font=font(16), fill='#d5ed74')
    # A route-specific network mark makes both the topic and visual identity unique.
    digest = hashlib.sha256(route['path'].encode()).digest()
    x, y = 1060, 405
    draw.ellipse((x-70,y-70,x+70,y+70), outline='#54755d', width=2)
    draw.ellipse((x-30,y-30,x+30,y+30), fill='#d5ed74')
    for i in range(5):
        px = 958 + digest[i] % 180; py = 205 + digest[i+5] % 210
        draw.line((x,y,px,py),fill='#87a379',width=2)
        draw.ellipse((px-7,py-7,px+7,py+7),fill='#c2d2b7')
    im.save(out / f"{route['card']}.png", optimize=True)
print(f'Built {len(routes)} unique share cards')
