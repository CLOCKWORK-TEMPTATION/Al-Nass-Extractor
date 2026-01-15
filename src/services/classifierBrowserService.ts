/**
 * Browser-Compatible Arabic Classifier Wrapper
 * This service wraps the classifier logic for use in the React app
 */

import { HfInference } from '@huggingface/inference';
import { z } from 'zod';
import { FastLabels, LLMAugmentation } from '../types';

// =============================================================================
// Configuration Types
// =============================================================================

export interface ClassifierConfig {
  hfApiKey: string;
  llmApiKey: string;
  hfDialectModel?: string;
  hfSentimentModel?: string;
  llmModelName?: string;
  llmTemperature?: number;
  llmMaxTokens?: number;
  enableQA?: boolean;
  enableReasoning?: boolean;
  enableDialectNormalization?: boolean;
  enableEntityExtraction?: boolean;
}

// =============================================================================
// Rule-Based Classifier
// =============================================================================

export class RuleBasedClassifier {
  /**
   * تحديد جنس المتحدث بناءً على أنماط لغوية بسيطة
   */
  classifyGender(text: string): 'male' | 'female' | 'unknown' {
    const femalePatterns = [
      /\bقالت\b/, /\bردت\b/, /\bأجابت\b/, /\bصرخت\b/, /\bهمست\b/,
      /\bنظرت\b/, /\bجلست\b/, /\bمشت\b/
    ];
    const malePatterns = [
      /\bقال\b/, /\bرد\b/, /\bأجاب\b/, /\bصرخ\b/, /\bهمس\b/,
      /\bنظر\b/, /\bجلس\b/, /\bمشى\b/
    ];

    let femaleScore = 0;
    let maleScore = 0;

    femalePatterns.forEach(p => { if (p.test(text)) femaleScore++; });
    malePatterns.forEach(p => { if (p.test(text)) maleScore++; });

    if (femaleScore > maleScore) return 'female';
    if (maleScore > femaleScore) return 'male';
    return 'unknown';
  }

