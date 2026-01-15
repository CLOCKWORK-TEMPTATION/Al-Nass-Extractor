# To run this code you need to install the following dependencies:
# pip install google-genai python-dotenv tiktoken

import base64
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
import tiktoken

# Load environment variables from .env file
load_dotenv()


def estimate_tokens(text: str) -> int:
    """تقدير عدد التوكنز في النص باستخدام tiktoken"""
    try:
        # استخدام encoding الخاص بـ GPT-4 كتقدير قريب
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except:
        # في حالة عدم توفر tiktoken، استخدام تقدير تقريبي
        # كل 4 أحرف تقريباً = 1 توكن للنصوص العربية
        return len(text) // 3


def split_text_by_tokens(text: str, max_tokens: int = 30000) -> list[str]:
    """
    تقسيم النص إلى أجزاء بحد أقصى للتوكنز
    
    Args:
        text: النص المراد تقسيمه
        max_tokens: الحد الأقصى للتوكنز في كل جزء (افتراضي: 30000)
    
    Returns:
        قائمة من الأجزاء النصية
    """
    # تقدير عدد التوكنز الكلي
    total_tokens = estimate_tokens(text)
    
    # إذا كان النص أصغر من الحد الأقصى، إرجاعه كما هو
    if total_tokens <= max_tokens:
        return [text]
    
    chunks = []
    lines = text.split('\n')
    current_chunk = []
    current_tokens = 0
    
    for line in lines:
        line_tokens = estimate_tokens(line + '\n')
        
        # إذا كان السطر الواحد أكبر من الحد الأقصى، تقسيمه على مستوى الكلمات
        if line_tokens > max_tokens:
            words = line.split()
            word_chunk = []
            word_tokens = 0
            
            for word in words:
                word_token_count = estimate_tokens(word + ' ')
                if word_tokens + word_token_count > max_tokens and word_chunk:
                    chunks.append(' '.join(word_chunk))
                    word_chunk = [word]
                    word_tokens = word_token_count
                else:
                    word_chunk.append(word)
                    word_tokens += word_token_count
            
            if word_chunk:
                if current_chunk:
                    chunks.append('\n'.join(current_chunk))
                    current_chunk = []
                    current_tokens = 0
                chunks.append(' '.join(word_chunk))
            continue
        
        # إذا تجاوز الحد الأقصى، حفظ الجزء الحالي والبدء في جزء جديد
        if current_tokens + line_tokens > max_tokens and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = [line]
            current_tokens = line_tokens
        else:
            current_chunk.append(line)
            current_tokens += line_tokens
    
    # إضافة آخر جزء إذا كان موجوداً
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks


def read_and_split_file(file_path: str, max_tokens: int = 30000) -> list[str]:
    """
    قراءة ملف وتقسيمه إلى أجزاء بناءً على عدد التوكنز
    
    Args:
        file_path: مسار الملف
        max_tokens: الحد الأقصى للتوكنز في كل جزء (افتراضي: 30000)
    
    Returns:
        قائمة من الأجزاء النصية
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        return split_text_by_tokens(text, max_tokens)
    except Exception as e:
        print(f"خطأ في قراءة الملف {file_path}: {str(e)}")
        return []


def generate(text_chunk: str, chunk_number: int, total_chunks: int):
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-3-flash-preview"
    
    prompt = f"""قم بتحليل واستخراج البيانات من هذا الجزء من الرواية:

الجزء {chunk_number} من {total_chunks}

النص:
{text_chunk}

