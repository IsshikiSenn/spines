"""Crop, rotate, and assemble a collection of CD case spines."""
import argparse
import json
import re
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image


def assemble(manifest, output, height):
    specs = json.loads(manifest.read_text(encoding="utf-8"))
    if not isinstance(specs, list) or not specs or height < 1:
        raise ValueError("Provide a nonempty manifest array and positive height")

    parts = {}
    used_names = set()
    for spec in specs:
        name = spec["name"]
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", name) or name.lower() in used_names:
            raise ValueError(f"Invalid or duplicate spine name: {name}")
        used_names.add(name.lower())
        with Image.open(manifest.parent / spec["image"]) as source:
            spine = source.convert("RGB")
        left, top, right, bottom = spec.get("crop", (0, 0, spine.width, spine.height))
        if not (0 <= left < right <= spine.width and 0 <= top < bottom <= spine.height):
            raise ValueError(f"Crop outside source bounds: {name}")
        spine = spine.crop((left, top, right, bottom))
        rotation = spec.get("rotate", 0)
        if rotation == 90:
            spine = spine.transpose(Image.Transpose.ROTATE_270)
        elif rotation != 0:
            raise ValueError(f"Rotation must be 0 or 90: {name}")
        if spine.width >= spine.height:
            raise ValueError(f"Spine must be vertical after rotation: {name}")
        width = spec.get("width", max(1, round(spine.width * height / spine.height)))
        if not isinstance(width, int) or not 0 < width < height:
            raise ValueError(f"Invalid output width: {name}")
        parts[name] = spine.resize((width, height), Image.Resampling.LANCZOS)

    output.mkdir(parents=True, exist_ok=True)
    individual = output / "spines"
    individual.mkdir(exist_ok=True)
    collection = Image.new("RGB", (sum(spine.width for spine in parts.values()), height))
    offset = 0
    with ZipFile(output / "spines.zip", "w", ZIP_DEFLATED) as archive:
        for name, spine in parts.items():
            filename = individual / f"{name}.png"
            spine.save(filename)
            archive.write(filename, filename.name)
            collection.paste(spine, (offset, 0))
            offset += spine.width
    collection.save(output / "collection.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--height", type=int, default=3600)
    args = parser.parse_args()
    assemble(args.manifest, args.output, args.height)
