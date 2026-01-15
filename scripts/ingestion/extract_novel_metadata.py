from __future__ import annotations

import sys
from pathlib import Path

from scripts.common.paths import ensure_dirs, get_outputs_dir, get_templates_dir

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from extract_novel_metadata import NovelMetadataExtractor  # noqa: E402


def main() -> int:
    ensure_dirs()

    if len(sys.argv) < 2:
        print("Usage: python scripts/ingestion/extract_novel_metadata.py <novel_path> [schema_path]")
        return 1

    novel_path = Path(sys.argv[1])
    schema_path = Path(sys.argv[2]) if len(sys.argv) > 2 else (get_templates_dir() / "novel_metadata_template_arabic.json")

    if not novel_path.exists():
        print(f"❌ الملف غير موجود: {novel_path}")
        return 1

    extractor = NovelMetadataExtractor(str(novel_path), str(schema_path))
    text_sample, sample_meta = extractor._build_representative_sample()  # noqa: SLF001
    metadata = extractor.extract_metadata(text_sample, sample_meta)

    output_dir = get_outputs_dir() / "metadata"
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = novel_path.stem
    output_file = output_dir / f"{timestamp}_metadata.json"
    extractor.save_metadata(metadata, str(output_file))

    print(f"📂 تم حفظ الميتاداتا في: {output_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
