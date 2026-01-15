from __future__ import annotations

import sys
from pathlib import Path

from scripts.common.paths import ensure_dirs, get_outputs_dir

# ضمان توفر المسار الجذري للاستيراد
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ingest_novel import NovelIngester  # noqa: E402


def main() -> int:
    ensure_dirs()

    if len(sys.argv) < 2:
        print("Usage: python scripts/ingestion/ingest_novel.py <novel_path> [novel_id]")
        return 1

    novel_path = Path(sys.argv[1])
    novel_id = sys.argv[2] if len(sys.argv) > 2 else None

    if not novel_path.exists():
        print(f"❌ الملف غير موجود: {novel_path}")
        return 1

    output_dir = get_outputs_dir() / "ingestion" / novel_path.stem

    ingester = NovelIngester(str(novel_path), novel_id)
    ingester.process_novel()
    ingester.save_results(str(output_dir))
    print(f"📂 تم الحفظ في: {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
