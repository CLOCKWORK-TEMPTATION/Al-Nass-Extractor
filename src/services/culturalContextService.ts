/**
 * Cultural Context Analysis Service
 * خدمة تحليل السياق الثقافي في الروايات العربية
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
 * Cultural Context Structure
 */
export interface CulturalContext {
  cultural_context_id: string;
  novel_id: string;
  novel_title: string;
  characters_affected: string[];
  settings_affected: string[];
  
  historical_period: {
    era: string;
    specific_period: string;
    years: string[];
    historical_phase: string;
    description: string;
  };
  
  major_historical_events: Array<{
    event: string;
    year: number;
    impact_on_novel: 'عالي' | 'متوسط' | 'منخفض';
    description: string;
    character_reactions?: Array<{
      character_id: string;
      reaction: string;
    }>;
    consequences?: string[];
    narrative_role?: string;
  }>;
  
  political_context: {
    regime_type: string;
    ruling_party?: string;
    key_political_forces: Array<{
      force: string;
      ideology: string;
      influence: string;
      representation_in_novel: string;
    }>;
    freedom_level: string;
    censorship?: string;
    political_atmosphere: string;
  };
  
  economic_context: {
    economic_system: string;
    dominant_sectors: string[];
    class_structure: {
      upper_class: {
        composition: string;
        percentage: number;
        wealth_control: number;
        lifestyle: string;
        representation: string;
      };
      middle_class: {
        composition: string;
        percentage: number;
        wealth_control: number;
        lifestyle: string;
        representation: string;
      };
      lower_class: {
        composition: string;
        percentage: number;
        wealth_control: number;
        lifestyle: string;
        representation: string;
      };
    };
    economic_challenges: string[];
    economic_opportunities?: string[];
  };
  
  social_structure: {
    family_systems: {
      dominant_model: string;
      gender_roles: {
        male_role: string;
        female_role: string;
        flexibility: string;
      };
      marriage_practices: string[];
      inheritance_customs: string[];
    };
    social_stratification: {
      basis: string[];
      mobility: string;
      barriers: string[];
    };
    honor_shame_dynamics: {
      honor_sources: string[];
      shame_triggers: string[];
      consequences_of_dishonor: string[];
    };
  };
  
  religious_context: {
    dominant_religion: string;
    religious_diversity: Array<{
      religion: string;
      percentage: number;
      representation: string;
    }>;
    religious_practices: {
      daily_rituals: string[];
      festivals: string[];
      pilgrimages?: string[];
    };
    religion_and_state: string;
    secularism_vs_religiosity: string;
  };
  
  cultural_values: {
    core_values: Array<{
      value: string;
      importance: 'عالي' | 'متوسط' | 'منخفض';
      manifestation_in_novel: string;
    }>;
    generational_differences: {
      older_generation: string[];
      younger_generation: string[];
      areas_of_conflict: string[];
    };
    tradition_vs_modernity: {
      traditional_elements: string[];
      modern_elements: string[];
      tension_points: string[];
      synthesis_attempts?: string[];
    };
  };
  
  language_and_identity: {
    linguistic_landscape: {
      standard_arabic_use: string;
      dialectical_variations: string[];
      code_switching_patterns: string;
      foreign_language_presence?: string;
    };
    identity_markers: {
      national_identity: string;
      regional_identity: string;
      religious_identity: string;
      class_identity: string;
      generational_identity: string;
    };
  };
  
  education_and_literacy: {
    literacy_rate: string;
    education_system: string;
    education_access: {
      by_gender: string;
      by_class: string;
      by_location: string;
    };
    intellectual_climate: string;
    knowledge_transmission: string[];
  };
  
  cultural_practices: {
    daily_life: {
      typical_routines: string[];
      food_culture: string[];
      dress_codes: string[];
      social_gatherings: string[];
    };
    celebrations: Array<{
      occasion: string;
      type: string;
      practices: string[];
      significance: string;
    }>;
    arts_and_entertainment: {
      popular_forms: string[];
      traditional_arts: string[];
      modern_influences: string[];
    };
  };
  
  gender_dynamics: {
    women_status: {
      legal_rights: string;
      social_expectations: string[];
      restrictions: string[];
      opportunities: string[];
    };
    men_status: {
      social_expectations: string[];
      privileges: string[];
      pressures: string[];
    };
    gender_segregation: string;
    feminist_movements?: string;
  };
}

/**
 * Extract cultural context from novel text
 */
