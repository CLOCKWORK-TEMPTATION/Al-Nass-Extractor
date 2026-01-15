/**
 * JSON Templates and Schemas for Novel Dataset
 * تمبلتات وأنماط البيانات للرواية العربية
 */

/**
 * Character Profile Template
 * تمبلت ملف الشخصية الشامل
 */
export interface CharacterProfile {
  character_profile: {
    metadata: {
      dataset_version: string;
      language: string;
      last_updated: string;
      schema_type: string;
    };
    
    basic_info: {
      character_id: string;
      novel_id: string;
      novel_title: string;
      
      identity: {
        full_name: string;
        first_name: string;
        middle_name?: string;
        last_name: string;
        aliases: Array<{
          name: string;
          type: string;
          frequency: 'عالية' | 'متوسطة' | 'منخفضة';
        }>;
      };
    };
    
    demographics: {
      age: {
        at_story_start: number;
        at_story_end?: number;
      };
      gender: 'ذكر' | 'أنثى' | 'غير محدد';
      nationality: string;
      residence: string;
      social_class: string;
      occupation: string;
      education: string;
    };
    
    physical_appearance: {
      height?: string;
      build?: string;
      eye_color?: string;
      hair_color?: string;
      distinctive_features: string[];
      typical_attire: string;
    };
    
    personality: {
      primary_traits: Array<{
        trait: string;
        intensity: number; // 0-1
      }>;
      strengths: string[];
      weaknesses: string[];
      values: string[];
      fears: string[];
      motivations: string[];
      internal_conflicts: string[];
    };
    
    relationships: Array<{
      character_id: string;
      character_name: string;
      relationship_type: string;
      relationship_quality: number; // -1 to 1
      evolution: string;
      key_moments: string[];
    }>;
    
    character_arc: {
      starting_state: string;
      key_turning_points: Array<{
        chapter?: string;
        event: string;
        impact: string;
      }>;
      ending_state: string;
      transformation_type: string;
    };
    
    dialogue_patterns: {
      speaking_style: string;
      common_phrases: string[];
      speech_quirks: string[];
      language_register: 'فصحى' | 'عامية' | 'مزيج';
      dialect?: string;
      emotional_tendencies: Array<{
        emotion: string;
        frequency: number;
      }>;
    };
    
    role_in_story: {
      primary_role: 'بطل' | 'بطلة' | 'شخصية ثانوية' | 'خصم' | 'مساعد';
      importance_score: number; // 0-1
      scenes_appeared: number;
      words_spoken: number;
      impact_on_plot: string;
    };
  };
}

/**
 * Novel Metadata Template
 * تمبلت البيانات الوصفية للرواية
 */
export interface NovelMetadata {
  novel_metadata: {
    metadata: {
      dataset_version: string;
      language: string;
      created_date: string;
      last_updated: string;
      schema_type: string;
    };
    
    basic_info: {
      novel_id: string;
      title: {
        primary: string;
        alternative_titles: string[];
        transliteration?: string;
      };
      author: {
        name: string;
        birth_year?: number;
        nationality: string;
        biography_brief?: string;
      };
      publication: {
        first_publication_year: number;
        publisher?: string;
        edition?: string;
        isbn?: string;
      };
      structure: {
        total_chapters: number;
        total_pages?: number;
        total_words?: number;
        narrative_structure: string;
      };
    };
    
    classification: {
      primary_genre: string;
      sub_genres: string[];
      themes: string[];
      literary_period: string;
      literary_movement?: string;
      target_audience: string;
    };
    
    setting: {
      time_period: {
        historical_era: string;
        specific_years?: string;
        duration_in_story?: string;
      };
      locations: Array<{
        name: string;
        type: string;
        importance: 'رئيسي' | 'ثانوي';
        description: string;
      }>;
      cultural_context: string;
    };
    
    characters: {
      main_characters: Array<{
        character_id: string;
        name: string;
        role: string;
      }>;
      supporting_characters: Array<{
        character_id: string;
        name: string;
        role: string;
      }>;
      total_named_characters: number;
    };
    
    plot_structure: {
      exposition: string;
      rising_action: string[];
      climax: string;
      falling_action: string[];
      resolution: string;
      major_conflicts: string[];
      plot_twists?: string[];
    };
    
    narrative_elements: {
      point_of_view: string;
      narrative_voice: string;
      narrative_techniques: string[];
      temporal_structure: string;
      flashbacks_count?: number;
      foreshadowing_instances?: string[];
    };
    
    language_style: {
      register: 'فصحى' | 'عامية' | 'مزيج';
      dialects_used: string[];
      literary_devices: string[];
      symbolism?: Array<{
        symbol: string;
        meaning: string;
      }>;
      tone: string;
      style_characteristics: string[];
    };
    
    cultural_significance: {
      historical_context: string;
      social_commentary: string[];
      cultural_impact: string;
      controversies?: string[];
      awards_received?: string[];
    };
  };
}

/**
 * Dialogue Dataset Entry
 * بنية بيانات الحوار
 */
export interface DialogueEntry {
  dialogue_id: string;
  novel_id: string;
  chapter?: string;
  scene_context: string;
  
  type: 'conversation' | 'monologue' | 'internal_thought';
  setting: string;
  participants: string[];
  