استخرج كل المعلومات المطلوبة حسب المخطط المحدد."""

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        ),
    ]
    generate_content_config = types.GenerateContentConfig(
        max_output_tokens=8000,
        response_mime_type="application/json",
        response_schema=genai.types.Schema(
            type = genai.types.Type.OBJECT,
            required = ["novel_metadata"],
            properties = {
                "novel_metadata": genai.types.Schema(
                    type = genai.types.Type.OBJECT,
                    required = ["metadata", "basic_info", "contributors", "annotated_full_text", "dialogues", "literary_analysis", "text_analytics", "linguistic_features", "world_building", "settings_detailed", "characters_detailed", "plot_and_structure", "conflict_development", "emotional_development_analysis", "cultural_and_historical_context", "reception_and_impact", "adaptations", "extraction_metadata", "data_quality", "related_resources", "tags_keywords", "license_usage"],
                    properties = {
                        "metadata": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["dataset_version", "schema_version", "language", "created_date", "last_updated", "data_source"],
                            properties = {
                                "dataset_version": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "Version of the dataset",
                                ),
                                "schema_version": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "Version of the schema",
                                ),
                                "language": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "ISO 639-1 code, e.g., 'ar' for Arabic",
                                ),
                                "created_date": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "Date and time when the record was created",
                                    format = "date-time",
                                ),
                                "last_updated": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "Date and time of last update",
                                    format = "date-time",
                                ),
                                "data_source": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "Source of the data",
                                ),
                            },
                        ),
                        "basic_info": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["novel_id", "identifiers", "title", "author", "publication"],
                            properties = {
                                "novel_id": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "Internal UUID for the novel",
                                ),
                                "identifiers": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "isbn_10": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "10-digit ISBN",
                                        ),
                                        "isbn_13": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "13-digit ISBN",
                                        ),
                                        "oclc": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "OCLC number",
                                        ),
                                        "doi": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Digital Object Identifier",
                                        ),
                                        "lccn": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Library of Congress Control Number",
                                        ),
                                    },
                                ),
                                "title": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["primary", "original_title", "alternative_titles", "english_translation"],
                                    properties = {
                                        "primary": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Primary title of the novel",
                                        ),
                                        "original_title": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Title in original language if different",
                                        ),
                                        "alternative_titles": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            description = "Alternative titles",
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "subtitle": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Subtitle if any",
                                        ),
                                        "english_translation": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "English translation of the title",
                                        ),
                                    },
                                ),
                                "author": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["full_name", "first_name", "last_name", "nationality"],
                                    properties = {
                                        "full_name": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Full name of the author",
                                        ),
                                        "native_name": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Name in native script",
                                        ),
                                        "first_name": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "last_name": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "pseudonyms": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            description = "Pen names or pseudonyms",
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "nationality": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "gender": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "birth_date": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "death_date": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "biography_summary": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "literary_period": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                    },
                                ),
                                "publication": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["publisher", "place", "original_language", "copyright_status", "format"],
                                    properties = {
                                        "first_published_date": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            nullable = "True",
                                        ),
                                        "publisher": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "place": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Place of publication",
                                        ),
                                        "original_language": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "copyright_status": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Public Domain", "Copyrighted", "Creative Commons", "Unknown"],
                                        ),
                                        "edition": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "format": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Hardcover", "Paperback", "E-book", "Audiobook", "Manuscript"],
                                        ),
                                    },
                                ),
                            },
                        ),
                        "contributors": genai.types.Schema(
                            type = genai.types.Type.ARRAY,
                            description = "Translators, Editors, Illustrators",
                            items = genai.types.Schema(
                                type = genai.types.Type.OBJECT,
                                required = ["name", "role"],
                                properties = {
                                    "name": genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                    ),
                                    "role": genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                        enum = ["Translator", "Editor", "Illustrator", "Introduction Author"],
                                    ),
                                    "contribution_notes": genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                    ),
                                },
                            ),
                        ),
                        "annotated_full_text": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["chapters"],
                            properties = {
                                "full_text_available": genai.types.Schema(
                                    type = genai.types.Type.BOOLEAN,
                                ),
                                "encoding": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "Character encoding, typically UTF-8",
                                ),
                                "chapters": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["chapter_number", "title", "content"],
                                        properties = {
                                            "chapter_number": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "title": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "content": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "Full chapter text",
                                            ),
                                            "word_count": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "annotations": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.OBJECT,
                                                    properties = {
                                                        "start_position": genai.types.Schema(
                                                            type = genai.types.Type.INTEGER,
                                                        ),
                                                        "end_position": genai.types.Schema(
                                                            type = genai.types.Type.INTEGER,
                                                        ),
                                                        "annotation_type": genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                            enum = ["Character", "Location", "Event", "Symbol", "Theme", "Literary Device", "Historical Reference", "Cultural Reference"],
                                                        ),
                                                        "entity": genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                        "description": genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    },
                                                ),
                                            ),
                                            "key_events": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "characters_present": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "locations_mentioned": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "sentiment_score": genai.types.Schema(
                                                type = genai.types.Type.NUMBER,
                                            ),
                                        },
                                    ),
                                ),
                            },
                        ),
                        "dialogues": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["dialogue_density", "conversations"],
                            properties = {
                                "dialogue_density": genai.types.Schema(
                                    type = genai.types.Type.NUMBER,
                                    description = "Percentage of text that is dialogue",
                                ),
                                "conversations": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["dialogue_id", "chapter", "speaker", "text"],
                                        properties = {
                                            "dialogue_id": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "chapter": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "scene_context": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "speaker": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "addressee": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "text": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "dialogue_type": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Direct Speech", "Indirect Speech", "Internal Monologue", "Stream of Consciousness"],
                                            ),
                                            "emotion": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "significance": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Plot-Critical", "Character Development", "Thematic", "Exposition", "Minor"],
                                            ),
                                            "literary_devices": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                description = "e.g., Irony, Metaphor, Foreshadowing",
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                        },
                                    ),
                                ),
                                "dialogue_patterns": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "most_talkative_character": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "dialogue_distribution": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                properties = {
                                                    "character": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "dialogue_count": genai.types.Schema(
                                                        type = genai.types.Type.INTEGER,
                                                    ),
                                                    "word_count": genai.types.Schema(
                                                        type = genai.types.Type.INTEGER,
                                                    ),
                                                },
                                            ),
                                        ),
                                    },
                                ),
                            },
                        ),
                        "literary_analysis": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["genre", "target_audience", "themes", "symbols_motifs", "narrative_style"],
                            properties = {
                                "genre": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["primary", "subgenres"],
                                    properties = {
                                        "primary": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "subgenres": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "literary_movement": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                    },
                                ),
                                "target_audience": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    enum = ["Children", "Middle Grade", "Young Adult", "Adult", "Academic"],
                                ),
                                "series_info": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["is_part_of_series"],
                                    properties = {
                                        "is_part_of_series": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                        "series_name": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "series_order": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                            nullable = "True",
                                        ),
                                        "total_in_series": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                            nullable = "True",
                                        ),
                                        "universe_name": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                    },
                                ),
                                "themes": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["theme", "prominence"],
                                        properties = {
                                            "theme": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "prominence": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Major", "Minor"],
                                            ),
                                            "description": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        },
                                    ),
                                ),
                                "symbols_motifs": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["symbol", "interpretation"],
                                        properties = {
                                            "symbol": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "interpretation": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        },
                                    ),
                                ),
                                "narrative_style": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["perspective", "tense", "narrative_devices"],
                                    properties = {
                                        "perspective": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["First Person", "Second Person", "Third Person Limited", "Third Person Omniscient", "Multiple Perspectives"],
                                        ),
                                        "tense": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Past", "Present", "Future", "Mixed"],
                                        ),
                                        "tone": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "narrator_reliability": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Reliable", "Unreliable", "Ambiguous"],
                                        ),
                                        "stream_of_consciousness": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                        "narrative_devices": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            description = "e.g., Flashback, Foreshadowing, Frame Story, Epistolary",
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                    },
                                ),
                            },
                        ),
                        "text_analytics": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["metrics", "readability", "sentiment_overview", "structure"],
                            properties = {
                                "metrics": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["total_tokens", "unique_words"],
                                    properties = {
                                        "total_characters": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "total_words": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "total_sentences": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "total_paragraphs": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "total_pages_standard": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "total_tokens": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "unique_words": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "lexical_diversity_ratio": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                        ),
                                    },
                                ),
                                "readability": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "flesch_reading_ease": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                        ),
                                        "average_sentence_length": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                        ),
                                        "complex_words_percentage": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                        ),
                                        "language_register": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Formal, Informal, Archaic, Dialectal",
                                        ),
                                    },
                                ),
                                "sentiment_overview": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "overall_sentiment": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Positive", "Negative", "Neutral", "Mixed"],
                                        ),
                                        "polarity_score": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                        ),
                                        "emotional_arc": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "e.g., Rags to riches, Tragedy, Cinderella curve",
                                        ),
                                    },
                                ),
                                "structure": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "chapter_count": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "parts_count": genai.types.Schema(
                                            type = genai.types.Type.INTEGER,
                                        ),
                                        "average_words_per_chapter": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                        ),
                                        "has_prologue": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                        "has_epilogue": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                    },
                                ),
                            },
                        ),
                        "linguistic_features": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["vocabulary_analysis", "syntactic_patterns"],
                            properties = {
                                "vocabulary_analysis": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "most_frequent_words": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                properties = {
                                                    "word": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "frequency": genai.types.Schema(
                                                        type = genai.types.Type.INTEGER,
                                                    ),
                                                    "part_of_speech": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                },
                                            ),
                                        ),
                                        "unique_vocabulary_richness": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                            description = "Type-Token Ratio",
                                        ),
                                        "archaic_words": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "neologisms": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "borrowed_words": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                properties = {
                                                    "word": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "source_language": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                },
                                            ),
                                        ),
                                    },
                                ),
                                "syntactic_patterns": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "average_sentence_complexity": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Simple", "Moderate", "Complex"],
                                        ),
                                        "sentence_types_distribution": genai.types.Schema(
                                            type = genai.types.Type.OBJECT,
                                            properties = {
                                                "declarative": genai.types.Schema(
                                                    type = genai.types.Type.NUMBER,
                                                ),
                                                "interrogative": genai.types.Schema(
                                                    type = genai.types.Type.NUMBER,
                                                ),
                                                "imperative": genai.types.Schema(
                                                    type = genai.types.Type.NUMBER,
                                                ),
                                                "exclamatory": genai.types.Schema(
                                                    type = genai.types.Type.NUMBER,
                                                ),
                                            },
                                        ),
                                        "passive_voice_usage": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                            description = "Percentage",
                                        ),
                                    },
                                ),
                                "rhetorical_devices": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "device": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "e.g., Metaphor, Simile, Alliteration, Assonance",
                                            ),
                                            "examples": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "frequency": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                        },
                                    ),
                                ),
                                "idiomatic_expressions": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "expression": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "meaning": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "cultural_context": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        },
                                    ),
                                ),
                                "arabic_specific_features": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "classical_vs_modern": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Classical Arabic", "Modern Standard Arabic", "Mixed"],
                                        ),
                                        "diacritics_usage": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                        "morphological_complexity": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "poetic_prose": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                            description = "Contains saj' or rhythmic prose",
                                        ),
                                    },
                                ),
                            },
                        ),
                        "world_building": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["temporal_setting", "geographical_setting"],
                            properties = {
                                "temporal_setting": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["time_period", "pacing"],
                                    properties = {
                                        "time_period": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "start_year": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            nullable = "True",
                                        ),
                                        "end_year": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            nullable = "True",
                                        ),
                                        "is_futuristic": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                        "is_historical": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                        "pacing": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Fast", "Slow", "Variable"],
                                        ),
                                        "timeline_linearity": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Linear", "Non-linear", "Circular", "Fragmented"],
                                        ),
                                    },
                                ),
                                "geographical_setting": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["setting_type", "locations"],
                                    properties = {
                                        "setting_type": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Real World", "Fantasy World", "Alternate History", "Space"],
                                        ),
                                        "locations": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                required = ["name", "type"],
                                                properties = {
                                                    "name": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "type": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                        description = "City, Country, Planet, Building",
                                                    ),
                                                    "is_fictional": genai.types.Schema(
                                                        type = genai.types.Type.BOOLEAN,
                                                    ),
                                                    "significance": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "map_coordinates": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                        description = "Lat/Long if real",
                                                    ),
                                                },
                                            ),
                                        ),
                                        "atmosphere": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                    },
                                ),
                            },
                        ),
                        "settings_detailed": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["locations_list"],
                            properties = {
                                "locations_list": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["location_name", "location_type"],
                                        properties = {
                                            "location_name": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "location_type": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["City", "Village", "Building", "Natural Landscape", "Country", "Region", "Fictional Place"],
                                            ),
                                            "is_fictional": genai.types.Schema(
                                                type = genai.types.Type.BOOLEAN,
                                            ),
                                            "description": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "symbolic_meaning": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "atmosphere": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "sensory_details": genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                properties = {
                                                    "visual": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                    "auditory": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                    "olfactory": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                    "tactile": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                },
                                            ),
                                            "cultural_significance": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "time_period_specific": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "scenes_set_here": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "associated_characters": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "key_events": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                        },
                                    ),
                                ),
                                "setting_progression": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "How settings change throughout the narrative",
                                ),
                            },
                        ),
                        "characters_detailed": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["character_count", "list", "relationships_graph"],
                            properties = {
                                "character_count": genai.types.Schema(
                                    type = genai.types.Type.INTEGER,
                                ),
                                "list": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["name", "role", "is_protagonist"],
                                        properties = {
                                            "name": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "aliases": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "role": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Protagonist", "Antagonist", "Deuteragonist", "Supporting", "Minor"],
                                            ),
                                            "archetype": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "e.g., The Hero, The Mentor, The Jester",
                                            ),
                                            "is_protagonist": genai.types.Schema(
                                                type = genai.types.Type.BOOLEAN,
                                            ),
                                            "demographics": genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                properties = {
                                                    "gender": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "age_range": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "occupation": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "social_class": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                },
                                            ),
                                            "traits": genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                properties = {
                                                    "physical": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                    "personality": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                    "strengths": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                    "weaknesses": genai.types.Schema(
                                                        type = genai.types.Type.ARRAY,
                                                        items = genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    ),
                                                },
                                            ),
                                            "character_arc": genai.types.Schema(
                                                type = genai.types.Type.OBJECT,
                                                properties = {
                                                    "type": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                        enum = ["Flat", "Positive", "Negative"],
                                                    ),
                                                    "goal": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "motivation": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                    "conflict": genai.types.Schema(
                                                        type = genai.types.Type.STRING,
                                                    ),
                                                },
                                            ),
                                            "key_quotes": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                        },
                                    ),
                                ),
                                "relationships_graph": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["source_character", "target_character", "relation_type"],
                                        properties = {
                                            "source_character": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "target_character": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "relation_type": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "Parent, Enemy, Lover, Friend",
                                            ),
                                            "evolution": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "How the relationship changes",
                                            ),
                                        },
                                    ),
                                ),
                            },
                        ),
                        "plot_and_structure": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["plot_archetype", "structure_model", "conflicts", "plot_points"],
                            properties = {
                                "plot_archetype": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "e.g., Overcoming the Monster, Quest, Voyage and Return",
                                ),
                                "structure_model": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    description = "e.g., Freytag's Pyramid, Fichtean Curve, Kishōtenketsu",
                                ),
                                "conflicts": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "type": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Man vs Man", "Man vs Nature", "Man vs Self", "Man vs Society", "Man vs Technology", "Man vs Fate"],
                                            ),
                                            "description": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        },
                                    ),
                                ),
                                "plot_points": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "inciting_incident": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "rising_action_events": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "climax": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "falling_action_events": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "resolution": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "plot_twists": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                    },
                                ),
                                "subplots": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "name": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "description": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "resolution": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        },
                                    ),
                                ),
                            },
                        ),
                        "conflict_development": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["primary_conflict", "conflict_timeline"],
                            properties = {
                                "primary_conflict": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    required = ["conflict_type", "parties_involved"],
                                    properties = {
                                        "conflict_type": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            enum = ["Man vs Man", "Man vs Nature", "Man vs Self", "Man vs Society", "Man vs Technology", "Man vs Fate"],
                                        ),
                                        "parties_involved": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "root_cause": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "stakes": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "What is at risk",
                                        ),
                                    },
                                ),
                                "conflict_timeline": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["stage", "chapter_range", "intensity_level"],
                                        properties = {
                                            "stage": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Introduction", "Escalation", "Peak", "De-escalation", "Resolution"],
                                            ),
                                            "chapter_range": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "e.g., Chapters 1-5",
                                            ),
                                            "intensity_level": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "description": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "key_turning_points": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                        },
                                    ),
                                ),
                                "secondary_conflicts": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "conflict_name": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "conflict_type": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "parties_involved": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "relation_to_primary": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "How it connects to main conflict",
                                            ),
                                            "resolution": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        },
                                    ),
                                ),
                                "conflict_resolution_pattern": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    enum = ["Complete Resolution", "Partial Resolution", "Unresolved", "Bittersweet", "Tragic"],
                                ),
                            },
                        ),
                        "emotional_development_analysis": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["overall_emotional_trajectory", "character_emotional_arcs"],
                            properties = {
                                "overall_emotional_trajectory": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "opening_mood": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "closing_mood": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "trajectory_pattern": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "e.g., Hopeful to Tragic, Dark to Redemptive",
                                        ),
                                        "emotional_peak": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "Most emotionally intense moment",
                                        ),
                                    },
                                ),
                                "character_emotional_arcs": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        required = ["character_name", "emotional_journey"],
                                        properties = {
                                            "character_name": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "initial_emotional_state": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "final_emotional_state": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "emotional_journey": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.OBJECT,
                                                    properties = {
                                                        "chapter_range": genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                        "dominant_emotion": genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                        "intensity": genai.types.Schema(
                                                            type = genai.types.Type.INTEGER,
                                                        ),
                                                        "trigger_event": genai.types.Schema(
                                                            type = genai.types.Type.STRING,
                                                        ),
                                                    },
                                                ),
                                            ),
                                            "transformation_type": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Positive Growth", "Negative Decline", "Redemption", "Corruption", "Enlightenment", "Despair", "Stable"],
                                            ),
                                        },
                                    ),
                                ),
                                "emotional_scenes": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "chapter": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "scene_description": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "primary_emotion": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "emotional_intensity": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "characters_affected": genai.types.Schema(
                                                type = genai.types.Type.ARRAY,
                                                items = genai.types.Schema(
                                                    type = genai.types.Type.STRING,
                                                ),
                                            ),
                                            "reader_impact": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                description = "Expected emotional response from reader",
                                            ),
                                        },
                                    ),
                                ),
                                "mood_progression_by_chapter": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "chapter": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "dominant_mood": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "mood_score": genai.types.Schema(
                                                type = genai.types.Type.NUMBER,
                                                description = "Negative to Positive scale",
                                            ),
                                        },
                                    ),
                                ),
                            },
                        ),
                        "cultural_and_historical_context": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["societal_elements", "historical_events_reflected"],
                            properties = {
                                "societal_elements": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "religion_and_belief": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "politics": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "gender_roles": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "technology_level": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                    },
                                ),
                                "historical_events_reflected": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "event": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "accuracy": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Accurate", "Fictionalized", "Loose Inspiration"],
                                            ),
                                        },
                                    ),
                                ),
                                "linguistic_context": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "dialects_used": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "sociolects": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "code_switching": genai.types.Schema(
                                            type = genai.types.Type.BOOLEAN,
                                        ),
                                    },
                                ),
                            },
                        ),
                        "reception_and_impact": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["awards", "critical_reception"],
                            properties = {
                                "awards": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "name": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "year": genai.types.Schema(
                                                type = genai.types.Type.INTEGER,
                                            ),
                                            "status": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                                enum = ["Winner", "Nominee", "Shortlist", "Longlist"],
                                            ),
                                        },
                                    ),
                                ),
                                "critical_reception": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "consensus": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                        "controversies": genai.types.Schema(
                                            type = genai.types.Type.ARRAY,
                                            items = genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        ),
                                        "academic_importance": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                        ),
                                    },
                                ),
                                "ratings": genai.types.Schema(
                                    type = genai.types.Type.OBJECT,
                                    properties = {
                                        "average_rating_score": genai.types.Schema(
                                            type = genai.types.Type.NUMBER,
                                        ),
                                        "source": genai.types.Schema(
                                            type = genai.types.Type.STRING,
                                            description = "e.g., Goodreads, Amazon",
                                        ),
                                    },
                                ),
                            },
                        ),
                        "adaptations": genai.types.Schema(
                            type = genai.types.Type.ARRAY,
                            items = genai.types.Schema(
                                type = genai.types.Type.OBJECT,
                                required = ["title", "medium", "year"],
                                properties = {
                                    "title": genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                    ),
                                    "medium": genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                        enum = ["Film", "Television", "Stage Play", "Radio", "Video Game", "Graphic Novel"],
                                    ),
                                    "year": genai.types.Schema(
                                        type = genai.types.Type.INTEGER,
                                    ),
                                    "director_creator": genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                    ),
                                    "fidelity_to_source": genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                        enum = ["Faithful", "Loose", "Reimagining"],
                                    ),
                                },
                            ),
                        ),
                        "extraction_metadata": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["extraction_date", "method", "model_version"],
                            properties = {
                                "extraction_date": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    format = "date-time",
                                ),
                                "method": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    enum = ["Automated", "Human-Curated", "Hybrid"],
                                ),
                                "model_version": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                ),
                                "confidence_score": genai.types.Schema(
                                    type = genai.types.Type.NUMBER,
                                ),
                                "pipeline_id": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                ),
                            },
                        ),
                        "data_quality": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["completeness_score", "verification_status"],
                            properties = {
                                "completeness_score": genai.types.Schema(
                                    type = genai.types.Type.NUMBER,
                                ),
                                "verification_status": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                    enum = ["Unverified", "AI-Verified", "Human-Verified"],
                                ),
                                "missing_fields": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                    ),
                                ),
                            },
                        ),
                        "related_resources": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            properties = {
                                "references": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.STRING,
                                    ),
                                ),
                                "similar_novels": genai.types.Schema(
                                    type = genai.types.Type.ARRAY,
                                    items = genai.types.Schema(
                                        type = genai.types.Type.OBJECT,
                                        properties = {
                                            "title": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "author": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                            "similarity_reason": genai.types.Schema(
                                                type = genai.types.Type.STRING,
                                            ),
                                        },
                                    ),
                                ),
                            },
                        ),
                        "tags_keywords": genai.types.Schema(
                            type = genai.types.Type.ARRAY,
                            items = genai.types.Schema(
                                type = genai.types.Type.STRING,
                            ),
                        ),
                        "license_usage": genai.types.Schema(
                            type = genai.types.Type.OBJECT,
                            required = ["license_type"],
                            properties = {
                                "license_type": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                ),
                                "usage_terms": genai.types.Schema(
                                    type = genai.types.Type.STRING,
                                ),
                            },
                        ),
                    },
                ),
            },
        ),
        system_instruction=[
            types.Part.from_text(text="""You are an expert in literary text analysis and structured data extraction. Your task is to analyze a novel and extract all its details accurately, converting them into a JSON file that strictly adheres to a provided schema.