export async function extractCulturalContext(
  novelText: string,
  novelId: string,
  novelTitle: string
): Promise<CulturalContext> {
  if (!ai) {
    throw new Error("Gemini AI not initialized");
  }

  const segments = sampleTextForCulture(novelText);
  
  const prompt = `أنت خبير في تحليل السياق الثقافي والتاريخي للروايات العربية. قم بتحليل النص التالي واستخراج السياق الثقافي الشامل.

عنوان الرواية: ${novelTitle}

حلل وحدد:
- الفترة التاريخية والأحداث الكبرى
- السياق السياسي والاقتصادي
- البنية الاجتماعية والعائلية
- السياق الديني
- القيم الثقافية
- اللغة والهوية
- التعليم والمعرفة
- الممارسات الثقافية
- ديناميكيات النوع الاجتماعي

النص:
${segments}

أخرج البيانات بصيغة JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cultural_context_id: { type: Type.STRING },
            novel_id: { type: Type.STRING },
            novel_title: { type: Type.STRING },
            characters_affected: { type: Type.ARRAY, items: { type: Type.STRING } },
            settings_affected: { type: Type.ARRAY, items: { type: Type.STRING } },
            historical_period: { type: Type.OBJECT },
            major_historical_events: { type: Type.ARRAY },
            political_context: { type: Type.OBJECT },
            economic_context: { type: Type.OBJECT },
            social_structure: { type: Type.OBJECT },
            religious_context: { type: Type.OBJECT },
            cultural_values: { type: Type.OBJECT },
            language_and_identity: { type: Type.OBJECT },
            education_and_literacy: { type: Type.OBJECT },
            cultural_practices: { type: Type.OBJECT },
            gender_dynamics: { type: Type.OBJECT }
          }
        }
      }
    });

    const context = JSON.parse(response.text) as CulturalContext;
    
    // Enrich with IDs
    if (!context.cultural_context_id) {
      context.cultural_context_id = `cc_${novelId}_001`;
    }
    context.novel_id = novelId;
    context.novel_title = novelTitle;

    return context;

  } catch (error) {
    console.error("Error extracting cultural context:", error);
    throw error;
  }
}

function sampleTextForCulture(text: string): string {
  const maxLength = 60000;
  if (text.length <= maxLength) {
    return text;
  }

  // Take broader samples for cultural analysis
  const segmentSize = Math.floor(maxLength / 4);
  const seg1 = text.substring(0, segmentSize);
  const seg2Start = Math.floor(text.length / 3);
  const seg2 = text.substring(seg2Start, seg2Start + segmentSize);
  const seg3Start = Math.floor(2 * text.length / 3);
  const seg3 = text.substring(seg3Start, seg3Start + segmentSize);
  const seg4 = text.substring(text.length - segmentSize);

  return `${seg1}\n\n[...]\n\n${seg2}\n\n[...]\n\n${seg3}\n\n[...]\n\n${seg4}`;
}

/**
 * Analyze cultural conflicts in the novel
 */
export function analyzeCulturalConflicts(context: CulturalContext): {
  tradition_modernity: string[];
  generational: string[];
  gender: string[];
  class: string[];
  religious: string[];
} {
  return {
    tradition_modernity: context.cultural_values.tradition_vs_modernity.tension_points,
    generational: context.cultural_values.generational_differences.areas_of_conflict,
    gender: [
      ...context.gender_dynamics.women_status.restrictions,
      `توقعات المجتمع من الرجال: ${context.gender_dynamics.men_status.social_expectations.join(', ')}`
    ],
    class: context.economic_context.economic_challenges,
    religious: context.religious_context.secularism_vs_religiosity ? 
      [context.religious_context.secularism_vs_religiosity] : []
  };
}

/**
 * Get cultural themes
 */
export function getCulturalThemes(context: CulturalContext): string[] {
  const themes: string[] = [];
  
  // Core values
  context.cultural_values.core_values.forEach(v => {
    if (v.importance === 'عالي') {
      themes.push(v.value);
    }
  });
  
  // Tradition vs modernity
  if (context.cultural_values.tradition_vs_modernity.tension_points.length > 0) {
    themes.push('صراع التقاليد والحداثة');
  }
  
  // Gender dynamics
  if (context.gender_dynamics.women_status.restrictions.length > 0) {
    themes.push('قضايا المرأة والنوع الاجتماعي');
  }
  
  // Political context
  if (context.political_context.freedom_level.includes('محدود')) {
    themes.push('القمع السياسي');
  }
  
  return themes;
}
