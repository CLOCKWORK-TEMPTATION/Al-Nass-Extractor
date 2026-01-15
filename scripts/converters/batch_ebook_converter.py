#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch eBook Converter
تحويل مجموعة من الكتب الإلكترونية (EPUB, KFX) إلى نصوص
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any
import subprocess
import re

# Fix Unicode encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

class EbookConverter:
    """محول الكتب الإلكترونية إلى نصوص"""
    
    def __init__(self, input_dir: str, output_dir: str):
        """
        تهيئة المحول
        
        Args:
            input_dir: مجلد الكتب المدخلة
            output_dir: مجلد النصوص الناتجة
        """
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Check for calibre ebook-convert
        self.has_calibre = self._check_calibre()
    
    def _check_calibre(self) -> bool:
        """فحص توفر calibre"""
        try:
            result = subprocess.run(
                ['ebook-convert', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def _convert_epub_simple(self, epub_path: Path) -> str:
        """
        تحويل EPUB باستخدام مكتبة ebooklib البسيطة
        
        Args:
            epub_path: مسار ملف EPUB
            
        Returns:
            النص المستخرج
        """
        try:
            import ebooklib
            from ebooklib import epub
            from bs4 import BeautifulSoup
        except ImportError:
            print("⚠️ يرجى تثبيت المكتبات: pip install ebooklib beautifulsoup4 lxml")
            return ""
        
        try:
            book = epub.read_epub(str(epub_path))
            
            text_parts = []
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT:
                    content = item.get_content()
                    soup = BeautifulSoup(content, 'lxml')
                    
                    # استخراج النص
                    text = soup.get_text(separator='\n', strip=True)
                    if text:
                        text_parts.append(text)
            
            return '\n\n'.join(text_parts)
        
        except Exception as e:
            print(f"❌ خطأ في قراءة {epub_path.name}: {e}")
            return ""
    
    def _convert_with_calibre(self, input_path: Path, output_format: str = 'txt') -> str:
        """
        تحويل الكتاب باستخدام calibre
        
        Args:
            input_path: مسار الكتاب المدخل
            output_format: صيغة المخرج (txt أو html)
            
        Returns:
            النص المستخرج
        """
        if not self.has_calibre:
            print("⚠️ calibre غير مثبت. يرجى تثبيت calibre من: https://calibre-ebook.com/")
            return ""
        
        # إنشاء ملف مؤقت
        temp_output = self.output_dir / f"temp_{input_path.stem}.{output_format}"
        
        try:
            # تشغيل ebook-convert
            cmd = [
                'ebook-convert',
                str(input_path),
                str(temp_output),
                '--enable-heuristics'
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                print(f"❌ فشل تحويل {input_path.name}")
                print(f"الخطأ: {result.stderr}")
                return ""
            
            # قراءة النص
            if temp_output.exists():
                with open(temp_output, 'r', encoding='utf-8') as f:
                    text = f.read()
                
                # حذف الملف المؤقت
                temp_output.unlink()
                return text
            
            return ""
        
        except subprocess.TimeoutExpired:
            print(f"⏱️ انتهت مهلة تحويل {input_path.name}")
            return ""
        except Exception as e:
            print(f"❌ خطأ: {e}")
            return ""
    
    def _clean_text(self, text: str) -> str:
        """
        تنظيف النص
        
        Args:
            text: النص الخام
            
        Returns:
            النص المنظف
        """
        if not text:
            return ""
        
        # إزالة الأسطر الفارغة المتعددة
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # إزالة المسافات الزائدة
        text = re.sub(r' {2,}', ' ', text)
        
        # إزالة المسافات من بداية ونهاية كل سطر
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)
        
        return text.strip()
    
    def convert_file(self, file_path: Path) -> Dict[str, Any]:
        """
        تحويل ملف واحد
        
        Args:
            file_path: مسار الملف
            
        Returns:
            معلومات عن النتيجة
        """
        print(f"\n📖 جاري تحويل: {file_path.name}")
        
        file_ext = file_path.suffix.lower()
        base_name = file_path.stem
        
        # محاولة التحويل
        text = ""
        method = ""
        
        if file_ext == '.epub':
            # محاولة التحويل البسيط أولاً
            text = self._convert_epub_simple(file_path)
            method = "ebooklib"
            
            # إذا فشل، جرب calibre
            if not text and self.has_calibre:
                text = self._convert_with_calibre(file_path)
                method = "calibre"
        
        elif file_ext == '.kfx':
            # KFX يتطلب calibre + DeDRM plugin
            if self.has_calibre:
                text = self._convert_with_calibre(file_path)
                method = "calibre"
            else:
                print(f"⚠️ ملفات KFX تتطلب calibre مع DeDRM plugin")
                return {
                    'file': file_path.name,
                    'status': 'skipped',
                    'reason': 'KFX requires calibre with DeDRM plugin'
                }
        
        if not text:
            return {
                'file': file_path.name,
                'status': 'failed',
                'reason': 'Could not extract text'
            }
        
        # تنظيف النص
        text = self._clean_text(text)
        
        # حفظ النص
        output_txt = self.output_dir / f"{base_name}.txt"
        with open(output_txt, 'w', encoding='utf-8') as f:
            f.write(text)
        
        # حفظ JSON أيضاً (للتوافق مع البرنامج)
        output_json = self.output_dir / f"{base_name}.txt.json"
        json_data = {
            "pages": [
                {
                    "page": 1,
                    "text": text
                }
            ],
            "metadata": {
                "source_file": file_path.name,
                "conversion_method": method,
                "word_count": len(text.split()),
                "character_count": len(text)
            }
        }
        
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        
        word_count = len(text.split())
        
        print(f"✅ تم التحويل بنجاح")
        print(f"   الطريقة: {method}")
        print(f"   عدد الكلمات: {word_count:,}")
        print(f"   المخرجات:")
        print(f"   - {output_txt.name}")
        print(f"   - {output_json.name}")
        
        return {
            'file': file_path.name,
            'status': 'success',
            'method': method,
            'word_count': word_count,
            'output_txt': str(output_txt),
            'output_json': str(output_json)
        }
    
    def convert_all(self) -> List[Dict[str, Any]]:
        """
        تحويل جميع الملفات في المجلد
        
        Returns:
            قائمة بنتائج التحويل
        """
        if not self.input_dir.exists():
            print(f"❌ المجلد غير موجود: {self.input_dir}")
            return []
        
        # العثور على جميع الكتب
        books = list(self.input_dir.glob('*.epub')) + list(self.input_dir.glob('*.kfx'))
        
        if not books:
            print(f"⚠️ لا توجد كتب في: {self.input_dir}")
            return []
        
        print(f"\n📚 العثور على {len(books)} كتاب")
        print(f"📁 المدخلات: {self.input_dir}")
        print(f"📁 المخرجات: {self.output_dir}")
        
        results = []
        for book in books:
            result = self.convert_file(book)
            results.append(result)
        
        # ملخص
        print("\n" + "="*60)
        print("📊 ملخص التحويل")
        print("="*60)
        
        success = [r for r in results if r['status'] == 'success']
        failed = [r for r in results if r['status'] == 'failed']
        skipped = [r for r in results if r['status'] == 'skipped']
        
        print(f"✅ نجح: {len(success)}")
        print(f"❌ فشل: {len(failed)}")
        print(f"⏭️ تم تخطيه: {len(skipped)}")
        
        if success:
            total_words = sum(r['word_count'] for r in success)
            print(f"\n📝 إجمالي الكلمات المستخرجة: {total_words:,}")
        
        return results


def main():
    """الوظيفة الرئيسية"""
    
    # المجلدات
    input_dir = r"E:\arabic_novel_dataset\Al-Nass-Extractor\input for convert"
    output_dir = r"E:\arabic_novel_dataset\Al-Nass-Extractor\input"
    
    print("="*60)
    print("📚 محول الكتب الإلكترونية (EPUB/KFX → TXT)")
    print("="*60)
    
    # إنشاء المحول
    converter = EbookConverter(input_dir, output_dir)
    
    # تحويل جميع الملفات
    results = converter.convert_all()
    
    # حفظ التقرير
    if results:
        report_path = Path(output_dir) / "conversion_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 تم حفظ التقرير: {report_path}")
    
    print("\n✅ اكتمل التحويل!")


if __name__ == "__main__":
    main()
