/**
 * Plot Events Extraction Service
 * خدمة استخراج أحداث الحبكة في الروايات العربية
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
 * Plot Event Structure
 */
export interface PlotEvent {
  plot_event_id: string;
  novel_id: string;
  novel_title: string;
  
  basic_info: {
    event_title: string;
    event_type: string;
    importance_level: 'حاسم' | 'عالي' | 'متوسط' | 'منخفض';
    plot_function: string;
    chapter_location?: string;
    page_range?: string;
  };
  
  temporal_context: {
    story_time: {
      date?: string;
      time_of_day?: string;
      duration?: string;
      weather?: string;
    };
    narrative_time: {
      sequence_order: number;
      narrative_position: string;
      time_treatment: string;
      flashbacks?: string[];
      foreshadowing?: string[];
    };
  };
  
  spatial_context: {
    primary_setting_id?: string;
    primary_setting_name: string;
    specific_location: string;
    spatial_significance: string;
    atmosphere: string;
  };
  
  characters_involved: Array<{
    character_id: string;
    character_name: string;
    role_in_event: string;
    motivation: string;
    emotional_state_before: string;
    emotional_state_during: string;
    emotional_state_after: string;
    actions: string[];
    dialogue_count?: number;
    internal_monologue?: string;
  }>;
  
  plot_mechanics: {
    conflict_type: string[];
    stakes: string;
    obstacles: string[];
    protagonist_goal: string;
    antagonist_goal?: string;
    outcome: string;
    reversals?: string[];
  };
  
  cause_and_effect: {
    preceding_events: string[];
    direct_causes: string[];
    immediate_consequences: string[];
    long_term_consequences: string[];
    ripple_effects?: string[];
  };
  
  emotional_impact: {
    tension_level: number; // 0-1
    emotional_intensity: number; // 0-1
    reader_response_intent: string;
    character_emotional_arcs: Array<{
      character_id: string;
      emotion_shift: string;
    }>;
  };
  
  thematic_significance: {
    themes_explored: string[];
    symbols_introduced?: string[];
    motifs_reinforced?: string[];
    philosophical_questions?: string[];
  };
}

/**
 * Extract plot events from novel text
 */
export async function extractPlotEvents(
  novelText: string,
  novelId: string,
  novelTitle: string
): Promise<PlotEvent[]> {
  if (!ai) {
    throw new Error("Gemini AI not initialized");
  }

  // Sample representative segments for event extraction
  const segments = sampleTextForEvents(novelText);
  
  const prompt = `أنت خبير في تحليل الروايات العربية. قم باستخراج أهم الأحداث في الحبكة من النص التالي.

عنوان الرواية: ${novelTitle}

حدد الأحداث الرئيسية والتحولات الدرامية والذروات. لكل حدث، وفر:
- العنوان والنوع والأهمية
- السياق الزماني والمكاني
- الشخصيات المشاركة وأدوارهم
- ميكانيكيات الحبكة (الصراع، الأهداف، النتائج)
- السبب والنتيجة
- التأثير العاطفي والأهمية الموضوعية

النص:
${segments}

أخرج البيانات بصيغة JSON كمصفوفة من الأحداث.`;

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
              plot_event_id: { type: Type.STRING },
              novel_id: { type: Type.STRING },
              novel_title: { type: Type.STRING },
              basic_info: {
                type: Type.OBJECT,
                properties: {
                  event_title: { type: Type.STRING },
                  event_type: { type: Type.STRING },
                  importance_level: { type: Type.STRING },
                  plot_function: { type: Type.STRING },
                  chapter_location: { type: Type.STRING },
                  page_range: { type: Type.STRING }
                }
              },
              temporal_context: { type: Type.OBJECT },
              spatial_context: { type: Type.OBJECT },
              characters_involved: { type: Type.ARRAY },
              plot_mechanics: { type: Type.OBJECT },
              cause_and_effect: { type: Type.OBJECT },
              emotional_impact: { type: Type.OBJECT },
              thematic_significance: { type: Type.OBJECT }
            }
          }
        }
      }
    });

    const events = JSON.parse(response.text) as PlotEvent[];
    
    // Enrich with IDs
    events.forEach((event, index) => {
      if (!event.plot_event_id) {
        event.plot_event_id = `event_${novelId}_${String(index + 1).padStart(3, '0')}`;
      }
      event.novel_id = novelId;
      event.novel_title = novelTitle;
    });

    return events;

  } catch (error) {
    console.error("Error extracting plot events:", error);
    throw error;
  }
}

/**
 * Sample text for event extraction
 */
function sampleTextForEvents(text: string): string {
  const maxLength = 50000;
  if (text.length <= maxLength) {
    return text;
  }

  // Take beginning, middle, and end
  const segmentSize = Math.floor(maxLength / 3);
  const beginning = text.substring(0, segmentSize);
  const middleStart = Math.floor(text.length / 2) - Math.floor(segmentSize / 2);
  const middle = text.substring(middleStart, middleStart + segmentSize);
  const end = text.substring(text.length - segmentSize);

  return `[البداية]\n${beginning}\n\n[المنتصف]\n${middle}\n\n[النهاية]\n${end}`;
}

/**
 * Analyze event relationships and causality
 */
export function analyzeEventCausality(events: PlotEvent[]): {
  causalChains: Array<{
    chain: string[];
    strength: number;
  }>;
  turningPoints: PlotEvent[];
  climaxEvents: PlotEvent[];
} {
  const turningPoints = events.filter(e => 
    e.basic_info.importance_level === 'حاسم' ||
    e.basic_info.plot_function.includes('نقطة تحول')
  );

  const climaxEvents = events.filter(e =>
    e.basic_info.plot_function.includes('ذروة') ||
    e.emotional_impact.tension_level > 0.8
  );

  // Build causal chains (simplified)
  const causalChains = events
    .filter(e => e.cause_and_effect.preceding_events.length > 0)
    .map(e => ({
      chain: [...e.cause_and_effect.preceding_events, e.basic_info.event_title],
      strength: e.cause_and_effect.direct_causes.length / 5
    }));

  return {
    causalChains,
    turningPoints,
    climaxEvents
  };
}

/**
 * Get event statistics
 */
export function getEventStatistics(events: PlotEvent[]) {
  const typeCount: Record<string, number> = {};
  const importanceCount: Record<string, number> = {};
  let totalTension = 0;
  let totalIntensity = 0;

  events.forEach(event => {
    const type = event.basic_info.event_type;
    typeCount[type] = (typeCount[type] || 0) + 1;

    const importance = event.basic_info.importance_level;
    importanceCount[importance] = (importanceCount[importance] || 0) + 1;

    totalTension += event.emotional_impact.tension_level;
    totalIntensity += event.emotional_impact.emotional_intensity;
  });

  return {
    total_events: events.length,
    by_type: typeCount,
    by_importance: importanceCount,
    avg_tension: totalTension / events.length,
    avg_intensity: totalIntensity / events.length
  };
}