First, here is the JSON schema that your output must conform to exactly:

<json_schema>
{{JSON_SCHEMA}}
</json_schema>

Now, here is the novel text you need to analyze:

<novel_text>
{{NOVEL_TEXT}}
</novel_text>

Before producing your output, use the scratchpad below to plan your extraction process:

<scratchpad>
In this space, think through:
1. What are all the required fields in the JSON schema?
2. What information can I extract from the novel text for each field?
3. For any missing information, what should I use (null, empty string, or empty array based on the schema)?
4. What are the character relationships I can identify from the text?
5. What themes, motifs, and symbols are present in the text?
6. Are there any dates that need ISO 8601 formatting?
7. If the text is in Arabic or contains Arabic elements, what linguistic features should I identify?
8. How should I structure nested objects and arrays to match the schema?
</scratchpad>

CRITICAL RULES FOR EXTRACTION:

**Schema Compliance:**
- Your output MUST match the JSON schema exactly in structure, field names, and data types
- Every field name must be spelled exactly as shown in the schema
- Do not add, remove, or rename any fields
- Respect the data types specified (strings, arrays, objects, numbers, booleans, null)
- If the schema specifies a field as required, you must include it (even if the value is null or empty)
- If the schema specifies a field as optional and you have no data, you may omit it or use null

