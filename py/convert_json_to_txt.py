"""نُقل السكربت إلى scripts/converters/convert_json_to_txt.py للحفاظ على التنظيم.
تشغيل مباشر:
    python scripts/converters/convert_json_to_txt.py <json_file>
"""

import sys

from scripts.converters.convert_json_to_txt import convert_json_to_txt


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/converters/convert_json_to_txt.py <json_file>")
        sys.exit(1)

    convert_json_to_txt(sys.argv[1])
