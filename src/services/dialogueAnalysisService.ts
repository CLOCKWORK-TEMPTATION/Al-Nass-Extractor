/**
 * Dialogue Analysis Service
 * خدمة تحليل الحوارات في الروايات العربية
 * 
 * Ported from dialogue_analyzer.py
 */

import type { DialogueEntry } from '../schemas/templates';

/**
 * Character Speech Statistics
 * إحصائيات كلام الشخصية
 */
export interface CharacterSpeechStats {
  character_id: string;
  total_dialogues_participated: number;
  total_lines_spoken: number;
  total_words_spoken: number;
  avg_words_per_line: number;
  emotion_distribution: Record<string, number>;
  language_distribution: Record<string, number>;
  avg_emotional_intensity: number;
  most_common_emotion: string;
  speech_patterns: string[];
}

/**
 * Relationship Analysis from Dialogues
 * تحليل العلاقة بين شخصيتين من الحوارات
 */
export interface RelationshipAnalysis {
  character_1: string;
  character_2: string;
  total_shared_dialogues: number;
  total_exchanges: number;
  dominant_emotions: string[];
  relationship_quality_score: number; // -1 to 1
  conflict_level: number; // 0 to 1
  formality_level: number; // 0 to 1
  power_dynamic: 'متوازن' | 'غير متوازن';
  interaction_patterns: string[];
  notable_exchanges: Array<{
    dialogue_id: string;
    context: string;
    significance: string;
  }>;
}

/**
 * Dialogue Dataset Manager
 * مدير داتا سيت الحوارات
 */
export class ArabicDialogueAnalyzer {
  private dialogues: DialogueEntry[] = [];

  constructor(dialogues?: DialogueEntry[]) {
    if (dialogues) {
      this.dialogues = dialogues;
    }
  }