**Accuracy Requirements:**
- Extract only information explicitly present in the novel text
- Do NOT fabricate, invent, or assume any data not directly stated or clearly implied in the text
- If information is missing (such as ISBN, awards, publication date, publisher, etc.), use null or appropriate empty values
- Be precise with character names, locations, and events exactly as they appear in the text
- For character descriptions, use only traits and details mentioned in the text
- For plot summaries, capture the actual narrative arc without adding interpretation

**Arabic Text Analysis (if applicable):**
- If the schema includes an `arabic_specific_features` field or similar, accurately identify:
  - Language register: فصحى (Classical/Modern Standard Arabic), عامية (Colloquial/Dialect), or مزيج (mixed)
  - Rhetorical devices such as: سجع (rhymed prose), جناس (paronomasia), طباق (antithesis), تورية (double entendre), استعارة (metaphor)
  - Dialectal variations if present (Egyptian, Levantine, Gulf, Maghrebi, etc.)
  - Cultural references specific to Arabic literature
- Ensure proper UTF-8 encoding for all Arabic text in the JSON output
- Preserve Arabic text exactly as it appears, including diacritical marks if present

**Character and Relationship Analysis:**
- Extract all characters mentioned in the text with their roles and descriptions
- In relationship mapping fields (such as `relationships_graph` or `characters_detailed`), map only relationships explicitly shown or clearly implied in the text
- Base relationship types on actual interactions: family, friendship, rivalry, romantic, professional, mentor-student, etc.
- Include relationship strength or importance only if discernible from the text
- For character arcs, track development from beginning to end of the narrative

