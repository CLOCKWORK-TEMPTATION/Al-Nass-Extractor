# دليل إنشاء البيئة الافتراضية لـ Python

## 🐍 ما هي البيئة الافتراضية؟

البيئة الافتراضية (Virtual Environment) هي مساحة معزولة على جهازك تحتوي على:
- نسخة من Python
- مكتبات وأدوات مثبتة خصيصاً للمشروع
- لا تؤثر على Python الأساسي للنظام

---

## ⚡ الطريقة السريعة (Windows)

### **الخطوة 1: افتح PowerShell أو CMD**

اضغط على `Win + R` وكتب:
```
powershell
```

### **الخطوة 2: شغّل السكريبت**

```powershell
E:\arabic_novel_dataset\Al-Nass-Extractor\setup_venv.bat
```

**أو انسخ هذه الأوامر مباشرة:**

```powershell
# الانتقال إلى المشروع
cd E:\arabic_novel_dataset\Al-Nass-Extractor

# إنشاء البيئة الافتراضية
python -m venv venv

# تفعيل البيئة
venv\Scripts\activate.bat

# تثبيت المكتبات
pip install ebooklib beautifulsoup4 lxml google-genai
```

---

## 🐧 الطريقة السريعة (Linux/Mac)

### **الخطوة 1: افتح Terminal**

### **الخطوة 2: شغّل السكريبت**

```bash
bash ~/E:\arabic_novel_dataset\Al-Nass-Extractor\setup_venv.sh
```

**أو انسخ هذه الأوامر:**

```bash
# الانتقال إلى المشروع
cd ~/arabic_novel_dataset/Al-Nass-Extractor

# إنشاء البيئة الافتراضية
python3 -m venv venv

# تفعيل البيئة
source venv/bin/activate

# تثبيت المكتبات
pip install ebooklib beautifulsoup4 lxml google-genai
```

---

## 📝 الأوامر الأساسية

### تفعيل البيئة الافتراضية

**Windows:**
```powershell
venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### الخروج من البيئة الافتراضية

```bash
deactivate
```

### تثبيت مكتبة جديدة

```bash
pip install اسم-المكتبة
```

### عرض المكتبات المثبتة

```bash
pip list
```

### حفظ المكتبات المثبتة

```bash
pip freeze > requirements.txt
```

### تثبيت مكتبات من ملف

```bash
pip install -r requirements.txt
```

---

## ✅ التحقق من النجاح

بعد التفعيل، يجب أن تشوف شيء مثل:

```
(venv) E:\arabic_novel_dataset\Al-Nass-Extractor>
```

لاحظ `(venv)` في بداية السطر - هذا يعني أن البيئة مفعلة!

---

## 📦 المكتبات المثبتة

بعد الإعداد، ستحصل على:

```
ebooklib             - لقراءة ملفات EPUB
beautifulsoup4       - لمعالجة HTML و XML
lxml                 - لتحليل المستندات
google-genai         - لـ Gemini AI API
pip, setuptools      - أدوات الإدارة الأساسية
```

---

## 🚀 تشغيل السكريبتات

بعد التفعيل:

```bash
python scripts\converters\batch_ebook_converter.py
```

---

## 🔧 استكشاف الأخطاء

### المشكلة: "python: command not found"
**الحل:** Python غير مثبت أو لا يوجد في PATH
- ثبّت Python من: https://www.python.org/downloads/
- تأكد من تحديد "Add Python to PATH"

### المشكلة: "venv not found"
**الحل:** استخدم `python3` بدلاً من `python`:
```bash
python3 -m venv venv
```

### المشكلة: "pip: command not found"
**الحل:** استخدم:
```bash
python -m pip install ...
```

### المشكلة: البيئة لا تتفعل
**الحل:** جرب:
```bash
# Windows
.\venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate
```

---

## 📚 مراجع إضافية

- [وثائق venv الرسمية](https://docs.python.org/3/library/venv.html)
- [pip الرسمي](https://pip.pypa.io/)
- [PyPI - Python Package Index](https://pypi.org/)

---

## 💡 نصائح

1. **استخدم البيئة الافتراضية دائماً** لتجنب تضارب المكتبات
2. **احفظ requirements.txt** لتسهيل نقل المشروع
3. **حدّث pip بانتظام**: `pip install --upgrade pip`
4. **استخدم Python 3.8+** للحصول على أفضل أداء

---

**تم الإنشاء:** 15 يناير 2026
