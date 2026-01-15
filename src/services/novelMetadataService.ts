
import { GoogleGenAI, Type } from "@google/genai";
import { NovelMetadataResult } from '../types';

// Secure API Key Loading with Validation
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("مفتاح API غير موجود. يرجى التأكد من ضبط process.env.API_KEY.");
  }
  return key;
};

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: getApiKey() });
} catch (e) {
  console.error("Failed to initialize Gemini Client:", e);
}

/**
 * Maximum number of characters to send to the AI model
 */
const MAX_TEXT_LENGTH = 100000;

/**
 * Text statistics calculated from the input text
 */
export interface TextStatistics {
  totalCharacters: number;
  totalWords: number;
  totalSentences: number;
  totalParagraphs: number;
  estimatedReadingTimeMinutes: number;
}

/**
 * Calculates basic text statistics for Arabic text
 */
export const calculateTextStatistics = (text: string): TextStatistics => {
  const totalCharacters = text.length;
  const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;
  const totalSentences = (text.match(/[.!?؟،؛]+/g) || []).length;
  const totalParagraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  const estimatedReadingTimeMinutes = Math.ceil(totalWords / 200); // ~200 words per minute

  return {
    totalCharacters,
    totalWords,
    totalSentences,
    totalParagraphs,
    estimatedReadingTimeMinutes,
  };
};

/**
 * Classification Taxonomy for Novel Analysis
 */
const CLASSIFICATION_TAXONOMY = `
## CLASSIFICATION TAXONOMY

### A. Genres & Literary Classification
science-fiction, fantasy, mystery-thriller, historical-fiction, romance, horror, dystopian, literary-fiction, adventure, young-adult.

### B. Character Archetypes
protagonist, antagonist, deuteragonist, confidant, love-interest, mentor, dynamic-character, static-character, foil, narrator, tragic-hero, anti-hero, unreliable-narrator, symbolic-character, catalyst-character.

### C. Settings (Spatial & Temporal)
Spatial: utopian-setting, dystopian-setting, claustrophobic-setting, liminal-space, pastoral-rural, urban-noir, high-fantasy-world.
Temporal: linear-chronology, non-linear-narrative, flashback-heavy, flash-forward-foreshadowing, circular-time, real-time-pacing.

### D. Plot Dynamics & Events
inciting-incident, plot-twist, red-herring, deus-ex-machina, cliffhanger, foreshadowing, parallel-plot, climax-peak, falling-action, in-media-res.
Advanced Dynamics: causal-chain-reaction, reversal-of-fortune-peripeteia, ticking-clock-mechanism, macguffin-pursuit, convergence-point.

### E. Conflict & Evolution
Types: man-vs-self-psychological, man-vs-society-institutional, interpersonal-vendetta, ideological-schism, asymmetrical-power-dynamic.
Evolution: conflict-escalation-spiral, conflict-stalemate-deadlock, proxy-conflict.

### F. Ending & Resolution
resolved-happy-ending, tragic-ending, bittersweet-ending, ambiguous-open-ending, circular-ending, twist-ending, nihilistic-ending.

### G. Emotions & Atmosphere
existential-despair, bittersweet-nostalgia, simmering-resentment, paralyzing-dread, euphoric-triumph, stoic-acceptance.

### H. Literary Style & Context
Style: allegory, satire, magical-realism, dramatic-irony, stream-of-consciousness, pathetic-fallacy.
Context: social-stratification, political-upheaval, colonialism-postcolonialism, tradition-vs-modernity, patriarchal-system.
`;

/**
 * The JSON Schema for Novel Metadata Extraction
 */
