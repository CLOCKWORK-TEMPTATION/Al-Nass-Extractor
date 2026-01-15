/**
 * Character Analysis Service
 * خدمة تحليل الشخصيات في الروايات العربية
 * 
 * Ported from character_dataset_tools.py
 */

import type { CharacterProfile, DatasetStatistics } from '../schemas/templates';

export interface CharacterDatasetManager {
  characters: CharacterProfile[];
  filePath?: string;
}

/**
 * Character Dataset Manager Class
 * فئة إدارة داتا سيت الشخصيات
 */
export class ArabicCharacterDataset {
  private characters: CharacterProfile[] = [];
  private filePath?: string;

  constructor(filePath?: string) {
    this.filePath = filePath;
    if (filePath) {
      // Load from file if provided
      // Implementation depends on file loading mechanism
    }
  }

  /**
   * Load characters from JSONL format
   * تحميل الشخصيات من ملف JSONL
   */
  async loadFromJsonl(content: string): Promise<void> {
    this.characters = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const character = JSON.parse(line) as CharacterProfile;
        this.characters.push(character);
      } catch (error) {
        console.error('Error parsing character:', error);
      }
    }
    
    console.log(`✓ تم تحميل ${this.characters.length} شخصية`);
  }

  /**
   * Save characters to JSONL format
   * حفظ الشخصيات إلى صيغة JSONL
   */
  saveToJsonl(): string {
    return this.characters
      .map(char => JSON.stringify(char))
      .join('\n');
  }

  /**
   * Add a new character
   * إضافة شخصية جديدة
   */
  addCharacter(character: CharacterProfile): void {
    // Validate required fields
    const requiredFields = [
      'character_profile.basic_info.character_id',
      'character_profile.basic_info.novel_id',
      'character_profile.basic_info.identity.full_name'
    ];
    
    const missing: string[] = [];
    requiredFields.forEach(field => {
      const keys = field.split('.');
      let obj: any = character;
      for (const key of keys) {
        if (!obj || !obj[key]) {
          missing.push(field);
          break;
        }
        obj = obj[key];
      }
    });

    if (missing.length > 0) {
      throw new Error(`الحقول المطلوبة ناقصة: ${missing.join(', ')}`);
    }

    this.characters.push(character);
    console.log(`✓ تمت إضافة الشخصية: ${character.character_profile.basic_info.identity.full_name}`);
  }

  /**
   * Get character by ID
   * الحصول على شخصية بواسطة معرفها
   */
  getCharacterById(charId: string): CharacterProfile | null {
    return this.characters.find(
      char => char.character_profile.basic_info.character_id === charId
    ) || null;
  }

  /**
   * Get all characters from a specific novel
   * الحصول على جميع شخصيات رواية معينة
   */
  getCharactersByNovel(novelId: string): CharacterProfile[] {
    return this.characters.filter(
      char => char.character_profile.basic_info.novel_id === novelId
    );
  }

  /**
   * Validate dataset integrity
   * التحقق من صحة البيانات
   */
  validate(): string[] {
    const errors: string[] = [];
    const seenIds = new Set<string>();

    this.characters.forEach((char, index) => {
      const profile = char.character_profile;
      
      // Check required fields
      if (!profile.basic_info.character_id) {
        errors.push(`الشخصية ${index + 1}: معرف الشخصية مفقود`);
      }
      
      if (!profile.basic_info.novel_id) {
        errors.push(`الشخصية ${index + 1}: معرف الرواية مفقود`);
      }
      
      if (!profile.basic_info.identity.full_name) {
        errors.push(`الشخصية ${index + 1}: الاسم الكامل مفقود`);
      }

      // Check for duplicate IDs
      const charId = profile.basic_info.character_id;
      if (charId) {
        if (seenIds.has(charId)) {
          errors.push(`character_id مكرر: ${charId}`);
        }
        seenIds.add(charId);
      }
    });

    if (errors.length === 0) {
      console.log('✓ جميع البيانات صحيحة');
    } else {
      console.log(`⚠ وُجدت ${errors.length} مشكلة`);
    }

    return errors;
  }

  /**
   * Get dataset statistics
   * الحصول على إحصائيات الداتا سيت
   */
  getStatistics(): DatasetStatistics {
    const genderCount: Record<string, number> = {};
    const roleCount: Record<string, number> = {};
    const socialClassCount: Record<string, number> = {};
    let totalAge = 0;
    let ageCount = 0;

    this.characters.forEach(char => {
      const profile = char.character_profile;

      // Gender distribution
      const gender = profile.demographics.gender;
      genderCount[gender] = (genderCount[gender] || 0) + 1;

      // Role distribution
      const role = profile.role_in_story.primary_role;
      roleCount[role] = (roleCount[role] || 0) + 1;

      // Social class distribution
      const socialClass = profile.demographics.social_class;
      socialClassCount[socialClass] = (socialClassCount[socialClass] || 0) + 1;

      // Average age
      if (profile.demographics.age.at_story_start) {
        totalAge += profile.demographics.age.at_story_start;
        ageCount++;
      }
    });

    const avgAge = ageCount > 0 ? totalAge / ageCount : 0;

    // Get unique novels
    const novels = new Set(
      this.characters.map(c => c.character_profile.basic_info.novel_id)
    );

    return {
      total_novels: novels.size,
      total_characters: this.characters.length,
      total_dialogues: 0, // Will be filled by dialogue service
      total_events: 0,
      total_settings: 0,
      
      character_stats: {
        by_gender: genderCount,
        by_role: roleCount,
        by_social_class: socialClassCount,
        avg_age: avgAge,
      },
      
      dialogue_stats: {
        by_type: {},
        by_emotion: {},
        avg_exchanges_per_dialogue: 0,
        total_words: 0,
      },
      
      linguistic_stats: {
        dialects_represented: [],
        language_registers: {},
        code_switching_instances: 0,
      },
      
      cultural_elements: {
        by_category: {},
        by_region: {},
        time_periods: [],
      },
    };
  }

  /**
   * Filter characters by criteria
   * تصفية الشخصيات حسب معايير محددة
   */
  filterCharacters(criteria: {
    gender?: string;
    role?: string;
    minAge?: number;
    maxAge?: number;
    socialClass?: string;
    novelId?: string;
  }): CharacterProfile[] {
    return this.characters.filter(char => {
      const profile = char.character_profile;
      
      if (criteria.gender && profile.demographics.gender !== criteria.gender) {
        return false;
      }
      
      if (criteria.role && profile.role_in_story.primary_role !== criteria.role) {
        return false;
      }
      
      if (criteria.minAge && profile.demographics.age.at_story_start < criteria.minAge) {
        return false;
      }
      
      if (criteria.maxAge && profile.demographics.age.at_story_start > criteria.maxAge) {
        return false;
      }
      
      if (criteria.socialClass && profile.demographics.social_class !== criteria.socialClass) {
        return false;
      }
      
      if (criteria.novelId && profile.basic_info.novel_id !== criteria.novelId) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Search characters by name
   * البحث عن شخصيات بالاسم
   */
  searchByName(query: string): CharacterProfile[] {
    const lowerQuery = query.toLowerCase();
    return this.characters.filter(char => {
      const profile = char.character_profile;
      const fullName = profile.basic_info.identity.full_name.toLowerCase();
      const firstName = profile.basic_info.identity.first_name.toLowerCase();
      const lastName = profile.basic_info.identity.last_name.toLowerCase();
      
      return fullName.includes(lowerQuery) || 
             firstName.includes(lowerQuery) || 
             lastName.includes(lowerQuery);
    });
  }

  /**
   * Get character relationships
   * الحصول على علاقات الشخصية
   */
  getCharacterRelationships(charId: string): Array<{
    character_id: string;
    character_name: string;
    relationship_type: string;
    relationship_quality: number;
  }> {
    const character = this.getCharacterById(charId);
    if (!character) {
      return [];
    }

    return character.character_profile.relationships || [];
  }

  /**
   * Export to CSV format
   * التصدير إلى صيغة CSV
   */
  exportToCSV(): string {
    if (this.characters.length === 0) {
      return '';
    }

    const headers = [
      'character_id',
      'novel_id',
      'full_name',
      'age',
      'gender',
      'occupation',
      'role',
      'primary_traits'
    ];

    const rows = this.characters.map(char => {
      const profile = char.character_profile;
      const traits = profile.personality.primary_traits
        .map(t => t.trait)
        .join('; ');

      return [
        profile.basic_info.character_id,
        profile.basic_info.novel_id,
        profile.basic_info.identity.full_name,
        profile.demographics.age.at_story_start,
        profile.demographics.gender,
        profile.demographics.occupation,
        profile.role_in_story.primary_role,
        traits
      ].map(cell => `"${cell}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get all characters
   */
  getAllCharacters(): CharacterProfile[] {
    return [...this.characters];
  }

  /**
   * Clear all characters
   */
  clear(): void {
    this.characters = [];
  }

  /**
   * Get character count
   */
  getCount(): number {
    return this.characters.length;
  }
}

/**
 * Utility Functions
 */

/**
 * Merge multiple character datasets
 * دمج عدة داتا سيتات للشخصيات
 */
export function mergeCharacterDatasets(
  datasets: ArabicCharacterDataset[]
): ArabicCharacterDataset {
  const merged = new ArabicCharacterDataset();
  
  datasets.forEach(dataset => {
    dataset.getAllCharacters().forEach(char => {
      try {
        merged.addCharacter(char);
      } catch (error) {
        console.warn('تخطي شخصية مكررة:', char.character_profile.basic_info.character_id);
      }
    });
  });

  return merged;
}

/**
 * Compare two characters
 * مقارنة شخصيتين
 */
export function compareCharacters(
  char1: CharacterProfile,
  char2: CharacterProfile
): {
  similarities: string[];
  differences: string[];
} {
  const similarities: string[] = [];
  const differences: string[] = [];

  const profile1 = char1.character_profile;
  const profile2 = char2.character_profile;

  // Compare demographics
  if (profile1.demographics.gender === profile2.demographics.gender) {
    similarities.push(`نفس الجنس: ${profile1.demographics.gender}`);
  } else {
    differences.push(`جنس مختلف: ${profile1.demographics.gender} vs ${profile2.demographics.gender}`);
  }

  if (profile1.role_in_story.primary_role === profile2.role_in_story.primary_role) {
    similarities.push(`نفس الدور: ${profile1.role_in_story.primary_role}`);
  } else {
    differences.push(`دور مختلف: ${profile1.role_in_story.primary_role} vs ${profile2.role_in_story.primary_role}`);
  }

  // Compare traits
  const traits1 = new Set(profile1.personality.primary_traits.map(t => t.trait));
  const traits2 = new Set(profile2.personality.primary_traits.map(t => t.trait));
  
  const commonTraits = [...traits1].filter(t => traits2.has(t));
  if (commonTraits.length > 0) {
    similarities.push(`صفات مشتركة: ${commonTraits.join(', ')}`);
  }

  return { similarities, differences };
}
