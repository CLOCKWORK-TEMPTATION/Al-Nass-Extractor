#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أدوات مساعدة لإدارة داتا سيت شخصيات الرواية العربية
Character Dataset Management Tools for Arabic Novels
"""

import json
import csv
from typing import List, Dict, Any
from collections import Counter
import os

class ArabicCharacterDataset:
    """فئة لإدارة داتا سيت الشخصيات العربية"""
    
    def __init__(self, file_path: str = None):
        """
        تهيئة الداتا سيت
        
        Args:
            file_path: مسار ملف JSONL
        """
        self.file_path = file_path
        self.characters = []
        if file_path and os.path.exists(file_path):
            self.load_from_jsonl(file_path)
    
    def load_from_jsonl(self, file_path: str):
        """تحميل الشخصيات من ملف JSONL"""
        self.characters = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    self.characters.append(json.loads(line))
        print(f"✓ تم تحميل {len(self.characters)} شخصية")
    
    def save_to_jsonl(self, file_path: str):
        """حفظ الشخصيات إلى ملف JSONL"""
        with open(file_path, 'w', encoding='utf-8') as f:
            for char in self.characters:
                f.write(json.dumps(char, ensure_ascii=False) + '\n')
        print(f"✓ تم حفظ {len(self.characters)} شخصية إلى {file_path}")
    
    def add_character(self, character: Dict[str, Any]):
        """إضافة شخصية جديدة"""
        # التحقق من الحقول الإلزامية
        required_fields = ['character_id', 'novel_id', 'name']
        missing = [f for f in required_fields if f not in character]
        
        if missing:
            raise ValueError(f"الحقول المطلوبة ناقصة: {', '.join(missing)}")
        
        self.characters.append(character)
        print(f"✓ تمت إضافة الشخصية: {character['name']}")
    
    def get_character_by_id(self, char_id: str) -> Dict[str, Any]:
        """الحصول على شخصية بواسطة معرفها"""
        for char in self.characters:
            if char.get('character_id') == char_id:
                return char
        return None
    
    def get_characters_by_novel(self, novel_id: str) -> List[Dict[str, Any]]:
        """الحصول على جميع شخصيات رواية معينة"""
        return [c for c in self.characters if c.get('novel_id') == novel_id]
    
    def validate(self) -> List[str]:
        """
        التحقق من صحة البيانات
        
        Returns:
            قائمة بالأخطاء (فارغة إذا كانت البيانات صحيحة)
        """
        errors = []
        required_fields = ['character_id', 'novel_id', 'name']
        
        for i, char in enumerate(self.characters, 1):
            # التحقق من الحقول الإلزامية
            missing = [f for f in required_fields if f not in char]
            if missing:
                errors.append(f"الشخصية {i}: حقول ناقصة - {', '.join(missing)}")
            
            # التحقق من أن character_id فريد
            char_id = char.get('character_id')
            if char_id:
                duplicates = [c for c in self.characters 
                            if c.get('character_id') == char_id]
                if len(duplicates) > 1:
                    errors.append(f"character_id مكرر: {char_id}")
        
        if not errors:
            print("✓ جميع البيانات صحيحة")
        else:
            print(f"⚠ وُجدت {len(errors)} مشكلة")
        
        return errors
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على إحصائيات الداتا سيت"""
        if not self.characters:
            return {}
        
        stats = {
            'total_characters': len(self.characters),
            'gender_distribution': Counter(c.get('gender', 'غير محدد') 
                                          for c in self.characters),
            'role_distribution': Counter(c.get('role', 'غير محدد') 
                                        for c in self.characters),
            'novels_count': len(set(c.get('novel_id') for c in self.characters)),
        }
        
        # إحصائيات العمر
        ages = [c.get('age') for c in self.characters if 'age' in c]
        if ages:
            stats['age_stats'] = {
                'min': min(ages),
                'max': max(ages),
                'average': sum(ages) / len(ages)
            }
        
        # إحصائيات اللغة
        fsa_usages = [c.get('fsa_usage') for c in self.characters 
                     if 'fsa_usage' in c]
        if fsa_usages:
            stats['avg_fsa_usage'] = sum(fsa_usages) / len(fsa_usages)
        
        return stats
    
    def print_statistics(self):
        """طباعة الإحصائيات بشكل منسق"""
        stats = self.get_statistics()
        
        print("\n" + "="*50)
        print("📊 إحصائيات داتا سيت الشخصيات")
        print("="*50)
        
        print(f"\n📚 إجمالي الشخصيات: {stats.get('total_characters', 0)}")
        print(f"📖 عدد الروايات: {stats.get('novels_count', 0)}")
        
        print("\n👥 توزيع الجنس:")
        for gender, count in stats.get('gender_distribution', {}).items():
            percentage = (count / stats['total_characters']) * 100
            print(f"   {gender}: {count} ({percentage:.1f}%)")
        
        print("\n🎭 توزيع الأدوار:")
        for role, count in stats.get('role_distribution', {}).items():
            percentage = (count / stats['total_characters']) * 100
            print(f"   {role}: {count} ({percentage:.1f}%)")
        
        if 'age_stats' in stats:
            age_stats = stats['age_stats']
            print("\n🎂 إحصائيات العمر:")
            print(f"   الحد الأدنى: {age_stats['min']}")
            print(f"   الحد الأقصى: {age_stats['max']}")
            print(f"   المتوسط: {age_stats['average']:.1f}")
        
        if 'avg_fsa_usage' in stats:
            fsa_pct = stats['avg_fsa_usage'] * 100
            print(f"\n📝 متوسط استخدام الفصحى: {fsa_pct:.1f}%")
        
        print("\n" + "="*50 + "\n")
    
    def export_to_csv(self, file_path: str, fields: List[str] = None):
        """
        تصدير إلى CSV
        
        Args:
            file_path: مسار ملف CSV الناتج
            fields: قائمة بالحقول المطلوبة (أو None لجميع الحقول)
        """
        if not self.characters:
            print("⚠ لا توجد شخصيات للتصدير")
            return
        
        # تحديد الحقول
        if fields is None:
            # جمع جميع الحقول الموجودة
            fields = set()
            for char in self.characters:
                fields.update(char.keys())
            fields = sorted(list(fields))
        
        # كتابة CSV
        with open(file_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            
            for char in self.characters:
                # تحويل القوائم إلى نصوص
                row = {}
                for field in fields:
                    value = char.get(field, '')
                    if isinstance(value, list):
                        value = '|'.join(str(v) for v in value)
                    elif isinstance(value, dict):
                        value = json.dumps(value, ensure_ascii=False)
                    row[field] = value
                writer.writerow(row)
        
        print(f"✓ تم التصدير إلى {file_path}")
    
    def filter_characters(self, **criteria) -> List[Dict[str, Any]]:
        """
        تصفية الشخصيات حسب معايير معينة
        
        Args:
            **criteria: معايير التصفية (مثل gender='ذكر', role='بطل')
        
        Returns:
            قائمة بالشخصيات المطابقة
        """
        filtered = self.characters
        
        for key, value in criteria.items():
            filtered = [c for c in filtered if c.get(key) == value]
        
        return filtered
    
    def search_by_name(self, name: str) -> List[Dict[str, Any]]:
        """البحث عن شخصية بالاسم (بحث جزئي)"""
        name_lower = name.lower()
        return [c for c in self.characters 
                if name_lower in c.get('name', '').lower()]


def create_character_template() -> Dict[str, Any]:
    """إنشاء قالب فارغ لشخصية جديدة"""
    return {
        "character_id": "",
        "novel_id": "",
        "name": "",
        "age": None,
        "gender": "",
        "nationality": "",
        "occupation": "",
        "role": "",
        "traits": [],
        "core_values": [],
        "arc": "",
        "quote": "",
        "fsa_usage": 0.0,
        "colloquial_usage": 0.0
    }


def merge_datasets(file_paths: List[str], output_path: str):
    """
    دمج عدة ملفات JSONL في ملف واحد
    
    Args:
        file_paths: قائمة بمسارات الملفات المراد دمجها
        output_path: مسار الملف الناتج
    """
    all_characters = []
    
    for file_path in file_paths:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    all_characters.append(json.loads(line))
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for char in all_characters:
            f.write(json.dumps(char, ensure_ascii=False) + '\n')
    
    print(f"✓ تم دمج {len(all_characters)} شخصية في {output_path}")


# مثال للاستخدام
if __name__ == "__main__":
    print("="*60)
    print("أدوات إدارة داتا سيت الشخصيات العربية")
    print("="*60)
    
    # إنشاء داتا سيت جديد
    dataset = ArabicCharacterDataset()
    
    # إضافة شخصيات مثال
    characters_examples = [
        {
            "character_id": "char_001",
            "novel_id": "novel_001",
            "name": "أحمد الخطيب",
            "age": 32,
            "gender": "ذكر",
            "role": "بطل",
            "traits": ["شجاع", "متردد", "عاطفي"],
            "occupation": "مدرس",
            "fsa_usage": 0.65,
            "colloquial_usage": 0.30
        },
        {
            "character_id": "char_002",
            "novel_id": "novel_001",
            "name": "ليلى المنصوري",
            "age": 28,
            "gender": "أنثى",
            "role": "حبيبة",
            "traits": ["ذكية", "مستقلة", "شجاعة"],
            "occupation": "صحفية",
            "fsa_usage": 0.70,
            "colloquial_usage": 0.25
        }
    ]
    
    for char in characters_examples:
        dataset.add_character(char)
    
    # طباعة الإحصائيات
    dataset.print_statistics()
    
    # التحقق من صحة البيانات
    errors = dataset.validate()
    
    # حفظ إلى ملف
    dataset.save_to_jsonl('output_characters.jsonl')
    
    # تصدير إلى CSV
    dataset.export_to_csv('output_characters.csv')
    
    print("\n✅ انتهت العملية بنجاح!")
