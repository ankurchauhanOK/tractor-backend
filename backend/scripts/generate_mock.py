"""Generate 10 mock handwritten inspection sheet images for testing."""

import os
from PIL import Image, ImageDraw, ImageFont

FONTS = [
    "/System/Library/Fonts/Apple Chancery.ttf",
    "/System/Library/Fonts/MarkerFelt.ttc",
    "/System/Library/Fonts/STIXGeneral.otf",
    "/System/Library/Fonts/Noteworthy.ttc",
]

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SHEETS = [
    {
        "tractor": "TR1543",
        "defects": [
            "Isme piston ka size jyada hai",
            "Oil leakage from front seal",
        ],
    },
    {
        "tractor": "TR1544",
        "defects": [
            "LH wheel nut loose",
            "RH brake not working properly",
        ],
    },
    {
        "tractor": "TR1545",
        "defects": [
            "Hydraulic pipe leakage",
            "Gear shifting hard",
        ],
    },
    {
        "tractor": "TR1546",
        "defects": [
            "Bonnet dent - right side",
            "Horn not working",
        ],
    },
    {
        "tractor": "TR1547",
        "defects": [
            "Brake pedal alignment issue",
            "Clutch plate worn out",
        ],
    },
    {
        "tractor": "TR1548",
        "defects": [
            "Radiator fan belt loose hai",
            "Coolant leakage ho raha hai",
        ],
    },
    {
        "tractor": "TR1549",
        "defects": [
            "Rear axle oil seal damaged",
            "Tyre pressure low - both rear",
        ],
    },
    {
        "tractor": "TR1550",
        "defects": [
            "isteering wheel play bahut hai",
            "Headlight dim - left side",
        ],
    },
    {
        "tractor": "TR1551",
        "defects": [
            "Fuel filter change karna hai",
            "Battery terminal corrosion",
        ],
    },
    {
        "tractor": "TR1552",
        "defects": [
            "PTO shaft bent",
            "Hydraulic lift slow hai",
            "Dashboard warning light on",
        ],
    },
]

WIDTH, HEIGHT = 1400, 1000


def get_font(size: int, index: int = 0):
    try:
        return ImageFont.truetype(FONTS[index % len(FONTS)], size)
    except (IOError, OSError):
        return ImageFont.load_default()


def draw_text(draw, text, xy, font, fill="black", max_width=None):
    x, y = xy
    if max_width:
        words = text.split()
        lines = []
        current = ""
        for word in words:
            test = f"{current} {word}".strip()
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] > max_width:
                lines.append(current)
                current = word
            else:
                current = test
        lines.append(current)
        for line in lines:
            draw.text((x, y), line, fill=fill, font=font)
            bbox = draw.textbbox((0, 0), line, font=font)
            y += bbox[3] - bbox[1] + 8
    else:
        draw.text((x, y), text, fill=fill, font=font)
    return y


def generate_sheet(sheet: dict, index: int):
    img = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(img)

    title_font = get_font(42, 0)
    label_font = get_font(28, 1)
    value_font = get_font(32, 2)
    defect_font = get_font(30, 3)

    # Header lines
    draw.line([(60, 130), (WIDTH - 60, 130)], fill="#cccccc", width=2)
    draw.line([(60, HEIGHT - 80), (WIDTH - 60, HEIGHT - 80)], fill="#cccccc", width=2)

    # Title
    title = "TRACTOR INSPECTION SHEET"
    bbox = draw.textbbox((0, 0), title, font=title_font)
    tw = bbox[2] - bbox[0]
    draw.text(((WIDTH - tw) / 2, 40), title, fill="#1a1a1a", font=title_font)

    # Underline title
    draw.line(
        [((WIDTH - tw) / 2, 90), ((WIDTH + tw) / 2, 90)],
        fill="#d97706",
        width=3,
    )

    # Tractor number
    draw.text((80, 160), "Tractor No:", fill="#555555", font=label_font)
    draw.text((320, 158), sheet["tractor"], fill="#000000", font=get_font(36, 0))

    # Date
    from datetime import datetime

    draw.text((800, 160), "Date:", fill="#555555", font=label_font)
    draw.text((920, 158), datetime.now().strftime("%d/%m/%Y"), fill="#000000", font=value_font)

    # Separator
    draw.line([(80, 220), (WIDTH - 80, 220)], fill="#dddddd", width=1)

    # Defects header
    draw.text((80, 250), "Defects Found:", fill="#555555", font=label_font)
    draw.line([(80, 290), (WIDTH - 80, 290)], fill="#eeeeee", width=1)

    # Draw defects with numbers
    y = 320
    for i, defect in enumerate(sheet["defects"], 1):
        num_text = f"{i}."
        draw.text((100, y), num_text, fill="#d97706", font=defect_font)
        y = draw_text(
            draw,
            defect,
            (170, y),
            defect_font,
            fill="#000000",
            max_width=WIDTH - 250,
        )
        y += 16

    # Draw a box around defects area
    draw.rectangle([80, 230, WIDTH - 80, y + 20], outline="#dddddd", width=1)

    # Inspector signature
    sig_y = max(y + 60, HEIGHT - 160)
    draw.text((80, sig_y), "Inspector Signature:", fill="#555555", font=label_font)
    draw.line([(380, sig_y + 30), (700, sig_y + 30)], fill="#000000", width=1)

    # Remarks
    draw.text((80, sig_y + 60), "Remarks:", fill="#555555", font=label_font)
    draw.line([(240, sig_y + 90), (WIDTH - 80, sig_y + 90)], fill="#cccccc", width=1)
    draw.line([(240, sig_y + 120), (WIDTH - 80, sig_y + 120)], fill="#cccccc", width=1)

    # Border
    draw.rectangle([20, 20, WIDTH - 20, HEIGHT - 20], outline="#d97706", width=3)

    # Bottom text
    draw.text(
        (80, HEIGHT - 50),
        "Form No: TR-INS-001 | Rev: 1.0",
        fill="#999999",
        font=get_font(18, 1),
    )
    draw.text(
        (WIDTH - 350, HEIGHT - 50),
        "Page 1 of 1",
        fill="#999999",
        font=get_font(18, 1),
    )

    filename = f"mock_sheet_{sheet['tractor'].lower()}.jpg"
    filepath = os.path.join(OUTPUT_DIR, filename)
    img.save(filepath, "JPEG", quality=92)
    return filename, filepath


if __name__ == "__main__":
    print("Generating 10 mock inspection sheets...")
    for i, sheet in enumerate(SHEETS):
        filename, filepath = generate_sheet(sheet, i)
        print(f"  ✅ {filename}")
    print(f"\nAll mock sheets saved to: {OUTPUT_DIR}")
