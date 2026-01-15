"""نُقل السكربت إلى scripts/converters/convert_sokaria.py مع مسارات إدخال/إخراج منظمة."""

import sys
from pathlib import Path

from scripts.converters.convert_sokaria import main


if __name__ == "__main__":
    input_arg = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    output_arg = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    sys.exit(main(input_arg, output_arg))
