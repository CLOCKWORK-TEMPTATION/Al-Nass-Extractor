"""وصول منظم لمحلل الحوارات العربي."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dialogue_analyzer import ArabicDialogueAnalyzer  # noqa: E402,F401

__all__ = ["ArabicDialogueAnalyzer"]
