from __future__ import annotations

import json
import sys
from pathlib import Path

from scripts.common.paths import ensure_dirs, get_input_dir, get_outputs_dir


def convert_json_to_txt(json_path: str | Path, output_path: str | Path | None = None) -> Path:
    """تحويل ملف JSON (تنسيق صفحات) إلى ملف نصي منظم."""
    source_path = Path(json_path)
    with source_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # استخراج النص من جميع الصفحات
    pages = data.get("pages", [])
    full_text = "\n\n".join(page.get("text", "") for page in pages)

    # مسار الإخراج الافتراضي
    if output_path is None:
        default_dir = get_outputs_dir() / "ingestion"
        default_dir.mkdir(parents=True, exist_ok=True)
        output_path = default_dir / f"{source_path.stem}_converted.txt"

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as f:
        f.write(full_text)

    print(f"Converted {len(pages)} pages -> {output_path}")
    print(f"Total characters: {len(full_text):,}")
    return output_path


if __name__ == "__main__":
    ensure_dirs()

    if len(sys.argv) < 2:
        default_in = get_input_dir()
        print("Usage: python scripts/converters/convert_json_to_txt.py <json_file>")
        print(f"Hint: ضع ملفات الإدخال في {default_in}")
        sys.exit(1)

    convert_json_to_txt(sys.argv[1])