**Thematic Analysis:**
- Identify themes, motifs, and symbols as they actually appear in the text
- Provide objective analysis based on textual evidence
- Avoid imposing external moral, political, or ideological judgments
- Focus on what the text presents, not on evaluating or critiquing it
- For symbols and motifs, note their recurrence and significance within the narrative

**Date and Number Formatting:**
- Use ISO 8601 format for all dates: YYYY-MM-DD for dates, YYYY-MM-DDTHH:MM:SSZ for timestamps
- If only year is known, use: YYYY
- If only year and month are known, use: YYYY-MM
- If date is unknown or not mentioned, use null
- For page counts, chapter counts, and other numbers, use integer types (not strings)

**Technical JSON Requirements:**
- Output ONLY valid, well-formed JSON
- No explanatory text, commentary, or markdown before or after the JSON
- No markdown code blocks (no ```json or ``` markers)
- No comments within the JSON (JSON does not support comments)
- The output must be directly parseable by standard JSON parsers
- Ensure proper escaping of special characters in strings:
  - Use \\\" for quotation marks within strings
  - Use \\\\ for backslashes
  - Use \\n for newlines within string values
- Use UTF-8 encoding for all text, especially non-ASCII characters like Arabic
- Maintain consistent indentation (2 or 4 spaces) for readability, or use compact format

