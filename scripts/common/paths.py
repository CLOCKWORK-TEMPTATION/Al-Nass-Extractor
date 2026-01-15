from __future__ import annotations

from pathlib import Path


def get_repo_root() -> Path:
    """إرجاع جذر المستودع باعتماد موقع ملف السكربت الحالي."""
    return Path(__file__).resolve().parents[2]


def get_data_dir() -> Path:
    return get_repo_root() / "data"


def get_raw_dir() -> Path:
    return get_data_dir() / "raw"


def get_input_dir() -> Path:
    return get_raw_dir() / "input"


def get_novels_dir() -> Path:
    return get_raw_dir() / "novels"


def get_outputs_dir() -> Path:
    return get_data_dir() / "outputs"


def get_templates_dir() -> Path:
    return get_data_dir() / "templates"


def get_datasets_dir() -> Path:
    return get_data_dir() / "datasets"


def ensure_dirs() -> None:
    """إنشاء المسارات الأساسية إن لم تكن موجودة."""
    for path in [
        get_data_dir(),
        get_raw_dir(),
        get_input_dir(),
        get_novels_dir(),
        get_outputs_dir(),
        get_templates_dir(),
        get_datasets_dir(),
    ]:
        path.mkdir(parents=True, exist_ok=True)
