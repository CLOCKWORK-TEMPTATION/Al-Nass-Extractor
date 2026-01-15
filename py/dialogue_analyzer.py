#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أدوات تحليل ومعالجة الحوارات في الرواية العربية
Dialogue Analysis Tools for Arabic Novels
"""

import json
import re
from typing import List, Dict, Any, Tuple
from collections import Counter, defaultdict

class ArabicDialogueAnalyzer:
    """فئة لتحليل الحوارات في الروايات العربية"""
    
    def __init__(self, dialogues_file: str = None):
        """
        تهيئة محلل الحوارات
        
        Args:
            dialogues_file: مسار ملف JSONL يحتوي على الحوارات
        """
        self.dialogues = []
        if dialogues_file:
            self.load_dialogues(dialogues_file)
    
    def load_dialogues(self, file_path: str):
        """تحميل الحوارات من ملف JSONL"""
        self.dialogues = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    self.dialogues.append(json.loads(line))
        print(f"✓ تم تحميل {len(self.dialogues)} حوار")
    
    def get_character_speech_stats(self, character_id: str) -> Dict[str, Any]:
        """
        احصائيات الكلام لشخصية معينة
        
        Args:
            character_id: معرف الشخصية
            
        Returns:
            قاموس بالإحصائيات
        """
        total_lines = 0
        total_words = 0
        emotions = []
        languages = []
        intensities = []
        
        for dialogue in self.dialogues:
            if character_id not in dialogue.get('participants', []):
                continue
            
            for exchange in dialogue.get('exchanges', []):
                if exchange.get('speaker') == character_id:
                    total_lines += 1
                    text = exchange.get('text', '')
                    total_words += len(text.split())
                    
                    if 'emotion' in exchange:
                        emotions.append(exchange['emotion'])
                    if 'lang' in exchange:
                        languages.append(exchange['lang'])
                    if 'intensity' in exchange:
                        intensities.append(exchange['intensity'])
        
        stats = {
            'total_dialogues_participated': len([d for d in self.dialogues 
                                                 if character_id in d.get('participants', [])]),
            'total_lines_spoken': total_lines,
            'total_words_spoken': total_words,
            'avg_words_per_line': total_words / total_lines if total_lines > 0 else 0,
            'emotion_distribution': Counter(emotions),
            'language_distribution': Counter(languages),
            'avg_emotional_intensity': sum(intensities) / len(intensities) if intensities else 0
        }
        
        return stats
    
    def analyze_relationship_from_dialogues(self, char1_id: str, char2_id: str) -> Dict[str, Any]:
        """
        تحليل العلاقة بين شخصيتين من خلال حواراتهما
        
        Args:
            char1_id: معرف الشخصية الأولى
            char2_id: معرف الشخصية الثانية
            
        Returns:
            تحليل العلاقة
        """
        shared_dialogues = [
            d for d in self.dialogues 
            if char1_id in d.get('participants', []) and char2_id in d.get('participants', [])
        ]
        
        if not shared_dialogues:
            return {"relationship": "لا توجد حوارات مشتركة"}
        
        total_exchanges = sum(len(d.get('exchanges', [])) for d in shared_dialogues)
        char1_lines = 0
        char2_lines = 0
        emotions_char1 = []
        emotions_char2 = []
        
        for dialogue in shared_dialogues:
            for exchange in dialogue.get('exchanges', []):
                speaker = exchange.get('speaker')
                if speaker == char1_id:
                    char1_lines += 1
                    if 'emotion' in exchange:
                        emotions_char1.append(exchange['emotion'])
                elif speaker == char2_id:
                    char2_lines += 1
                    if 'emotion' in exchange:
                        emotions_char2.append(exchange['emotion'])
        
        analysis = {
            'shared_dialogues_count': len(shared_dialogues),
            'total_exchanges': total_exchanges,
            'balance': {
                'char1_lines': char1_lines,
                'char2_lines': char2_lines,
                'balance_ratio': char1_lines / char2_lines if char2_lines > 0 else 0
            },
            'emotional_profile': {
                'char1_emotions': Counter(emotions_char1),
                'char2_emotions': Counter(emotions_char2)
            },
            'dialogue_types': Counter(d.get('type', 'unknown') for d in shared_dialogues),
            'intimacy_indicator': len(shared_dialogues) / len(self.dialogues) if self.dialogues else 0
        }
        
        return analysis
    
    def detect_language_patterns(self, character_id: str) -> Dict[str, Any]:
        """
        كشف أنماط اللغة لشخصية
        
        Args:
            character_id: معرف الشخصية
            
        Returns:
            أنماط اللغة
        """
        fsa_count = 0
        colloquial_count = 0
        mixed_count = 0
        
        code_switching_patterns = []
        
        for dialogue in self.dialogues:
            if character_id not in dialogue.get('participants', []):
                continue
            
            prev_lang = None
            for exchange in dialogue.get('exchanges', []):
                if exchange.get('speaker') == character_id:
                    lang = exchange.get('lang', 'unknown')
                    
                    if lang == 'fsa':
                        fsa_count += 1
                    elif lang == 'colloquial':
                        colloquial_count += 1
                    elif lang == 'mixed':
                        mixed_count += 1
                    
                    # كشف التبديل اللغوي
                    if prev_lang and prev_lang != lang:
                        code_switching_patterns.append({
                            'from': prev_lang,
                            'to': lang,
                            'context': exchange.get('emotion', 'unknown')
                        })
                    
                    prev_lang = lang
        
        total = fsa_count + colloquial_count + mixed_count
        
        patterns = {
            'language_distribution': {
                'fsa': fsa_count,
                'colloquial': colloquial_count,
                'mixed': mixed_count
            },
            'language_percentages': {
                'fsa': fsa_count / total if total > 0 else 0,
                'colloquial': colloquial_count / total if total > 0 else 0,
                'mixed': mixed_count / total if total > 0 else 0
            },
            'code_switching_frequency': len(code_switching_patterns),
            'code_switching_patterns': code_switching_patterns[:5]  # أول 5 أمثلة
        }
        
        return patterns
    
    def extract_memorable_quotes(self, min_intensity: float = 0.80) -> List[Dict[str, Any]]:
        """
        استخراج الاقتباسات المميزة
        
        Args:
            min_intensity: الحد الأدنى للشدة العاطفية
            
        Returns:
            قائمة بالاقتباسات
        """
        quotes = []
        
        for dialogue in self.dialogues:
            for exchange in dialogue.get('exchanges', []):
                intensity = exchange.get('intensity', 0)
                
                if intensity >= min_intensity:
                    quotes.append({
                        'text': exchange.get('text'),
                        'speaker': exchange.get('speaker'),
                        'emotion': exchange.get('emotion'),
                        'intensity': intensity,
                        'dialogue_id': dialogue.get('dialogue_id'),
                        'chapter': dialogue.get('chapter')
                    })
        
        # ترتيب حسب الشدة
        quotes.sort(key=lambda x: x['intensity'], reverse=True)
        
        return quotes
    
    def analyze_emotional_arc(self, dialogue_id: str) -> Dict[str, Any]:
        """
        تحليل المسار العاطفي للحوار
        
        Args:
            dialogue_id: معرف الحوار
            
        Returns:
            تحليل المسار العاطفي
        """
        dialogue = next((d for d in self.dialogues if d.get('dialogue_id') == dialogue_id), None)
        
        if not dialogue:
            return {"error": "الحوار غير موجود"}
        
        exchanges = dialogue.get('exchanges', [])
        
        emotional_trajectory = []
        for i, exchange in enumerate(exchanges):
            emotional_trajectory.append({
                'exchange_number': i + 1,
                'emotion': exchange.get('emotion'),
                'intensity': exchange.get('intensity', 0),
                'speaker': exchange.get('speaker')
            })
        
        # حساب التصاعد/التنازل العاطفي
        intensities = [e.get('intensity', 0) for e in exchanges]
        
        arc_analysis = {
            'emotional_trajectory': emotional_trajectory,
            'start_intensity': intensities[0] if intensities else 0,
            'peak_intensity': max(intensities) if intensities else 0,
            'end_intensity': intensities[-1] if intensities else 0,
            'peak_exchange_number': intensities.index(max(intensities)) + 1 if intensities else 0,
            'arc_type': self._determine_arc_type(intensities)
        }
        
        return arc_analysis
    
    def _determine_arc_type(self, intensities: List[float]) -> str:
        """تحديد نوع المسار العاطفي"""
        if not intensities or len(intensities) < 3:
            return "قصير جداً للتحليل"
        
        start = intensities[0]
        peak = max(intensities)
        end = intensities[-1]
        
        if peak == intensities[-1]:
            return "تصاعدي"
        elif peak == intensities[0]:
            return "تنازلي"
        elif start < peak > end:
            return "قوس (تصاعد ثم تنازل)"
        else:
            return "متقلب"
    
    def get_dialogue_statistics(self) -> Dict[str, Any]:
        """احصائيات عامة عن جميع الحوارات"""
        if not self.dialogues:
            return {}
        
        types = Counter(d.get('type', 'unknown') for d in self.dialogues)
        importance_levels = Counter(d.get('importance', 'unknown') for d in self.dialogues)
        
        all_emotions = []
        all_languages = []
        
        for dialogue in self.dialogues:
            for exchange in dialogue.get('exchanges', []):
                if 'emotion' in exchange:
                    all_emotions.append(exchange['emotion'])
                if 'lang' in exchange:
                    all_languages.append(exchange['lang'])
        
        stats = {
            'total_dialogues': len(self.dialogues),
            'dialogue_types': dict(types),
            'importance_levels': dict(importance_levels),
            'emotion_distribution': dict(Counter(all_emotions).most_common(10)),
            'language_distribution': dict(Counter(all_languages)),
            'avg_exchanges_per_dialogue': sum(len(d.get('exchanges', [])) 
                                             for d in self.dialogues) / len(self.dialogues)
        }
        
        return stats
    
    def find_dialogues_by_emotion(self, emotion: str) -> List[Dict[str, Any]]:
        """البحث عن حوارات تحتوي على عاطفة معينة"""
        matching_dialogues = []
        
        for dialogue in self.dialogues:
            for exchange in dialogue.get('exchanges', []):
                if exchange.get('emotion', '').lower() == emotion.lower():
                    matching_dialogues.append({
                        'dialogue_id': dialogue.get('dialogue_id'),
                        'chapter': dialogue.get('chapter'),
                        'text': exchange.get('text'),
                        'speaker': exchange.get('speaker')
                    })
                    break
        
        return matching_dialogues
    
    def export_for_training(self, output_file: str, task_type: str = 'generation'):
        """
        تصدير البيانات بصيغة جاهزة للتدريب
        
        Args:
            output_file: ملف الإخراج
            task_type: نوع المهمة (generation, emotion_recognition, etc.)
        """
        training_data = []
        
        for dialogue in self.dialogues:
            if task_type == 'generation':
                # تنسيق لتوليد الحوارات
                context = f"في {dialogue.get('chapter', 'فصل')}, نوع الحوار: {dialogue.get('type', 'عام')}"
                exchanges_text = "\n".join([
                    f"{ex.get('speaker', 'متحدث')}: {ex.get('text', '')}"
                    for ex in dialogue.get('exchanges', [])
                ])
                
                training_data.append({
                    "prompt": f"اكتب حواراً {dialogue.get('type', 'عاماً')} في السياق التالي: {context}",
                    "completion": exchanges_text
                })
            
            elif task_type == 'emotion_recognition':
                # تنسيق للتعرف على المشاعر
                for exchange in dialogue.get('exchanges', []):
                    training_data.append({
                        "text": exchange.get('text', ''),
                        "emotion": exchange.get('emotion', 'unknown'),
                        "intensity": exchange.get('intensity', 0)
                    })
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in training_data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        
        print(f"✓ تم تصدير {len(training_data)} عنصر تدريب إلى {output_file}")


def generate_dialogue_prompt(context: Dict[str, Any]) -> str:
    """
    توليد prompt لتوليد حوار
    
    Args:
        context: سياق الحوار
        
    Returns:
        prompt جاهز
    """
    participants = context.get('participants', [])
    setting = context.get('setting', 'مكان غير محدد')
    conflict = context.get('conflict', 'صراع غير محدد')
    
    prompt = f"""اكتب حواراً بين {' و '.join([p['name'] for p in participants])}.