**Handling Missing Data:**
- For required string fields with no available data: check the schema to see if null is allowed; if so, use null; otherwise use \"\"
- For optional fields with no data: use null or omit the field if the schema allows
- For array fields with no data: use empty array [] (not null, unless schema specifies otherwise)
- For object fields with no data: use null if the schema allows, or an empty object {} if required
- Never invent placeholder data like \"Unknown\", \"N/A\", \"TBD\", or fictional ISBNs/dates
- If a character's age, occupation, or other detail is not mentioned, omit it or use null rather than guessing

**Output Format:**
Your final output must be ONLY the JSON object with no additional text, explanations, or formatting markers. Do not include:
- Introductory phrases like \"Here is the JSON:\" or \"The extracted data is:\"
- Markdown code fences
- Explanatory notes after the JSON
- Scratchpad content (this is for your internal planning only)

The JSON must be valid, complete, and conform exactly to the provided schema. Begin your output directly with the opening brace { of the JSON object.


Important rules for execution:

1. **Work Continuously**: Begin executing the task immediately. Work through as many steps as possible in a flowing, sequential manner within a single response. Do not stop prematurely.

2. **Maximize Progress**: Execute the maximum amount of work you can fit into your response. Work systematically and efficiently through the task components.

3. **Track Your Progress**: Keep clear mental track of exactly where you are in the task execution so you can report your stopping point accurately.

4. **Mandatory Stopping Format**: When you reach the limit of your response capacity and must stop, you MUST end your response with EXACTLY this format in Arabic:

`[تم الوصول إلى الحد الأقصى للرد. توقفت عند: (اذكر بوضوح آخر موضوع ودرس فرعي عملت عليه). جاهز للمتابعة عند تلقي الأمر.]`
"""),
        ],
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        print(chunk.text, end="")
    
    return True


def process_file(file_path: str, max_tokens: int = 30000):
    """
    معالجة ملف كامل مع التقسيم التلقائي
    
    Args:
        file_path: مسار الملف
        max_tokens: الحد الأقصى للتوكنز في كل جزء
    """
    print(f"قراءة الملف: {file_path}")
    chunks = read_and_split_file(file_path, max_tokens)
    
    if not chunks:
        print("فشل في قراءة أو تقسيم الملف")
        return
    
    print(f"تم تقسيم الملف إلى {len(chunks)} جزء")
    
    for i, chunk in enumerate(chunks, 1):
        print(f"\n{'='*50}")
        print(f"معالجة الجزء {i} من {len(chunks)}")
        print(f"{'='*50}\n")
        
        try:
            generate(chunk, i, len(chunks))
            print(f"\n\nتم الانتهاء من الجزء {i}")
        except Exception as e:
            print(f"\nخطأ في معالجة الجزء {i}: {str(e)}")
            continue

if __name__ == "__main__":
    # تشغيل على ملف الشحاذ
    process_file("الشحاذ‏.txt", max_tokens=30000)
