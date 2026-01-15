/**
 * أداة التصنيف والإثراء الذكي للنصوص العربية
 * Arabic Text Classification & Augmentation Tool
 * 
 * تاريخ الإصدار: يناير 2026
 * البيئة: Node.js v22+
 */

import { config } from 'dotenv';
import { z } from 'zod';
import pino from 'pino';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { HfInference } from '@huggingface/inference';
import pLimit from 'p-limit';

// =============================================================================
// 1. الإعدادات والتحقق (Configuration & Validation)
// =============================================================================

config();

// إعداد السجلات
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' }
  }
});

// مخطط الإعدادات البيئية
const EnvSchema = z.object({
  // HuggingFace
  HF_API_KEY: z.string().min(1, 'HF_API_KEY مطلوب'),
  HF_DIALECT_MODEL: z.string().default('CAMeL-Lab/bert-base-arabic-camelbert-mix-dialect-did'),
  HF_SENTIMENT_MODEL: z.string().default('CAMeL-Lab/bert-base-arabic-camelbert-mix-sentiment'),

  // LLM (Gemini)
  LLM_API_KEY: z.string().min(1, 'LLM_API_KEY مطلوب'),
  LLM_MODEL_NAME: z.string().default('gemini-3-flash-preview'),
  LLM_TEMPERATURE: z.coerce.number().default(0.3),
  LLM_MAX_TOKENS: z.coerce.number().default(1024),
  LLM_CONCURRENT_REQUESTS: z.coerce.number().default(5),

  // خيارات المعالجة
  ENABLE_QA_GENERATION: z.string().default('true').transform(v => v === 'true'),
  ENABLE_REASONING: z.string().default('true').transform(v => v === 'true'),
  ENABLE_DIALECT_NORMALIZATION: z.string().default('true').transform(v => v === 'true'),
  ENABLE_ENTITY_EXTRACTION: z.string().default('true').transform(v => v === 'true'),
});

type EnvConfig = z.infer<typeof EnvSchema>;

class ConfigManager {
  private static instance: ConfigManager;
  public readonly config: EnvConfig;

  private constructor() {
    try {
      this.config = EnvSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.fatal({ errors: error.issues }, 'خطأ في إعدادات البيئة');
        process.exit(1);
      }
      throw error;
    }
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
}

// =============================================================================
// 2. تعريف أنواع البيانات (Data Types & Schemas)
// =============================================================================