const NOVEL_METADATA_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    novel_metadata: {
      type: Type.OBJECT,
      properties: {
        metadata: {
          type: Type.OBJECT,
          properties: {
            dataset_version: { type: Type.STRING },
            language: { type: Type.STRING },
            created_date: { type: Type.STRING },
            last_updated: { type: Type.STRING },
            schema_type: { type: Type.STRING }
          },
          required: ["dataset_version", "language", "created_date", "last_updated", "schema_type"]
        },
        basic_info: {
          type: Type.OBJECT,
          properties: {
            novel_id: { type: Type.STRING },
            title: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                alternative_titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                english_translation: { type: Type.STRING }
              },
              required: ["primary", "alternative_titles", "english_translation"]
            },
            author: {
              type: Type.OBJECT,
              properties: {
                full_name: { type: Type.STRING },
                first_name: { type: Type.STRING },
                last_name: { type: Type.STRING },
                nationality: { type: Type.STRING },
                birth_year: { type: Type.INTEGER, nullable: true },
                death_year: { type: Type.INTEGER, nullable: true },
                biography_summary: { type: Type.STRING }
              },
              required: ["full_name", "first_name", "last_name", "nationality", "biography_summary"]
            },
            publication: {
              type: Type.OBJECT,
              properties: {
                first_published: { type: Type.STRING, nullable: true },
                publisher: { type: Type.STRING },
                place: { type: Type.STRING },
                original_language: { type: Type.STRING },
                copyright_status: { type: Type.STRING }
              },
              required: ["publisher", "place", "original_language", "copyright_status"]
            }
          },
          required: ["novel_id", "title", "author", "publication"]
        },
        literary_classification: {
          type: Type.OBJECT,
          properties: {
            genre: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["primary", "secondary"]
            },
            literary_movement: { type: Type.STRING },
            series_info: {
              type: Type.OBJECT,
              properties: {
                is_part_of_series: { type: Type.BOOLEAN },
                series_name: { type: Type.STRING },
                series_order: { type: Type.INTEGER, nullable: true },
                other_parts: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["is_part_of_series", "series_name", "other_parts"]
            },
            themes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  theme: { type: Type.STRING },
                  prominence: { type: Type.STRING }
                },
                required: ["theme", "prominence"]
              }
            },
            narrative_style: {
              type: Type.OBJECT,
              properties: {
                perspective: { type: Type.STRING },
                tense: { type: Type.STRING },
                tone: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["perspective", "tense", "tone"]
            }
          },
          required: ["genre", "literary_movement", "series_info", "themes", "narrative_style"]
        },
        text_statistics: {
          type: Type.OBJECT,
          properties: {
            source_file: {
              type: Type.OBJECT,
              properties: {
                filename: { type: Type.STRING },
                file_size_bytes: { type: Type.INTEGER, nullable: true },
                encoding: { type: Type.STRING }
              },
              required: ["filename", "encoding"]
            },
            content_metrics: {
              type: Type.OBJECT,
              properties: {
                total_characters: { type: Type.INTEGER, nullable: true },
                total_words: { type: Type.INTEGER, nullable: true },
                total_sentences: { type: Type.INTEGER, nullable: true },
                total_paragraphs: { type: Type.INTEGER, nullable: true },
                estimated_reading_time_minutes: { type: Type.NUMBER, nullable: true }
              },
              required: ["total_characters", "total_words", "total_sentences", "total_paragraphs"]
            },
            structure: {
              type: Type.OBJECT,
              properties: {
                chapter_count: { type: Type.INTEGER, nullable: true },
                parts: { type: Type.INTEGER, nullable: true },
                has_prologue: { type: Type.BOOLEAN },
                has_epilogue: { type: Type.BOOLEAN },
                has_sections: { type: Type.BOOLEAN }
              },
              required: ["has_prologue", "has_epilogue", "has_sections"]
            },
            dialogue_ratio: { type: Type.NUMBER, nullable: true },
            description_ratio: { type: Type.NUMBER, nullable: true },
            internal_monologue_ratio: { type: Type.NUMBER, nullable: true }
          },
          required: ["source_file", "content_metrics", "structure"]
        },
        temporal_setting: {
          type: Type.OBJECT,
          properties: {
            time_period: {
              type: Type.OBJECT,
              properties: {
                start: { type: Type.STRING },
                end: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["start", "end", "description"]
            },
            historical_context: {
              type: Type.OBJECT,
              properties: {
                major_events: { type: Type.ARRAY, items: { type: Type.STRING } },
                political_regime: { type: Type.STRING },
                social_conditions: { type: Type.STRING }
              },
              required: ["major_events", "political_regime", "social_conditions"]
            },
            timeline_coverage: {
              type: Type.OBJECT,
              properties: {
                duration_years: { type: Type.NUMBER, nullable: true },
                span_type: { type: Type.STRING },
                pacing: { type: Type.STRING }
              },
              required: ["span_type", "pacing"]
            }
          },
          required: ["time_period", "historical_context", "timeline_coverage"]
        },
        geographical_setting: {
          type: Type.OBJECT,
          properties: {
            primary_location: {
              type: Type.OBJECT,
              properties: {
                country: { type: Type.STRING },
                city: { type: Type.STRING },
                district: { type: Type.STRING },
                street: { type: Type.STRING },
                specific_place: { type: Type.STRING }
              },
              required: ["country", "city", "district", "street", "specific_place"]
            },
            secondary_locations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  place: { type: Type.STRING },
                  significance: { type: Type.STRING },
                  frequency: { type: Type.STRING }
                },
                required: ["place", "significance", "frequency"]
              }
            },
            urban_rural: { type: Type.STRING },
            cultural_region: { type: Type.STRING }
          },
          required: ["primary_location", "secondary_locations", "urban_rural", "cultural_region"]
        },
        character_summary: {
          type: Type.OBJECT,
          properties: {
            total_characters: { type: Type.INTEGER, nullable: true },
            main_characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  gender: { type: Type.STRING }
                },
                required: ["name", "role", "gender"]
              }
            },
            character_dynamics: { type: Type.STRING }
          },
          required: ["main_characters", "character_dynamics"]
        },
        plot_structure: {
          type: Type.OBJECT,
          properties: {
            plot_type: { type: Type.STRING },
            narrative_arc: {
              type: Type.OBJECT,
              properties: {
                opening: { type: Type.STRING },
                inciting_incident: { type: Type.STRING },
                rising_action: { type: Type.ARRAY, items: { type: Type.STRING } },
                climax: { type: Type.STRING },
                falling_action: { type: Type.ARRAY, items: { type: Type.STRING } },
                resolution: { type: Type.STRING }
              },
              required: ["opening", "inciting_incident", "rising_action", "climax", "falling_action", "resolution"]
            },
            subplots: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["plot_type", "narrative_arc", "subplots"]
        },
        cultural_context: {
          type: Type.OBJECT,
          properties: {
            religion: { type: Type.STRING },
            social_class: { type: Type.STRING },
            family_structure: { type: Type.STRING },
            gender_roles: {
              type: Type.OBJECT,
              properties: {
                male: { type: Type.STRING },
                female: { type: Type.STRING }
              },
              required: ["male", "female"]
            },
            customs_traditions: { type: Type.ARRAY, items: { type: Type.STRING } },
            language_variety: {
              type: Type.OBJECT,
              properties: {
                narrative: { type: Type.STRING },
                dialogue: { type: Type.STRING }
              },
              required: ["narrative", "dialogue"]
            }
          },
          required: ["religion", "social_class", "family_structure", "gender_roles", "customs_traditions", "language_variety"]
        },
        awards_recognition: {
          type: Type.OBJECT,
          properties: {
            major_awards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  award_name: { type: Type.STRING },
                  year: { type: Type.INTEGER, nullable: true },
                  citation: { type: Type.STRING },
                  significance: { type: Type.STRING }
                },
                required: ["award_name", "citation", "significance"]
              }
            },
            other_honors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["major_awards", "other_honors"]
        },
        adaptations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              year: { type: Type.INTEGER, nullable: true },
              director: { type: Type.STRING },
              cast: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING }
            },
            required: ["type", "director", "cast", "description"]
          }
        },
        extraction_metadata: {
          type: Type.OBJECT,
          properties: {
            extraction_date: { type: Type.STRING },
            extraction_method: { type: Type.STRING },
            ai_models_used: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  model: { type: Type.STRING },
                  purpose: { type: Type.STRING }
                },
                required: ["model", "purpose"]
              }
            },
            processing_pipeline: { type: Type.STRING },
            chunk_size: { type: Type.INTEGER, nullable: true },
            overlap: { type: Type.INTEGER, nullable: true },
            confidence_score: { type: Type.NUMBER, nullable: true },
            human_validation_required: { type: Type.BOOLEAN },
            extraction_notes: { type: Type.STRING }
          },
          required: ["extraction_date", "extraction_method", "ai_models_used", "processing_pipeline", "human_validation_required", "extraction_notes"]
        },
        data_quality: {
          type: Type.OBJECT,
          properties: {
            completeness: { type: Type.NUMBER, nullable: true },
            accuracy: { type: Type.NUMBER, nullable: true },
            consistency: { type: Type.NUMBER, nullable: true },
            validation_status: { type: Type.STRING },
            last_validation_date: { type: Type.STRING },
            issues_found: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["validation_status", "last_validation_date", "issues_found", "recommendations"]
        },
        related_resources: {
          type: Type.OBJECT,
          properties: {
            sequels: { type: Type.ARRAY, items: { type: Type.STRING } },
            prequels: { type: Type.ARRAY, items: { type: Type.STRING } },
            spin_offs: { type: Type.ARRAY, items: { type: Type.STRING } },
            critical_studies: { type: Type.ARRAY, items: { type: Type.STRING } },
            external_links: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["sequels", "prequels", "spin_offs", "critical_studies", "external_links"]
        },
        tags_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        license_usage: {
          type: Type.OBJECT,
          properties: {
            license_type: { type: Type.STRING },
            attribution_required: { type: Type.BOOLEAN },
            commercial_use: { type: Type.BOOLEAN },
            modification_allowed: { type: Type.BOOLEAN },
            share_alike: { type: Type.BOOLEAN }
          },
          required: ["license_type", "attribution_required", "commercial_use", "modification_allowed", "share_alike"]
        }
      },
      required: [
        "metadata", "basic_info", "literary_classification", "text_statistics",
        "temporal_setting", "geographical_setting", "character_summary", "plot_structure",
        "cultural_context", "awards_recognition", "adaptations", "extraction_metadata",
        "data_quality", "related_resources", "tags_keywords", "license_usage"
      ]
    }
  },
  required: ["novel_metadata"]
};