  exchanges: Array<{
    speaker: string;
    text: string;
    emotion?: string;
    intensity?: number;
    action_description?: string;
    language_register?: string;
    dialect?: string;
    subtext?: string;
  }>;
  
  analysis: {
    total_exchanges: number;
    dominant_emotion: string;
    relationship_dynamic: string;
    conflict_level: number;
    purpose: string;
    outcomes?: string[];
  };
  
  linguistic_features: {
    code_switching?: boolean;
    formality_level: number;
    politeness_markers: string[];
    rhetorical_devices: string[];
  };
}

/**
 * Cultural Context Entry
 * بنية السياق الثقافي
 */
export interface CulturalContextEntry {
  context_id: string;
  novel_id: string;
  
  category: 'tradition' | 'religion' | 'social_norm' | 'historical_event' | 'language' | 'custom';
  
  element: {
    name: string;
    description: string;
    significance: string;
    references_in_text: string[];
  };
  
  cultural_details: {
    origin: string;
    time_period?: string;
    geographic_region: string;
    social_class_association?: string;
    religious_significance?: string;
  };
  
  impact_on_narrative: {
    plot_relevance: number; // 0-1
    character_development: string[];
    thematic_connection: string;
    symbolism?: string;
  };
  
  modern_relevance: {
    still_practiced: boolean;
    evolution: string;
    contemporary_interpretation?: string;
  };
}

/**
 * Plot Event Entry
 * بنية أحداث الحبكة
 */
export interface PlotEventEntry {
  event_id: string;
  novel_id: string;
  
  basic_info: {
    title: string;
    chapter?: string;
    sequence_number: number;
    description: string;
  };
  
  event_details: {
    type: 'action' | 'revelation' | 'decision' | 'encounter' | 'conflict' | 'resolution';
    importance: 'حاسم' | 'مهم' | 'ثانوي';
    participants: string[];
    location: string;
    time_context?: string;
  };
  
  narrative_function: {
    plot_progression: string;
    character_development: Array<{
      character_id: string;
      impact: string;
    }>;
    foreshadowing?: string;
    callback_to_event_id?: string;
  };
  
  consequences: {
    immediate: string[];
    long_term: string[];
    affects_characters: string[];
    affects_relationships: Array<{
      character_1: string;
      character_2: string;
      change: string;
    }>;
  };
}

/**
 * Setting Entry
 * بنية الأماكن والبيئات
 */
export interface SettingEntry {
  setting_id: string;
  novel_id: string;
  
  basic_info: {
    name: string;
    type: 'city' | 'neighborhood' | 'building' | 'room' | 'natural' | 'landmark';
    importance: 'رئيسي' | 'ثانوي';
  };
  
  physical_description: {
    location: string;
    architecture?: string;
    appearance: string;
    atmosphere: string;
    sensory_details: {
      visual: string[];
      auditory?: string[];
      olfactory?: string[];
      tactile?: string[];
    };
  };
  
  temporal_context: {
    time_period: string;
    season?: string;
    time_of_day_typical?: string;
    historical_era: string;
  };
  
  social_environment: {
    social_class: string;
    typical_inhabitants: string[];
    social_norms: string[];
    power_dynamics?: string;
  };
  
  cultural_significance: {
    cultural_meaning: string;
    religious_significance?: string;
    historical_importance?: string;
    symbolic_value?: string;
  };
  
  narrative_function: {
    scenes_set_here: number;
    key_events: string[];
    character_associations: Array<{
      character_id: string;
      relationship_to_place: string;
    }>;
    mood_contribution: string;
  };
}

/**
 * Training Task Template
 * تمبلت مهام التدريب
 */
export interface TrainingTask {
  task_id: string;
  task_type: 'text_generation' | 'question_answering' | 'classification' | 'summarization' | 'analysis';
  category: string;
  
  input: Record<string, any>;
  prompt: string;
  target_output: string;
  
  evaluation_metrics: string[];
  difficulty_level?: 'سهل' | 'متوسط' | 'صعب';
  
  metadata?: {
    source_novel?: string;
    related_characters?: string[];
    skills_tested?: string[];
  };
}

/**
 * Dataset Statistics
 * إحصائيات الداتا سيت
 */
export interface DatasetStatistics {
  total_novels: number;
  total_characters: number;
  total_dialogues: number;
  total_events: number;
  total_settings: number;
  
  character_stats: {
    by_gender: Record<string, number>;
    by_role: Record<string, number>;
    by_social_class: Record<string, number>;
    avg_age: number;
  };
  
  dialogue_stats: {
    by_type: Record<string, number>;
    by_emotion: Record<string, number>;
    avg_exchanges_per_dialogue: number;
    total_words: number;
  };
  
  linguistic_stats: {
    dialects_represented: string[];
    language_registers: Record<string, number>;
    code_switching_instances: number;
  };
  
  cultural_elements: {
    by_category: Record<string, number>;
    by_region: Record<string, number>;
    time_periods: string[];
  };
}

/**
 * Export Format Options
 * خيارات التصدير
 */
export type ExportFormat = 'json' | 'jsonl' | 'csv' | 'parquet' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  include_metadata: boolean;
  filter?: {
    novel_id?: string;
    character_ids?: string[];
    date_range?: { start: string; end: string };
  };
  fields?: string[]; // للتصدير الانتقائي
}