  /**
   * Load dialogues from JSONL content
   * تحميل الحوارات من محتوى JSONL
   */
  loadDialogues(content: string): void {
    this.dialogues = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const dialogue = JSON.parse(line) as DialogueEntry;
        this.dialogues.push(dialogue);
      } catch (error) {
        console.error('Error parsing dialogue:', error);
      }
    }
    
    console.log(`✓ تم تحميل ${this.dialogues.length} حوار`);
  }

  /**
   * Get character speech statistics
   * احصائيات الكلام لشخصية معينة
   */
  getCharacterSpeechStats(characterId: string): CharacterSpeechStats {
    let totalLines = 0;
    let totalWords = 0;
    const emotions: string[] = [];
    const languages: string[] = [];
    const intensities: number[] = [];
    const speechPatterns = new Set<string>();

    for (const dialogue of this.dialogues) {
      if (!dialogue.participants.includes(characterId)) {
        continue;
      }

      for (const exchange of dialogue.exchanges) {
        if (exchange.speaker === characterId) {
          totalLines++;
          const text = exchange.text || '';
          totalWords += text.split(/\s+/).filter(w => w.length > 0).length;

          if (exchange.emotion) {
            emotions.push(exchange.emotion);
          }
          if (exchange.language_register) {
            languages.push(exchange.language_register);
          }
          if (exchange.intensity !== undefined) {
            intensities.push(exchange.intensity);
          }

          // Detect speech patterns
          if (text.includes('؟')) speechPatterns.add('يطرح أسئلة');
          if (text.includes('!')) speechPatterns.add('انفعالي');
          if (text.length > 200) speechPatterns.add('إسهاب');
          if (text.length < 20) speechPatterns.add('إيجاز');
        }
      }
    }

    const emotionDist = this.countOccurrences(emotions);
    const languageDist = this.countOccurrences(languages);
    const avgIntensity = intensities.length > 0
      ? intensities.reduce((a, b) => a + b, 0) / intensities.length
      : 0;

    // Find most common emotion
    const mostCommonEmotion = Object.entries(emotionDist)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'غير محدد';

    return {
      character_id: characterId,
      total_dialogues_participated: this.dialogues.filter(d =>
        d.participants.includes(characterId)
      ).length,
      total_lines_spoken: totalLines,
      total_words_spoken: totalWords,
      avg_words_per_line: totalLines > 0 ? totalWords / totalLines : 0,
      emotion_distribution: emotionDist,
      language_distribution: languageDist,
      avg_emotional_intensity: avgIntensity,
      most_common_emotion: mostCommonEmotion,
      speech_patterns: Array.from(speechPatterns),
    };
  }

  /**
   * Analyze relationship between two characters
   * تحليل العلاقة بين شخصيتين من خلال حواراتهما
   */
  analyzeRelationshipFromDialogues(
    char1Id: string,
    char2Id: string
  ): RelationshipAnalysis {
    const sharedDialogues = this.dialogues.filter(d =>
      d.participants.includes(char1Id) && d.participants.includes(char2Id)
    );

    if (sharedDialogues.length === 0) {
      return {
        character_1: char1Id,
        character_2: char2Id,
        total_shared_dialogues: 0,
        total_exchanges: 0,
        dominant_emotions: [],
        relationship_quality_score: 0,
        conflict_level: 0,
        formality_level: 0.5,
        power_dynamic: 'متوازن',
        interaction_patterns: ['لا توجد حوارات مشتركة'],
        notable_exchanges: [],
      };
    }

    let totalExchanges = 0;
    const emotions: string[] = [];
    let totalIntensity = 0;
    let intensityCount = 0;
    let formalitySum = 0;
    let formalityCount = 0;
    const char1Lines: number[] = [];
    const char2Lines: number[] = [];

    for (const dialogue of sharedDialogues) {
      let char1Count = 0;
      let char2Count = 0;

      for (const exchange of dialogue.exchanges) {
        if (exchange.speaker === char1Id || exchange.speaker === char2Id) {
          totalExchanges++;

          if (exchange.speaker === char1Id) char1Count++;
          if (exchange.speaker === char2Id) char2Count++;

          if (exchange.emotion) {
            emotions.push(exchange.emotion);
          }

          if (exchange.intensity !== undefined) {
            totalIntensity += exchange.intensity;
            intensityCount++;
          }

          // Estimate formality from language register
          if (exchange.language_register === 'فصحى') {
            formalitySum += 1;
            formalityCount++;
          } else if (exchange.language_register === 'عامية') {
            formalitySum += 0;
            formalityCount++;
          } else {
            formalitySum += 0.5;
            formalityCount++;
          }
        }
      }

      char1Lines.push(char1Count);
      char2Lines.push(char2Count);
    }

    // Calculate metrics
    const emotionCounts = this.countOccurrences(emotions);
    const dominantEmotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);

    const avgIntensity = intensityCount > 0 ? totalIntensity / intensityCount : 0.5;
    const conflictLevel = this.calculateConflictLevel(emotions, avgIntensity);
    const relationshipQuality = this.calculateRelationshipQuality(emotions);
    const formalityLevel = formalityCount > 0 ? formalitySum / formalityCount : 0.5;

    // Power dynamic analysis
    const char1Avg = char1Lines.reduce((a, b) => a + b, 0) / char1Lines.length;
    const char2Avg = char2Lines.reduce((a, b) => a + b, 0) / char2Lines.length;
    const powerDynamic = Math.abs(char1Avg - char2Avg) > 2 ? 'غير متوازن' : 'متوازن';

    // Interaction patterns
    const patterns: string[] = [];
    if (conflictLevel > 0.6) patterns.push('علاقة صراعية');
    if (conflictLevel < 0.3) patterns.push('علاقة ودية');
    if (formalityLevel > 0.7) patterns.push('تواصل رسمي');
    if (formalityLevel < 0.3) patterns.push('تواصل غير رسمي');
    if (totalExchanges > 50) patterns.push('تواصل مكثف');

    return {
      character_1: char1Id,
      character_2: char2Id,
      total_shared_dialogues: sharedDialogues.length,
      total_exchanges: totalExchanges,
      dominant_emotions: dominantEmotions,
      relationship_quality_score: relationshipQuality,
      conflict_level: conflictLevel,
      formality_level: formalityLevel,
      power_dynamic: powerDynamic,
      interaction_patterns: patterns,
      notable_exchanges: [], // Could be enhanced to find key moments
    };
  }

  /**
   * Get dialogue statistics
   * الحصول على إحصائيات الحوارات
   */
  getDialogueStatistics() {
    const typeCount: Record<string, number> = {};
    const emotionCount: Record<string, number> = {};
    let totalExchanges = 0;
    let totalWords = 0;

    for (const dialogue of this.dialogues) {
      // Type distribution
      const type = dialogue.type;
      typeCount[type] = (typeCount[type] || 0) + 1;

      // Count exchanges and words
      for (const exchange of dialogue.exchanges) {
        totalExchanges++;
        const text = exchange.text || '';
        totalWords += text.split(/\s+/).filter(w => w.length > 0).length;

        if (exchange.emotion) {
          emotionCount[exchange.emotion] = (emotionCount[exchange.emotion] || 0) + 1;
        }
      }
    }

    return {
      total_dialogues: this.dialogues.length,
      by_type: typeCount,
      by_emotion: emotionCount,
      total_exchanges: totalExchanges,
      total_words: totalWords,
      avg_exchanges_per_dialogue: totalExchanges / (this.dialogues.length || 1),
      avg_words_per_exchange: totalWords / (totalExchanges || 1),
    };
  }

  /**
   * Find dialogues by emotion
   * البحث عن حوارات حسب المشاعر
   */
  findDialoguesByEmotion(emotion: string): DialogueEntry[] {
    return this.dialogues.filter(dialogue => {
      return dialogue.exchanges.some(exchange => exchange.emotion === emotion);
    });
  }

  /**
   * Find dialogues by type
   * البحث عن حوارات حسب النوع
   */
  findDialoguesByType(type: 'conversation' | 'monologue' | 'internal_thought'): DialogueEntry[] {
    return this.dialogues.filter(dialogue => dialogue.type === type);
  }

  /**
   * Get all dialogues for a specific character
   * الحصول على جميع حوارات شخصية معينة
   */
  getCharacterDialogues(characterId: string): DialogueEntry[] {
    return this.dialogues.filter(dialogue =>
      dialogue.participants.includes(characterId)
    );
  }

  /**
   * Extract dialogue text for a character
   * استخراج نص الحوار لشخصية معينة
   */
  extractCharacterLines(characterId: string): Array<{
    dialogue_id: string;
    text: string;
    emotion?: string;
    context: string;
  }> {
    const lines: Array<{
      dialogue_id: string;
      text: string;
      emotion?: string;
      context: string;
    }> = [];

    for (const dialogue of this.dialogues) {
      if (!dialogue.participants.includes(characterId)) {
        continue;
      }

      for (const exchange of dialogue.exchanges) {
        if (exchange.speaker === characterId) {
          lines.push({
            dialogue_id: dialogue.dialogue_id,
            text: exchange.text,
            emotion: exchange.emotion,
            context: dialogue.scene_context,
          });
        }
      }
    }

    return lines;
  }

  /**
   * Export to CSV format
   * التصدير إلى صيغة CSV
   */
  exportToCSV(): string {
    if (this.dialogues.length === 0) {
      return '';
    }

    const headers = [
      'dialogue_id',
      'novel_id',
      'type',
      'participants',
      'total_exchanges',
      'dominant_emotion',
      'scene_context'
    ];

    const rows = this.dialogues.map(dialogue => {
      return [
        dialogue.dialogue_id,
        dialogue.novel_id,
        dialogue.type,
        dialogue.participants.join('; '),
        dialogue.exchanges.length,
        dialogue.analysis?.dominant_emotion || '',
        dialogue.scene_context
      ].map(cell => `"${cell}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get all dialogues
   */
  getAllDialogues(): DialogueEntry[] {
    return [...this.dialogues];
  }

  /**
   * Clear all dialogues
   */
  clear(): void {
    this.dialogues = [];
  }

  // Helper methods

  private countOccurrences(arr: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of arr) {
      counts[item] = (counts[item] || 0) + 1;
    }
    return counts;
  }

  private calculateConflictLevel(emotions: string[], avgIntensity: number): number {
    const conflictEmotions = [
      'غضب', 'حزن', 'خوف', 'قلق', 'استياء', 'غيرة', 'كراهية'
    ];
    
    const conflictCount = emotions.filter(e =>
      conflictEmotions.some(ce => e.includes(ce))
    ).length;
    
    const baseLevel = conflictCount / (emotions.length || 1);
    return Math.min(1, baseLevel * avgIntensity);
  }

  private calculateRelationshipQuality(emotions: string[]): number {
    const positiveEmotions = [
      'سعادة', 'حب', 'فرح', 'أمل', 'حنان', 'اطمئنان'
    ];
    
    const negativeEmotions = [
      'غضب', 'حزن', 'خوف', 'قلق', 'استياء', 'غيرة', 'كراهية'
    ];

    const positiveCount = emotions.filter(e =>
      positiveEmotions.some(pe => e.includes(pe))
    ).length;
    
    const negativeCount = emotions.filter(e =>
      negativeEmotions.some(ne => e.includes(ne))
    ).length;

    if (emotions.length === 0) return 0;

    return (positiveCount - negativeCount) / emotions.length;
  }
}

/**
 * Utility Functions
 */

/**
 * Compare dialogue patterns between two characters
 * مقارنة أنماط الحوار بين شخصيتين
 */
export function compareDialoguePatterns(
  analyzer: ArabicDialogueAnalyzer,
  char1Id: string,
  char2Id: string
): {
  similarities: string[];
  differences: string[];
} {
  const stats1 = analyzer.getCharacterSpeechStats(char1Id);
  const stats2 = analyzer.getCharacterSpeechStats(char2Id);

  const similarities: string[] = [];
  const differences: string[] = [];

  // Compare emotional tendencies
  if (stats1.most_common_emotion === stats2.most_common_emotion) {
    similarities.push(`نفس المشاعر السائدة: ${stats1.most_common_emotion}`);
  } else {
    differences.push(
      `مشاعر مختلفة: ${stats1.most_common_emotion} vs ${stats2.most_common_emotion}`
    );
  }

  // Compare word usage
  const diff = Math.abs(stats1.avg_words_per_line - stats2.avg_words_per_line);
  if (diff < 5) {
    similarities.push('نمط حديث متشابه في الطول');
  } else {
    differences.push(
      `فرق في طول الحديث: ${stats1.avg_words_per_line.toFixed(1)} vs ${stats2.avg_words_per_line.toFixed(1)} كلمة/سطر`
    );
  }

  return { similarities, differences };
}

/**
 * Extract training examples from dialogues
 * استخراج أمثلة تدريب من الحوارات
 */
export function extractDialogueTrainingExamples(
  dialogues: DialogueEntry[]
): Array<{
  input: string;
  output: string;
  metadata: {
    type: string;
    emotion: string;
    participants: string[];
  };
}> {
  const examples: Array<{
    input: string;
    output: string;
    metadata: {
      type: string;
      emotion: string;
      participants: string[];
    };
  }> = [];

  for (const dialogue of dialogues) {
    if (dialogue.exchanges.length < 2) continue;

    // Create context from first N-1 exchanges
    const contextExchanges = dialogue.exchanges.slice(0, -1);
    const targetExchange = dialogue.exchanges[dialogue.exchanges.length - 1];

    const context = contextExchanges
      .map(ex => `${ex.speaker}: ${ex.text}`)
      .join('\n');

    examples.push({
      input: `السياق: ${dialogue.scene_context}\n\nالحوار:\n${context}`,
      output: `${targetExchange.speaker}: ${targetExchange.text}`,
      metadata: {
        type: dialogue.type,
        emotion: targetExchange.emotion || 'غير محدد',
        participants: dialogue.participants,
      },
    });
  }

  return examples;
}
