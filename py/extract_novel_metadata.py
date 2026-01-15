"""
Novel Metadata Extractor
Extracts comprehensive metadata from Arabic novels using Gemini AI.
"""
import os
import sys
import json
from datetime import datetime
from pathlib import Path
from google import genai
from dotenv import load_dotenv

# Fix Unicode encoding for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "models/gemini-3-flash-preview"

# Sampling / chunking config for metadata (not full-book processing)
SAMPLE_SEGMENTS = 3                 # begin / middle / end
SEGMENT_MAX_TOKENS = 8000           # max tokens per segment sample
TARGET_TOTAL_SAMPLE_TOKENS = 22000  # total tokens budget for all samples combined
TOKEN_TO_CHAR_RATIO = 4             # rough estimate: 1 token ~ 4 chars (used only to reduce API calls)


class NovelMetadataExtractor:
    def __init__(self, novel_path: str, schema_path: str = None):
        self.novel_path = novel_path
        self.novel_name = os.path.basename(novel_path).split('.')[0]
        self.client = genai.Client(api_key=API_KEY) if API_KEY else None

        # Load schema
        self.schema = self._load_schema(schema_path)

        # Load text
        self.text = self._load_text(novel_path)

    def _load_schema(self, schema_path: str = None) -> dict:
        """Load JSON Schema for metadata validation."""
        if schema_path is None:
            repo_root = Path(__file__).resolve().parent
            data_template = repo_root / "data" / "templates" / "novel_metadata_template_arabic.json"
            legacy_template = repo_root / "novel_metadata_template_arabic.json"
            schema_path = str(data_template if data_template.exists() else legacy_template)

        with open(schema_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _load_text(self, path: str) -> str:
        """Load text from file. Supports .txt and .json (PDF extraction format)."""
        file_ext = os.path.splitext(path)[1].lower()

        with open(path, 'r', encoding='utf-8') as f:
            if file_ext == '.json':
                data = json.load(f)
                if "pages" in data:
                    full_text = "\n\n".join([page.get("text", "") for page in data["pages"]])
                    print(f"Loaded JSON with {len(data['pages'])} pages ({len(full_text):,} characters)")
                    return full_text
                else:
                    raise ValueError("JSON file must have 'pages' key with page objects")
            else:
                return f.read()

    def _count_tokens(self, text: str) -> int:
        """Accurate token counting using Gemini CountTokens."""
        resp = self.client.models.count_tokens(
            model=MODEL_NAME,
            contents=[text],
        )
        return int(resp.total_tokens)

    def _trim_to_token_limit(self, text: str, max_tokens: int) -> str:
        """
        Trim text to be <= max_tokens using a fast char-based shrink + final exact check.
        """
        if not text.strip():
            return ""

        # Quick accept
        if self._count_tokens(text) <= max_tokens:
            return text

        # Fast shrink loop (char-based)
        lo, hi = 1, len(text)
        best = ""

        # Binary search for largest prefix that fits
        while lo <= hi:
            mid = (lo + hi) // 2
            candidate = text[:mid]
            tok = self._count_tokens(candidate)
            if tok <= max_tokens:
                best = candidate
                lo = mid + 1
            else:
                hi = mid - 1

        return best

    def _build_representative_sample(self) -> tuple:
        """
        Build a representative sample for metadata extraction:
        - choose begin / middle / end segments
        - each segment trimmed to SEGMENT_MAX_TOKENS
        - total sample kept near TARGET_TOTAL_SAMPLE_TOKENS
        Returns: (text_sample, sample_meta)
        """
        full = self.text or ""
        full = full.strip()
        if not full:
            return "", {"segments": [], "total_tokens": 0}

        # Estimate char sizes to minimize countTokens calls
        seg_chars = SEGMENT_MAX_TOKENS * TOKEN_TO_CHAR_RATIO

        # Candidate segments by position (begin/middle/end)
        n = len(full)
        begins = full[: min(n, seg_chars * 2)]
        middle_start = max(0, (n // 2) - seg_chars)
        middle_end = min(n, (n // 2) + seg_chars)
        middle = full[middle_start:middle_end]
        ends = full[max(0, n - seg_chars * 2):]

        # Trim each to token limit (exact)
        begin_txt = self._trim_to_token_limit(begins, SEGMENT_MAX_TOKENS)
        mid_txt = self._trim_to_token_limit(middle, SEGMENT_MAX_TOKENS)
        end_txt = self._trim_to_token_limit(ends, SEGMENT_MAX_TOKENS)

        segments = [
            ("[مقتطف من البداية]", begin_txt),
            ("[مقتطف من منتصف الرواية]", mid_txt),
            ("[مقتطف من النهاية]", end_txt),
        ]

        # Build combined sample and enforce total token budget
        combined = "\n\n".join([f"{title}\n{txt}".strip() for title, txt in segments if txt.strip()])
        total_tok = self._count_tokens(combined)

        # If over budget, reduce per-segment proportionally (simple step-down)
        if total_tok > TARGET_TOTAL_SAMPLE_TOKENS:
            # step-down: reduce each segment max tokens gradually
            new_limit = max(2000, int(SEGMENT_MAX_TOKENS * (TARGET_TOTAL_SAMPLE_TOKENS / max(total_tok, 1))))
            begin_txt = self._trim_to_token_limit(begins, new_limit)
            mid_txt = self._trim_to_token_limit(middle, new_limit)
            end_txt = self._trim_to_token_limit(ends, new_limit)

            segments = [
                ("[مقتطف من البداية]", begin_txt),
                ("[مقتطف من منتصف الرواية]", mid_txt),
                ("[مقتطف من النهاية]", end_txt),
            ]
            combined = "\n\n".join([f"{title}\n{txt}".strip() for title, txt in segments if txt.strip()])
            total_tok = self._count_tokens(combined)

        sample_meta = {
            "segment_max_tokens": SEGMENT_MAX_TOKENS,
            "target_total_sample_tokens": TARGET_TOTAL_SAMPLE_TOKENS,
            "actual_total_sample_tokens": total_tok,
            "segments_included": [title for title, txt in segments if txt.strip()],
        }
        return combined, sample_meta

    def _create_extraction_prompt(self, text_sample: str) -> str:
        """Create prompt for metadata extraction."""

        today = datetime.now().strftime('%Y-%m-%d')
        filename = os.path.basename(self.novel_path)
        filesize = os.path.getsize(self.novel_path)

        prompt = f"""You are an expert literary analyst specializing in Arabic literature.

Analyze the following text from the Arabic novel "{self.novel_name}" and extract comprehensive metadata.

Output MUST be valid JSON following this exact structure:
{{
  "novel_metadata": {{
    "metadata": {{
      "dataset_version": "1.0",
      "language": "arabic",
      "created_date": "{today}",
      "last_updated": "{today}",
      "schema_type": "comprehensive_novel_metadata"
    }},
    "basic_info": {{
      "novel_id": "{self.novel_name}",
      "title": {{"primary": " extracted title", "alternative_titles": [], "english_translation": ""}},
      "author": {{"full_name": "", "first_name": "", "last_name": "", "nationality": "", "birth_year": null, "death_year": null, "biography_summary": ""}},
      "publication": {{"first_published": null, "publisher": "", "place": "", "original_language": "", "copyright_status": ""}}
    }},
    "literary_classification": {{
      "genre": {{"primary": "", "secondary": []}},
      "literary_movement": "",
      "series_info": {{"is_part_of_series": false, "series_name": "", "series_order": null, "other_parts": []}},
      "themes": [{{"theme": "", "prominence": ""}}],
      "narrative_style": {{"perspective": "", "tense": "", "tone": []}}
    }},
    "text_statistics": {{
      "source_file": {{"filename": "{filename}", "file_size_bytes": {filesize}, "encoding": "UTF-8"}},
      "content_metrics": {{"total_characters": null, "total_words": null, "total_sentences": null, "total_paragraphs": null, "estimated_reading_time_minutes": null}},
      "structure": {{"chapter_count": null, "parts": null, "has_prologue": false, "has_epilogue": false, "has_sections": false}},
      "dialogue_ratio": null,
      "description_ratio": null,
      "internal_monologue_ratio": null
    }},
    "temporal_setting": {{
      "time_period": {{"start": "", "end": "", "description": ""}},
      "historical_context": {{"major_events": [], "political_regime": "", "social_conditions": ""}},
      "timeline_coverage": {{"duration_years": null, "span_type": "", "pacing": ""}}
    }},
    "geographical_setting": {{
      "primary_location": {{"country": "", "city": "", "district": "", "street": "", "specific_place": ""}},
      "secondary_locations": [{{"place": "", "significance": "", "frequency": ""}}],
      "urban_rural": "",
      "cultural_region": ""
    }},
    "character_summary": {{
      "total_characters": null,
      "main_characters": [{{"name": "", "role": "", "gender": ""}}],
      "character_dynamics": ""
    }},
    "plot_structure": {{
      "plot_type": "",
      "narrative_arc": {{"opening": "", "inciting_incident": "", "rising_action": [], "climax": "", "falling_action": [], "resolution": ""}},
      "subplots": []
    }},
    "cultural_context": {{
      "religion": "",
      "social_class": "",
      "family_structure": "",
      "gender_roles": {{"male": "", "female": ""}},
      "customs_traditions": [],
      "language_variety": {{"narrative": "", "dialogue": ""}}
    }},
    "awards_recognition": {{
      "major_awards": [{{"award_name": "", "year": null, "citation": "", "significance": ""}}],
      "other_honors": []
    }},
    "adaptations": [{{"type": "", "year": null, "director": "", "cast": [], "description": ""}}],
    "extraction_metadata": {{
      "extraction_date": "{today}",
      "extraction_method": "AI-powered NLP with {MODEL_NAME}",
      "ai_models_used": [{{"model": "{MODEL_NAME}", "purpose": "metadata extraction"}}],
      "processing_pipeline": "extract_novel_metadata.py",
      "chunk_size": null,
      "overlap": null,
      "confidence_score": null,
      "human_validation_required": true,
      "extraction_notes": ""
    }},
    "data_quality": {{
      "completeness": null,
      "accuracy": null,
      "consistency": null,
      "validation_status": "pending_human_review",
      "last_validation_date": "{today}",
      "issues_found": [],
      "recommendations": []
    }},
    "related_resources": {{
      "sequels": [],
      "prequels": [],
      "spin_offs": [],
      "critical_studies": [],
      "external_links": []
    }},
    "tags_keywords": [],
    "license_usage": {{
      "license_type": "",
      "attribution_required": false,
      "commercial_use": false,
      "modification_allowed": false,
      "share_alike": false
    }}
  }}
}}

IMPORTANT INSTRUCTIONS:
1. Extract ALL available information from the text
2. Use null for fields that cannot be determined
3. Use empty arrays [] for lists
4. For text_statistics, calculate actual counts from the text
5. Output PURE JSON only - no markdown, no explanations
6. All text values must be in Arabic except for technical fields

TEXT TO ANALYZE:
{text_sample}

OUTPUT PURE JSON ONLY:"""

        return prompt

    def extract_metadata(self) -> dict:
        """Extract metadata using Gemini AI."""
        if not self.client:
            raise ValueError("GEMINI_API_KEY is not set.")

        # Build a representative token-based sample (begin/middle/end)
        text_sample, sample_meta = self._build_representative_sample()
        if not text_sample.strip():
            raise ValueError("Loaded text is empty; cannot extract metadata.")

        print(f"Sample info: {sample_meta}")

        prompt = self._create_extraction_prompt(text_sample)

        print(f"Extracting metadata from '{self.novel_name}' using {MODEL_NAME}...")

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )

            # Clean response
            text_resp = response.text.strip()
            if text_resp.startswith("```json"):
                text_resp = text_resp[7:-3]
            elif text_resp.startswith("```"):
                text_resp = text_resp[3:-3]

            # Parse JSON
            metadata = json.loads(text_resp)

            # Calculate actual text statistics
            metadata["novel_metadata"]["text_statistics"]["content_metrics"] = self._calculate_text_stats()

            # Store sampling info (so you know what was analyzed)
            metadata["novel_metadata"]["extraction_metadata"]["chunk_size"] = sample_meta.get("segment_max_tokens")
            metadata["novel_metadata"]["extraction_metadata"]["overlap"] = 0
            metadata["novel_metadata"]["extraction_metadata"]["extraction_notes"] = (
                f"Used representative sampling: {sample_meta}"
            )

            print("Metadata extracted successfully!")
            return metadata

        except Exception as e:
            print(f"Error extracting metadata: {e}")
            # Return skeleton with error info
            return self._create_skeleton_metadata(str(e))

    def _calculate_text_stats(self) -> dict:
        """Calculate actual text statistics."""
        words = self.text.split()
        sentences = self.text.count('.') + self.text.count('!') + self.text.count('?')
        paragraphs = [p for p in self.text.split('\n\n') if p.strip()]

        return {
            "total_characters": len(self.text),
            "total_words": len(words),
            "total_sentences": sentences,
            "total_paragraphs": len(paragraphs),
            "estimated_reading_time_minutes": round(len(words) / 250, 1)  # Average 250 words/minute
        }

    def _create_skeleton_metadata(self, error_msg: str) -> dict:
        """Create skeleton metadata with extraction info."""
        return {
            "novel_metadata": {
                "metadata": {
                    "dataset_version": "1.0",
                    "language": "arabic",
                    "created_date": datetime.now().strftime('%Y-%m-%d'),
                    "last_updated": datetime.now().strftime('%Y-%m-%d'),
                    "schema_type": "comprehensive_novel_metadata"
                },
                "basic_info": {
                    "novel_id": self.novel_name,
                    "title": {"primary": self.novel_name, "alternative_titles": [], "english_translation": ""},
                    "author": {"full_name": "", "first_name": "", "last_name": "", "nationality": "", "birth_year": None, "death_year": None, "biography_summary": ""},
                    "publication": {"first_published": None, "publisher": "", "place": "", "original_language": "", "copyright_status": ""}
                },
                "text_statistics": {
                    "source_file": {"filename": os.path.basename(self.novel_path), "file_size_bytes": os.path.getsize(self.novel_path), "encoding": "UTF-8"},
                    "content_metrics": self._calculate_text_stats(),
                    "structure": {"chapter_count": None, "parts": None, "has_prologue": False, "has_epilogue": False, "has_sections": False},
                    "dialogue_ratio": None,
                    "description_ratio": None,
                    "internal_monologue_ratio": None
                },
                "extraction_metadata": {
                    "extraction_date": datetime.now().strftime('%Y-%m-%d'),
                    "extraction_method": f"AI-powered NLP with {MODEL_NAME}",
                    "ai_models_used": [{"model": MODEL_NAME, "purpose": "metadata extraction"}],
                    "processing_pipeline": "extract_novel_metadata.py",
                    "chunk_size": None,
                    "overlap": None,
                    "confidence_score": None,
                    "human_validation_required": True,
                    "extraction_notes": f"Extraction failed: {error_msg}"
                },
                "data_quality": {
                    "completeness": None,
                    "accuracy": None,
                    "consistency": None,
                    "validation_status": "extraction_failed",
                    "last_validation_date": datetime.now().strftime('%Y-%m-%d'),
                    "issues_found": [error_msg],
                    "recommendations": ["Retry extraction", "Check API key", "Verify text format"]
                }
            }
        }

    def save_metadata(self, metadata: dict, output_path: str = None):
        """Save extracted metadata to JSON file."""
        if output_path is None:
            output_path = os.path.join("metadata_output", f"{self.novel_name}_metadata.json")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        print(f"Saved metadata to: {output_path}")
        return output_path


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Extract metadata from Arabic novels')
    parser.add_argument('novel_path', help='Path to novel file (.txt or .json)')
    parser.add_argument('--schema', help='Path to JSON schema file', default=None)
    parser.add_argument('--output', help='Output path for metadata JSON', default=None)

    args = parser.parse_args()

    # Check API key
    if not API_KEY:
        print("Error: GEMINI_API_KEY environment variable not set.")
        print("Please set it in .env file or environment.")
        sys.exit(1)

    # Extract metadata
    extractor = NovelMetadataExtractor(args.novel_path, args.schema)
    metadata = extractor.extract_metadata()
    extractor.save_metadata(metadata, args.output)

    print("\nExtraction complete!")


if __name__ == "__main__":
    main()