  /**
   * تحديد نوع النص
   */
  classifyTextType(text: string): 'narration' | 'dialogue' | 'poetry' | 'quran' | 'unknown' {
    // مؤشرات الحوار
    const dialogueIndicators = [
      /^[-–—]/m, // يبدأ بشرطة
      /[:]\s*["«]/, // نقطتين ثم اقتباس
      /["»«]/ // علامات اقتباس
    ];

    const isDialogue = dialogueIndicators.some(p => p.test(text));
    if (isDialogue) return 'dialogue';

    // (يمكن إضافة قواعد للشعر والقرآن هنا)
    return 'narration';
  }
}

// =============================================================================
// BERT Classifier (HuggingFace)
// =============================================================================

export class BERTClassifier {
  private hf: HfInference;
  private dialectModel: string;
  private sentimentModel: string;

  constructor(apiKey: string, dialectModel?: string, sentimentModel?: string) {
    this.hf = new HfInference(apiKey);
    this.dialectModel = dialectModel || 'CAMeL-Lab/bert-base-arabic-camelbert-mix-dialect-did';
    this.sentimentModel = sentimentModel || 'CAMeL-Lab/bert-base-arabic-camelbert-mix-sentiment';
  }

  async classify(text: string) {
    const start = Date.now();
    try {
      // تنفيذ الطلبات بالتوازي لتقليل الوقت
      const [dialectRes, sentimentRes] = await Promise.all([
        this.hf.textClassification({
          model: this.dialectModel,
          inputs: text
        }),
        this.hf.textClassification({
          model: this.sentimentModel,
          inputs: text
        })
      ]);

      // استخراج أعلى تصنيف
      const topDialect = dialectRes.sort((a, b) => b.score - a.score)[0];
      const topSentiment = sentimentRes.sort((a, b) => b.score - a.score)[0];

      return {
        dialect: topDialect?.label || 'unknown',
        dialect_confidence: topDialect?.score || 0,
        sentiment: topSentiment?.label || 'neutral',
        sentiment_confidence: topSentiment?.score || 0,
        duration: Date.now() - start
      };
    } catch (error) {
      console.error('فشل في تصنيف BERT:', error);
      // إرجاع قيم افتراضية عند الفشل لتجنب توقف العملية بالكامل
      return {
        dialect: 'unknown',
        dialect_confidence: 0,
        sentiment: 'unknown',
        sentiment_confidence: 0,
        duration: Date.now() - start
      };
    }
  }
}

// =============================================================================
// LLM Augmenter (Gemini)
// =============================================================================

export class LLMAugmenter {
  private apiKey: string;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;
  private enableQA: boolean;
  private enableReasoning: boolean;

  constructor(config: ClassifierConfig) {
    this.apiKey = config.llmApiKey;
    this.modelName = config.llmModelName || 'gemini-3-flash-preview';
    this.temperature = config.llmTemperature || 0.3;
    this.maxTokens = config.llmMaxTokens || 2048;
    this.enableQA = config.enableQA ?? true;
    this.enableReasoning = config.enableReasoning ?? true;
  }

  private buildSystemPrompt(): string {
    return `
أنت مساعد ذكي متخصص في تحليل وإثراء النصوص الأدبية العربية.
مهمتك هي تحليل المقطع النصي المقدم واستخراج معلومات دقيقة بتنسيق JSON.

المخرجات المطلوبة (JSON Structure):
1. "instruction_pair": سؤال وجواب تعليمي عميق (وليس سطحي) بناءً على النص.
2. "reasoning": تعليل نقدي لبلاغة النص أو سبب تصنيفه (مشاعر/لهجة).
3. "normalized_text": ترجمة النص إلى الفصحى المعاصرة إذا كان عامياً (أو إعادته كما هو إذا كان فصحى).
4. "entities": استخراج الكيانات (شخصيات، مشاعر، لغة جسد).

حافظ على الدقة والأمانة العلمية في التحليل.
    `.trim();
  }

  async augment(text: string, fastLabels: FastLabels): Promise<LLMAugmentation | null> {
    const start = Date.now();
    
    // إذا كانت الإضافات معطلة، نعيد null
    if (!this.enableQA && !this.enableReasoning) {
      return null;
    }

    const userPrompt = `
النص للتحليل:
"${text}"

معلومات سياقية:
- النوع: ${fastLabels.text_type}
- اللهجة المتوقعة: ${fastLabels.dialect}
- المشاعر: ${fastLabels.sentiment}
- الجنس: ${fastLabels.speaker_gender}

المطلوب: قم بتوليد كائن JSON يحتوي على الحقول التالية:
{
  "instruction_pair": { "question": "...", "answer": "..." },
  "reasoning": "...",
  "normalized_text": "...",
  "entities": { "characters": [], "emotions_expressed": [], "body_language": [] }
}
أجب بـ JSON فقط بدون أي نصوص إضافية.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: this.buildSystemPrompt() + '\n\n' + userPrompt
            }]
          }],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // محاولة استخراج JSON من النص
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('لم يتم العثور على JSON صالح في استجابة النموذج');
      }

      const parsedData = JSON.parse(jsonMatch[0]);

      return {
        model_used: this.modelName,
        ...parsedData
      };

    } catch (error) {
      console.warn('فشل في إثراء LLM:', error);
      return null;
    }
  }
}

// =============================================================================
// Main Classification Pipeline
// =============================================================================

export class ArabicClassifierPipeline {
  private ruleClassifier: RuleBasedClassifier;
  private bertClassifier: BERTClassifier;
  private llmAugmenter: LLMAugmenter;

  constructor(config: ClassifierConfig) {
    this.ruleClassifier = new RuleBasedClassifier();
    this.bertClassifier = new BERTClassifier(
      config.hfApiKey,
      config.hfDialectModel,
      config.hfSentimentModel
    );
    this.llmAugmenter = new LLMAugmenter(config);
  }

  /**
   * معالجة قطعة نصية واحدة مع التصنيف والإثراء
   */
  async processChunk(chunkId: number, text: string) {
    const startTime = performance.now();

    // 1. التصنيف السريع (قواعد + BERT)
    const ruleResult = {
      gender: this.ruleClassifier.classifyGender(text),
      type: this.ruleClassifier.classifyTextType(text)
    };

    const bertResult = await this.bertClassifier.classify(text);

    const fastLabels: FastLabels = {
      text_type: ruleResult.type,
      speaker_gender: ruleResult.gender,
      dialect: bertResult.dialect,
      dialect_confidence: bertResult.dialect_confidence,
      sentiment: bertResult.sentiment,
      sentiment_confidence: bertResult.sentiment_confidence,
    };

    // 2. الإثراء العميق (LLM)
    const startLlm = performance.now();
    const augmentation = await this.llmAugmenter.augment(text, fastLabels);
    const endLlm = performance.now();

    const totalTime = performance.now() - startTime;

    return {
      chunk_id: chunkId,
      text: text,
      token_count: text.split(' ').length,
      fast_labels: fastLabels,
      llm_augmentation: augmentation,
      processing_metadata: {
        bert_inference_ms: bertResult.duration,
        llm_inference_ms: endLlm - startLlm,
        total_processing_ms: totalTime,
        timestamp: new Date().toISOString(),
      }
    };
  }
}

/**
 * Create a classifier pipeline instance
 */
export function createClassifierPipeline(config: ClassifierConfig): ArabicClassifierPipeline {
  return new ArabicClassifierPipeline(config);
}