// البيانات المدخلة
const ChunkInputSchema = z.object({
  chunk_id: z.string(),
  text: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type ChunkInput = z.infer<typeof ChunkInputSchema>;

// نتائج التصنيف السريع
const FastLabelsSchema = z.object({
  text_type: z.enum(['narration', 'dialogue', 'poetry', 'quran', 'unknown']),
  dialect: z.string(),
  dialect_confidence: z.number(),
  sentiment: z.string(),
  sentiment_confidence: z.number(),
  speaker_gender: z.enum(['male', 'female', 'unknown']),
});

type FastLabelsType = z.infer<typeof FastLabelsSchema>;

// نتائج إثراء LLM
const LLMAugmentationSchema = z.object({
  model_used: z.string(),
  normalized_text: z.string().optional(),
  reasoning: z.string().optional(),
  instruction_pair: z.object({
    question: z.string(),
    answer: z.string(),
  }).optional(),
  entities: z.object({
    characters: z.array(z.string()).optional(),
    emotions_expressed: z.array(z.string()).optional(),
    body_language: z.array(z.string()).optional(),
  }).optional(),
});

// المخرج النهائي
const EnrichedChunkSchema = z.object({
  chunk_id: z.string(),
  text: z.string(),
  token_count: z.number(),
  fast_labels: FastLabelsSchema,
  llm_augmentation: LLMAugmentationSchema.nullable(),
  processing_metadata: z.object({
    bert_inference_ms: z.number(),
    llm_inference_ms: z.number(),
    total_processing_ms: z.number(),
    timestamp: z.string(),
  }),
});

type EnrichedChunk = z.infer<typeof EnrichedChunkSchema>;

// =============================================================================
// 3. الخدمات الأساسية (Core Services)
// =============================================================================

/**
 * خدمة التصنيف المبني على القواعد
 */
class RuleBasedClassifier {
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
  classifyTextType(text: string): 'narration' | 'dialogue' | 'poetry' | 'unknown' {
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

/**
 * خدمة HuggingFace للتصنيف بالذكاء الاصطناعي
 */
class BERTClassifier {
  private hf: HfInference;
  private config = ConfigManager.getInstance().config;

  constructor() {
    this.hf = new HfInference(this.config.HF_API_KEY);
  }

  async classify(text: string) {
    const start = Date.now();
    try {
      // تنفيذ الطلبات بالتوازي لتقليل الوقت
      const [dialectRes, sentimentRes] = await Promise.all([
        this.hf.textClassification({
          model: this.config.HF_DIALECT_MODEL,
          inputs: text
        }),
        this.hf.textClassification({
          model: this.config.HF_SENTIMENT_MODEL,
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
      logger.error({ error, text: text.substring(0, 50) }, 'فشل في تصنيف BERT');
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

/**
 * خدمة LLM للإثراء (Gemini)
 */
class LLMAugmenter {
  private apiKey: string;
  private config = ConfigManager.getInstance().config;

  constructor() {
    this.apiKey = this.config.LLM_API_KEY;
  }

  /**
   * بناء موجه النظام الموحد لتقليل عدد الطلبات
   */
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

  async augment(chunk: ChunkInput, fastLabels: Partial<FastLabelsType>) {
    const start = Date.now();
    
    // إذا كانت الإضافات معطلة، نعيد null
    if (!this.config.ENABLE_QA_GENERATION && !this.config.ENABLE_REASONING) {
      return { data: null, duration: 0 };
    }

    const userPrompt = `
النص للتحليل:
"${chunk.text}"

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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.LLM_MODEL_NAME}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: this.buildSystemPrompt() + '\n\n' + userPrompt }]
          }],
          generationConfig: {
            temperature: this.config.LLM_TEMPERATURE,
            maxOutputTokens: this.config.LLM_MAX_TOKENS
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
        data: {
          model_used: this.config.LLM_MODEL_NAME,
          ...parsedData
        },
        duration: Date.now() - start
      };

    } catch (error) {
      logger.warn({ error, chunkId: chunk.chunk_id }, 'فشل في إثراء LLM');
      return { data: null, duration: Date.now() - start };
    }
  }
}

// =============================================================================
// 4. خط المعالجة الرئيسي (Pipeline)
// =============================================================================

class Pipeline {
  private ruleClassifier = new RuleBasedClassifier();
  private bertClassifier = new BERTClassifier();
  private llmAugmenter = new LLMAugmenter();
  private limit: any; // p-limit instance

  constructor() {
    const concurrency = ConfigManager.getInstance().config.LLM_CONCURRENT_REQUESTS;
    this.limit = pLimit(concurrency);
  }

  /**
   * معالجة قطعة نصية واحدة
   */
  async processChunk(chunk: ChunkInput): Promise<EnrichedChunk> {
    const startTime = Date.now();
    logger.debug({ chunkId: chunk.chunk_id }, 'بدء معالجة القطعة');

    // 1. التصنيف السريع (قواعد + BERT)
    const ruleResult = {
      gender: this.ruleClassifier.classifyGender(chunk.text),
      type: this.ruleClassifier.classifyTextType(chunk.text)
    };

    const bertResult = await this.bertClassifier.classify(chunk.text);

    const fastLabels: FastLabelsType = {
      text_type: ruleResult.type,
      speaker_gender: ruleResult.gender,
      dialect: bertResult.dialect,
      dialect_confidence: bertResult.dialect_confidence,
      sentiment: bertResult.sentiment,
      sentiment_confidence: bertResult.sentiment_confidence,
    };

    // 2. الإثراء العميق (LLM) - يتم التحكم فيه عبر limit للتحكم في الضغط
    const llmResult = await this.limit(() => 
      this.llmAugmenter.augment(chunk, fastLabels)
    );

    const totalTime = Date.now() - startTime;

    // 3. تجميع النتائج
    return EnrichedChunkSchema.parse({
      chunk_id: chunk.chunk_id,
      text: chunk.text,
      token_count: chunk.text.split(' ').length, // تقدير تقريبي
      fast_labels: fastLabels,
      llm_augmentation: llmResult.data,
      processing_metadata: {
        bert_inference_ms: bertResult.duration,
        llm_inference_ms: llmResult.duration,
        total_processing_ms: totalTime,
        timestamp: new Date().toISOString(),
      }
    });
  }

  /**
   * معالجة ملف كامل
   */
  async processFile(inputPath: string, outputPath: string) {
    try {
      logger.info({ inputPath }, 'قراءة ملف الإدخال');
      const rawData = await fs.readFile(inputPath, 'utf-8');
      
      // دعم JSON Array أو JSONL
      let chunks: ChunkInput[] = [];
      try {
        chunks = JSON.parse(rawData);
      } catch {
        chunks = rawData.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      }

      // التحقق من صحة المدخلات
      const validChunks = chunks.map(c => {
        const res = ChunkInputSchema.safeParse(c);
        return res.success ? res.data : null;
      }).filter((c): c is ChunkInput => c !== null);

      logger.info({ count: validChunks.length }, 'تم العثور على قطع نصية صالحة');

      // شريط التقدم (محاكاة بسيطة عبر اللوج)
      let completed = 0;
      const results: EnrichedChunk[] = [];
      const errors: any[] = [];

      const promises = validChunks.map(chunk => 
        this.processChunk(chunk)
          .then(res => {
            results.push(res);
            completed++;
            if (completed % 10 === 0) {
              logger.info(`تم معالجة ${completed}/${validChunks.length}`);
            }
          })
          .catch(err => {
            logger.error({ chunkId: chunk.chunk_id, err }, 'خطأ في معالجة القطعة');
            errors.push({ chunk_id: chunk.chunk_id, error: err.message });
          })
      );

      await Promise.all(promises);

      // كتابة النتائج
      await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
      
      // كتابة الأخطاء إن وجدت
      if (errors.length > 0) {
        const errorPath = outputPath.replace('.json', '_errors.json');
        await fs.writeFile(errorPath, JSON.stringify(errors, null, 2));
        logger.warn({ count: errors.length, path: errorPath }, 'تم تسجيل بعض الأخطاء');
      }

      logger.info({ outputPath }, 'تم الانتهاء بنجاح');

    } catch (error) {
      logger.fatal({ error }, 'خطأ كارثي في المعالجة');
      process.exit(1);
    }
  }
}

// =============================================================================
// 5. واجهة سطر الأوامر (CLI)
// =============================================================================

const program = new Command();

program
  .name('arabic-classifier')
  .description('أداة تصنيف وإثراء النصوص العربية باستخدام BERT و LLM')
  .version('1.0.0');

program
  .command('classify')
  .description('تصنيف ملف JSON/JSONL يحتوي على قطع نصية')
  .requiredOption('-i, --input <path>', 'مسار ملف الإدخال')
  .requiredOption('-o, --output <path>', 'مسار ملف الإخراج')
  .action(async (options) => {
    const pipeline = new Pipeline();
    await pipeline.processFile(options.input, options.output);
  });

// نقطة الدخول
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  program.parseAsync(process.argv).catch(error => {
    logger.fatal({ error }, 'خطأ غير متوقع في CLI');
    process.exit(1);
  });
}

export { Pipeline, type ChunkInput, type EnrichedChunk };