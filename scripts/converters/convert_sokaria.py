#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""تحويل ملف السكرية (KFX) إلى نص منظم داخل هيكل البيانات الجديد."""

from __future__ import annotations

import sys
from pathlib import Path
import re

from scripts.common.paths import ensure_dirs, get_novels_dir, get_outputs_dir

ARABIC_PATTERN = r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\.\،\؛\:\-\!\؟]+[\.،؛\:\-\!\؟\n]"


def convert_kfx_to_text(kfx_path: Path) -> str | None:
    """تحويل محتوى KFX إلى نص عربي قابل للمعالجة."""
    try:
        print("  📚 جاري قراءة KFX...")
        content = kfx_path.read_bytes()

        decoded = content.decode("utf-8", errors="ignore")
        printable = "".join(c for c in decoded if c.isprintable() or c in "\n\r\t")

        matches = re.findall(ARABIC_PATTERN, printable)
        if matches:
            text_parts = [m.strip() for m in matches if len(m.strip()) > 20]
            full_text = "\n".join(text_parts)
            print(f"  ✅ تم استخراج {len(full_text)} حرف")
            return full_text

        print("  ⚠️ لم يتم العثور على نصوص عربية واضحة")
        return None
    except Exception as exc:  # pragma: no cover - حماية تفاعلية
        print(f"  ❌ خطأ في KFX: {exc}")
        return None


def save_text_file(text: str, output_path: Path) -> bool:
    """حفظ النص في ملف TXT ضمن مجلد الإخراج المنظم."""
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(text, encoding="utf-8", errors="ignore")
        return True
    except Exception as exc:  # pragma: no cover - حماية تفاعلية
        print(f"  ❌ خطأ في الحفظ: {exc}")
        return False


def main(input_file: Path | None = None, output_file: Path | None = None) -> int:
    ensure_dirs()

    novels_dir = get_novels_dir()
    default_input = novels_dir / "السكرية.kfx"
    default_output = get_outputs_dir() / "ingestion" / "السكرية_fixed.txt"

    kfx_file = Path(input_file) if input_file else default_input
    out_file = Path(output_file) if output_file else default_output

    if not kfx_file.exists():
        print(f"❌ الملف غير موجود: {kfx_file}")
        print(f"ℹ ضع الملف داخل: {novels_dir}")
        return 1

    print("=" * 60)
    print("🚀 تحويل السكرية.kfx إلى TXT")
    print("=" * 60)

    text = convert_kfx_to_text(kfx_file)

    if text and len(text) > 100:
        if save_text_file(text, out_file):
            file_size = out_file.stat().st_size
            print("\n✅ نجح التحويل!")
            print(f"📁 الملف: {out_file.name}")
            print(f"📊 الحجم: {file_size:,} بايت")
            print(f"📝 الأحرف: {len(text):,}")
            print(f"📂 الموقع: {out_file}")
            return 0

    print("❌ فشل التحويل")
    return 1


if __name__ == "__main__":
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    sys.exit(main(in_path, out_path))