/**
 * Helper to handle Gemini API errors gracefully
 */
const handleGeminiError = (error: any): never => {
  console.error("Gemini API Error:", error);

  const msg = error.message || '';
  const status = error.status;

  if (msg.includes('429') || status === 429) {
    throw new Error("تم تجاوز حد الطلبات (Rate Limit). يرجى الانتظار قليلاً ثم المحاولة.");
  }
  if (msg.includes('403') || msg.includes('quota') || status === 403) {
    throw new Error("تم تجاوز حصة الاستخدام (Quota Exceeded). يرجى التحقق من مفتاح API.");
  }
  if (msg.includes('503') || status === 503) {
    throw new Error("الخدمة غير متاحة حالياً (Service Unavailable). حاول مرة أخرى لاحقاً.");
  }
  if (msg.includes('API_KEY')) {
     throw new Error("مشكلة في مفتاح API. تحقق من الصلاحيات.");
  }

  throw new Error(`فشل المعالجة: ${msg || "خطأ غير معروف"}`);
};

/**
 * Extracts comprehensive novel metadata from Arabic novel text
 */
export const extractNovelMetadata = async (
  text: string,
  filename: string = "unknown.txt"
): Promise<NovelMetadataResult> => {
  if (!ai) {
    throw new Error("تعذر تهيئة خدمة الذكاء الاصطناعي (API Key missing).");
  }

  const currentDate = new Date().toISOString().split('T')[0];
  
  // Calculate basic text statistics using utility function
  const stats = calculateTextStatistics(text);

  const systemPrompt = `
You are a JSON Extraction Engine specialized in analyzing Arabic novels and literary texts.

${CLASSIFICATION_TAXONOMY}

## TASK-SPECIFIC EXTRACTION INSTRUCTIONS

### General Logic
- Novel ID: Generate a unique ID based on the title (e.g., author-title-01).
- Type Safety: Numeric fields must be integer/number or null. Do NOT put "N/A" or "Unknown" in numeric fields.
- Language: Extract text in standard Arabic unless english_translation is requested.

### Field-Specific Guidance
- Plot Structure: Use the taxonomy definitions to describe the mechanism of the plot, not just the events.
- Conflict: Look for the symbolic meaning. If a character fights a monster, is it man-vs-nature or man-vs-self-psychological? Prioritize the deeper meaning.
- Cultural Context: Do not just list historical facts. Explain how the social-stratification or patriarchal-system pressures the protagonist's choices.
- Emotions: Distinguish between the Atmospheric Mood (e.g., urban-noir) and the character's internal Emotional Arc.
- Text Statistics: Use the provided statistics for total_words, total_characters, etc.

### Pre-computed Statistics (Use these values):
- Filename: "${filename}"
- Total Characters: ${stats.totalCharacters}
- Total Words: ${stats.totalWords}
- Total Sentences: ${stats.totalSentences}
- Total Paragraphs: ${stats.totalParagraphs}
- Estimated Reading Time: ${stats.estimatedReadingTimeMinutes} minutes
- Current Date: ${currentDate}

### Quality Assurance
- Assign a confidence_score (0.0 to 1.0). If the text is a fragment and the ending is missing, lower the score and set completeness accordingly.
- Use null for missing numeric/integer data.
- Use empty strings "" for missing text data.
- Dates must be strings in "YYYY-MM-DD" format if available, otherwise plain text.

## FINAL DIRECTIVE
Act as a "JSON Extraction Engine". Process the input text. Apply the Taxonomy. Output ONLY the valid JSON object matching the schema.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
${systemPrompt}

## ARABIC NOVEL TEXT TO ANALYZE:
"""
${text.substring(0, MAX_TEXT_LENGTH)}
"""

Generate a comprehensive JSON metadata object for this Arabic novel.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: NOVEL_METADATA_SCHEMA,
        temperature: 0.2,
      }
    });

    const jsonStr = response.text;
    if (jsonStr) {
      const result = JSON.parse(jsonStr);
      return result as NovelMetadataResult;
    } else {
      throw new Error("لم يتم استخراج أي بيانات من النموذج.");
    }

  } catch (error: any) {
    handleGeminiError(error);
    throw error; // Unreachable but satisfies TS
  }
};