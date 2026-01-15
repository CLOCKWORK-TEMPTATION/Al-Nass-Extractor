@echo off
REM إنشاء بيئة افتراضية لـ Python
REM Virtual Environment Setup for Al-Nass-Extractor

echo.
echo ============================================================
echo 🐍 إنشاء بيئة افتراضية Python
echo ============================================================
echo.

REM الانتقال إلى مجلد المشروع
cd /d E:\arabic_novel_dataset\Al-Nass-Extractor

REM التحقق من وجود Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ خطأ: Python غير مثبت أو لا يمكن العثور عليه
    echo.
    echo يرجى تثبيت Python من: https://www.python.org/downloads/
    echo تأكد من تحديد خيار "Add Python to PATH" أثناء التثبيت
    pause
    exit /b 1
)

echo ✅ تم اكتشاف Python
python --version

echo.
echo 📁 المجلد الحالي:
cd

echo.
echo 🔧 جاري إنشاء البيئة الافتراضية...
echo.

REM إنشاء البيئة الافتراضية
python -m venv venv

REM التحقق من النجاح
if errorlevel 1 (
    echo ❌ فشل إنشاء البيئة الافتراضية
    pause
    exit /b 1
)

echo ✅ تم إنشاء البيئة الافتراضية بنجاح!

echo.
echo 🚀 تفعيل البيئة الافتراضية...
echo.

REM تفعيل البيئة الافتراضية
call venv\Scripts\activate.bat

echo ✅ تم تفعيل البيئة الافتراضية

echo.
echo 📦 تثبيت المكتبات المطلوبة...
echo.

REM تحديث pip
python -m pip install --upgrade pip setuptools wheel

REM تثبيت المكتبات الأساسية
python -m pip install ebooklib beautifulsoup4 lxml

REM تثبيت مكتبات إضافية (اختيارية)
python -m pip install google-genai

echo.
echo ============================================================
echo ✅ اكتمل الإعداد!
echo ============================================================
echo.
echo 📝 الخطوات التالية:
echo.
echo 1️⃣  لتفعيل البيئة الافتراضية في المستقبل، شغّل:
echo    venv\Scripts\activate.bat
echo.
echo 2️⃣  للخروج من البيئة الافتراضية:
echo    deactivate
echo.
echo 3️⃣  تشغيل السكريبتات:
echo    python scripts\converters\batch_ebook_converter.py
echo.
echo 📦 المكتبات المثبتة:
pip list

echo.
pause
