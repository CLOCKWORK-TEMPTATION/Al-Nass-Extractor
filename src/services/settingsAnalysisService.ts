/**
 * Settings Analysis Service
 * خدمة تحليل الإطار المكاني في الروايات العربية
 */

import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("مفتاح API غير موجود");
  }
  return key;
};

let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: getApiKey() });
} catch (e) {
  console.error("Failed to initialize Gemini Client:", e);
}

/**
 * Setting (Place) Structure
 */
export interface NovelSetting {
  setting_id: string;
  novel_id: string;
  novel_title: string;
  
  basic_info: {
    place_name: string;
    place_name_variants: string[];
    place_type: string;
    location_hierarchy: {
      continent?: string;
      country: string;
      region: string;
      city: string;
      district?: string;
      specific_place?: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
      precision: string;
    };
  };
  
  temporal_context: {
    time_period: {
      era: string;
      decade?: string;
      specific_years?: string[];
      historical_phase: string;
    };
    season_time: {
      season?: string;
      time_of_day_most_featured?: string;
      weather_patterns?: string[];
    };
  };
  
  physical_description: {
    geography: {
      terrain_type: string;
      natural_features: string[];
      built_environment: string;
      landmarks: Array<{
        name: string;
        type: string;
        significance: string;
        description: string;
      }>;
    };
    architecture: {
      dominant_style: string;
      building_materials: string[];
      building_types: string[];
      urban_layout: string;
      typical_features: string[];
    };
    sensory_details: {
      visual: string[];
      auditory: string[];
      olfactory: string[];
      tactile: string[];
      gustatory?: string[];
    };
  };
  
  social_environment: {
    demographics: {
      population_size: string;
      social_composition: string[];
      economic_activities: string[];
      class_distribution: Record<string, number>;
    };
    cultural_practices: {
      daily_routines: string[];
      festivals_celebrations: string[];
      religious_practices: string[];
      social_customs: string[];
    };
    power_structures: {
      authority_figures: string[];
      social_hierarchy: string;
      institutions: string[];
    };
  };
  
  symbolic_significance: {
    themes_represented: string[];
    symbolic_meaning: string;
    character_associations: Array<{
      character_id: string;
      character_name: string;
      relationship_to_place: string;
      emotional_connection: string;
    }>;
    narrative_function: string;
  };
  
  atmosphere_and_mood: {
    primary_mood: string;
    emotional_associations: string[];
    tension_level: number; // 0-1
    safety_comfort_level: number; // 0-1
    descriptive_adjectives: string[];
  };
  
  plot_events_here: Array<{
    event_id: string;
    event_title: string;
    event_type: string;
    significance: string;
  }>;
  
  changes_over_time: Array<{
    time_marker: string;
    type_of_change: string;
    description: string;
    causes: string[];
    impact_on_characters: string;
  }>;
}

/**
 * Extract settings from novel text
 */
export async function extractSettings(
  novelText: string,
  novelId: string,
  novelTitle: string
): Promise<NovelSetting[]> {
  if (!ai) {
    throw new Error("Gemini AI not initialized");
  }

  const segments = sampleTextForSettings(novelText);
  
  const prompt = `أنت خبير في تحليل الروايات العربية. قم باستخراج الأماكن والإطار المكاني من النص التالي.

عنوان الرواية: ${novelTitle}

حدد الأماكن الرئيسية والثانوية. لكل مكان، وفر:
- الاسم والموقع الجغرافي
- السياق الزماني
- الوصف المادي (الجغرافيا، العمارة، التفاصيل الحسية)
- البيئة الاجتماعية (السكان، الثقافة، السلطة)
- الأهمية الرمزية
- الأجواء والمزاج
- الأحداث التي حصلت هناك
- التغيرات عبر الزمن

النص:
${segments}

أخرج البيانات بصيغة JSON كمصفوفة من الأماكن.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              setting_id: { type: Type.STRING },
              novel_id: { type: Type.STRING },
              novel_title: { type: Type.STRING },
              basic_info: { type: Type.OBJECT },
              temporal_context: { type: Type.OBJECT },
              physical_description: { type: Type.OBJECT },
              social_environment: { type: Type.OBJECT },
              symbolic_significance: { type: Type.OBJECT },
              atmosphere_and_mood: { type: Type.OBJECT },
              plot_events_here: { type: Type.ARRAY },
              changes_over_time: { type: Type.ARRAY }
            }
          }
        }
      }
    });

    const settings = JSON.parse(response.text) as NovelSetting[];
    
    // Enrich with IDs
    settings.forEach((setting, index) => {
      if (!setting.setting_id) {
        setting.setting_id = `set_${novelId}_${String(index + 1).padStart(3, '0')}`;
      }
      setting.novel_id = novelId;
      setting.novel_title = novelTitle;
    });

    return settings;

  } catch (error) {
    console.error("Error extracting settings:", error);
    throw error;
  }
}

function sampleTextForSettings(text: string): string {
  const maxLength = 40000;
  if (text.length <= maxLength) {
    return text;
  }

  const segmentSize = Math.floor(maxLength / 2);
  const beginning = text.substring(0, segmentSize);
  const end = text.substring(text.length - segmentSize);

  return `${beginning}\n\n[...]\n\n${end}`;
}

/**
 * Get settings statistics
 */
export function getSettingsStatistics(settings: NovelSetting[]) {
  const typeCount: Record<string, number> = {};
  const moodCount: Record<string, number> = {};
  let totalTension = 0;
  let totalComfort = 0;

  settings.forEach(setting => {
    const type = setting.basic_info.place_type;
    typeCount[type] = (typeCount[type] || 0) + 1;

    const mood = setting.atmosphere_and_mood.primary_mood;
    moodCount[mood] = (moodCount[mood] || 0) + 1;

    totalTension += setting.atmosphere_and_mood.tension_level;
    totalComfort += setting.atmosphere_and_mood.safety_comfort_level;
  });

  return {
    total_settings: settings.length,
    by_type: typeCount,
    by_mood: moodCount,
    avg_tension: totalTension / settings.length,
    avg_comfort: totalComfort / settings.length
  };
}

/**
 * Analyze setting-character relationships
 */
export function analyzeSettingCharacterRelationships(settings: NovelSetting[]) {
  const relationships: Array<{
    setting_name: string;
    character_name: string;
    relationship: string;
    emotional_connection: string;
  }> = [];

  settings.forEach(setting => {
    setting.symbolic_significance.character_associations.forEach(assoc => {
      relationships.push({
        setting_name: setting.basic_info.place_name,
        character_name: assoc.character_name,
        relationship: assoc.relationship_to_place,
        emotional_connection: assoc.emotional_connection
      });
    });
  });

  return relationships;
}