السياق:
- المكان: {setting}
- الصراع: {conflict}

الشخصيات:
"""
    
    for p in participants:
        prompt += f"- {p['name']}: {p.get('description', 'شخصية')}, حالته العاطفية: {p.get('emotion', 'محايد')}\n"
    
    prompt += "\nاكتب الحوار:"
    
    return prompt


# مثال للاستخدام
if __name__ == "__main__":
    print("="*60)
    print("محلل الحوارات للرواية العربية")
    print("="*60)
    
    # تحميل الحوارات
    analyzer = ArabicDialogueAnalyzer('dialogues_dataset.jsonl')
    
    # احصائيات عامة
    print("\n📊 إحصائيات عامة:")
    stats = analyzer.get_dialogue_statistics()
    print(f"إجمالي الحوارات: {stats.get('total_dialogues', 0)}")
    print(f"متوسط التبادلات لكل حوار: {stats.get('avg_exchanges_per_dialogue', 0):.1f}")
    
    print("\n🎭 توزيع أنواع الحوارات:")
    for dtype, count in stats.get('dialogue_types', {}).items():
        print(f"  {dtype}: {count}")
    
    print("\n😊 أكثر المشاعر شيوعاً:")
    for emotion, count in list(stats.get('emotion_distribution', {}).items())[:5]:
        print(f"  {emotion}: {count}")
    
    # تحليل شخصية
    print("\n👤 تحليل الشخصية char_001:")
    char_stats = analyzer.get_character_speech_stats('char_001')
    print(f"عدد الحوارات المشاركة فيها: {char_stats['total_dialogues_participated']}")
    print(f"إجمالي الأسطر: {char_stats['total_lines_spoken']}")
    print(f"متوسط الكلمات لكل سطر: {char_stats['avg_words_per_line']:.1f}")
    
    # أنماط اللغة
    print("\n🗣️ أنماط اللغة للشخصية char_001:")
    lang_patterns = analyzer.detect_language_patterns('char_001')
    print(f"الفصحى: {lang_patterns['language_percentages']['fsa']*100:.1f}%")
    print(f"العامية: {lang_patterns['language_percentages']['colloquial']*100:.1f}%")
    print(f"مختلط: {lang_patterns['language_percentages']['mixed']*100:.1f}%")
    
    # اقتباسات مميزة
    print("\n💬 أقوى 3 اقتباسات عاطفياً:")
    quotes = analyzer.extract_memorable_quotes(min_intensity=0.80)
    for i, quote in enumerate(quotes[:3], 1):
        print(f"{i}. \"{quote['text']}\"")
        print(f"   (الشدة: {quote['intensity']}, المشاعر: {quote['emotion']})")
    
    # تحليل علاقة
    print("\n❤️ تحليل العلاقة بين char_001 و char_003:")
    relationship = analyzer.analyze_relationship_from_dialogues('char_001', 'char_003')
    print(f"عدد الحوارات المشتركة: {relationship.get('shared_dialogues_count', 0)}")
    print(f"نسبة التوازن: {relationship['balance']['balance_ratio']:.2f}")
    
    print("\n✅ انتهى التحليل!")
