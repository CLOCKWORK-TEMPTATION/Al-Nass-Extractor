#!/bin/bash
# إنشاء بيئة افتراضية لـ Python (للـ Linux/Mac)
# Virtual Environment Setup for Al-Nass-Extractor

echo "============================================================"
echo "🐍 إنشاء بيئة افتراضية Python"
echo "============================================================"
echo ""

# الانتقال إلى مجلد المشروع
cd "E:\arabic_novel_dataset\Al-Nass-Extractor" || cd "$HOME/arabic_novel_dataset/Al-Nass-Extractor"

# التحقق من وجود Python
if ! command -v python3 &> /dev/null; then
    echo "❌ خطأ: Python3 غير مثبت"
    echo ""
    echo "للـ Ubuntu/Debian:"
    echo "  sudo apt-get install python3-venv python3-pip"
    echo ""
    echo "للـ macOS:"
    echo "  brew install python3"
    exit 1
fi

echo "✅ تم اكتشاف Python"
python3 --version

echo ""
echo "📁 المجلد الحالي:"
pwd

echo ""
echo "🔧 جاري إنشاء البيئة الافتراضية..."
echo ""

# إنشاء البيئة الافتراضية
python3 -m venv venv

if [ $? -ne 0 ]; then
    echo "❌ فشل إنشاء البيئة الافتراضية"
    exit 1
fi

echo "✅ تم إنشاء البيئة الافتراضية بنجاح!"

echo ""
echo "🚀 تفعيل البيئة الافتراضية..."
echo ""

# تفعيل البيئة الافتراضية
source venv/bin/activate

echo "✅ تم تفعيل البيئة الافتراضية"

echo ""
echo "📦 تثبيت المكتبات المطلوبة..."
echo ""

# تحديث pip
python -m pip install --upgrade pip setuptools wheel

# تثبيت المكتبات الأساسية
python -m pip install ebooklib beautifulsoup4 lxml google-genai

echo ""
echo "============================================================"
echo "✅ اكتمل الإعداد!"
echo "============================================================"
echo ""
echo "📝 الخطوات التالية:"
echo ""
echo "1️⃣  لتفعيل البيئة الافتراضية في المستقبل:"
echo "    source venv/bin/activate"
echo ""
echo "2️⃣  للخروج من البيئة الافتراضية:"
echo "    deactivate"
echo ""
echo "3️⃣  تشغيل السكريبتات:"
echo "    python scripts/converters/batch_ebook_converter.py"
echo ""
echo "📦 المكتبات المثبتة:"
pip list
echo ""
