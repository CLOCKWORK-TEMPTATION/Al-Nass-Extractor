

import { GoogleGenAI, Type } from "@google/genai";
import { ProcessingSettings, SegmentType, FastLabels, LLMAugmentation, EnrichedChunk } from '../types';
import { ArabicNormalizer } from './indexingService';
import * as pdfjsLib from 'pdfjs-dist';
<<<<<<< HEAD
import mammoth from 'mammoth';
=======
import { correctArabicOcrErrors } from '../utils/arabicOcrCorrection';
import {
  evaluatePdfExtraction,
  convertPdfToImages,
  TextQualityMetrics
} from './hybridExtractionRouter';
import { extractEpubText, extractDocxText } from './fileExtractorService';
import { preprocessImage, PREPROCESSING_PRESETS } from '../utils/imagePreprocessing';
import {
  splitPDFIntoBatches,
  getPDFMetadata,
  BatchingConfig,
  PDFBatch,
  BatchProgressCallback
} from './pdfBatchingService';
import {
  processBatchesInParallel,
  BatchResult,
  ParallelProcessingConfig,
  mergeBatchResults,
  calculateOptimalConcurrency
} from './parallelProcessingService';
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d

// Resolve pdfjs-dist import (handle ESM/CJS interop where exports might be under .default)
const pdfJs = (pdfjsLib as any).default ?? pdfjsLib;

// Initialize PDF worker
if (pdfJs.GlobalWorkerOptions) {
  pdfJs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

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
 * Converts a File object to a Base64 string required by the Gemini API.
 */
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      
      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
      }

      resolve({
        inlineData: {
          data: base64String,
          mimeType: mimeType || 'application/pdf', // Default fallback
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

<<<<<<< HEAD
/**
 * Read text files directly (TXT, CSV, JSON, DOCX)
 */
const readTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Parse DOCX file using mammoth.js
 */
const readDocxFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error reading DOCX:', error);
    throw new Error('فشل في قراءة ملف Word: ' + (error as Error).message);
  }
};

/**
 * Extracts text locally from a PDF using pdf.js
 */
const extractPdfTextLocally = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Use the resolved pdfJs object
    const pdf = await pdfJs.getDocument(arrayBuffer).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.warn("Local PDF extraction failed:", error);
    return '';
  }
};
=======
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d

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
<<<<<<< HEAD
 * Apply basic text cleaning
 */
const applyBasicCleaning = (text: string, settings: ProcessingSettings): string => {
  let processed = text;
  
  if (settings.removeDiacritics) {
    processed = processed.replace(/[\u064B-\u065F\u0670]/g, '');
  }
  if (settings.removeTatweel) {
    processed = processed.replace(/ـ+/g, '');
  }
  
  return processed;
};

/**
 * Main Extraction Function
 * Processes the file using Gemini or Local PDF extraction.
=======
 * Processes the file using Hybrid Smart Extraction Router.
 *
 * PDF Flow:
 * 1. Attempt local extraction (fast & free)
 * 2. Evaluate text quality (density, garbage ratio, Arabic content)
 * 3. If quality is good -> use local text
 * 4. If quality is poor -> convert to images and use Gemini OCR
 *
 * Image Flow:
 * - Direct Gemini OCR processing
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d
 */
export const extractArabicText = async (
  file: File,
  settings: ProcessingSettings
): Promise<string> => {

  // 0. Handle EPUB and DOCX files (direct text extraction, no OCR needed)
  if (file.type === 'application/epub+zip') {
    console.log("📖 Detected EPUB file, extracting text directly...");
    return await extractEpubText(file, settings);
  }

  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    console.log("📄 Detected DOCX file, extracting text directly...");
    return await extractDocxText(file, settings);
  }

  if (!ai) {
    throw new Error("تعذر تهيئة خدمة الذكاء الاصطناعي (API Key missing).");
  }

<<<<<<< HEAD
  const ext = file.name.split('.').pop()?.toLowerCase();

  // Handle text-based files directly (TXT, CSV, JSON) based on MimeType OR Extension
  if (
    file.type === 'text/plain' || 
    file.type === 'text/csv' || 
    file.type === 'application/json' ||
    ['txt', 'csv', 'json'].includes(ext || '')
  ) {
    const extractedText = await readTextFile(file);
    
    // For JSON files, return formatted version
    if (file.type === 'application/json' || ext === 'json') {
      try {
        const jsonData = JSON.parse(extractedText);
        return JSON.stringify(jsonData, null, 2);
      } catch (e) {
        return extractedText;
      }
    }
    
    // Apply text cleaning for TXT and CSV
    return applyBasicCleaning(extractedText, settings);
  }
  
  // Handle DOCX files
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    const extractedText = await readDocxFile(file);
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("فشل في استخراج النص من ملف DOCX. قد يكون الملف تالفاً أو محمياً.");
    }
    return applyBasicCleaning(extractedText, settings);
  }

  // 0. Direct PDF Extraction Bypass
  if (file.type === 'application/pdf' && settings.directPdfExtraction) {
    console.log("Attempting direct PDF text extraction...");
    const localText = await extractPdfTextLocally(file);
    if (localText && localText.trim().length > 50) {
       return applyBasicCleaning(localText, settings);
    } else {
      console.log("Direct extraction yielded little/no text. Falling back to Gemini OCR.");
=======
  // ============================================================================
  // HYBRID SMART EXTRACTION FOR PDF FILES
  // ============================================================================
  if (file.type === 'application/pdf') {
    console.log("[Hybrid Mode] PDF detected. Starting smart extraction...");

    try {
      // Step 1: Evaluate local extraction quality
      const evaluation = await evaluatePdfExtraction(file);

      // Step 2: Decision based on quality
      if (evaluation.quality.isQualityGood) {
        // ✅ Quality is good -> use local extraction (fast & free)
        console.log(`[Hybrid Mode] ✅ Quality check passed. Using local extraction.`);
        console.log(`[Hybrid Mode] Metrics:`, {
          density: evaluation.quality.textDensity.toFixed(0),
          garbage: (evaluation.quality.garbageRatio * 100).toFixed(1) + '%',
          arabic: (evaluation.quality.arabicRatio * 100).toFixed(1) + '%'
        });

        // Apply text cleaning settings
        let processed = evaluation.localText;
        if (settings.removeDiacritics) {
          processed = processed.replace(/[\u064B-\u065F\u0670]/g, '');
        }
        if (settings.removeTatweel) {
          processed = processed.replace(/ـ+/g, '');
        }

        // Apply custom regex rules if any
        if (settings.customRegexRules && settings.customRegexRules.length > 0) {
          console.log("Applying custom regex rules...");
          processed = ArabicNormalizer.applyCustomRules(processed, settings.customRegexRules);
        }

        // Apply OCR error correction if enabled
        if (settings.correctOcrErrors) {
          console.log("Applying OCR error corrections...");
          processed = correctArabicOcrErrors(processed, { verbose: true });
        }

        return processed;

      } else {
        // ❌ Quality is poor -> use OCR fallback
        console.log(`[Hybrid Mode] ❌ Quality check failed: ${evaluation.quality.reason}`);
        console.log(`[Hybrid Mode] Converting PDF to images for Gemini OCR...`);

        // Convert PDF pages to images
        const images = await convertPdfToImages(file);
        console.log(`[Hybrid Mode] Converted ${images.length} pages to images.`);

        // Process each page with Gemini OCR
        let fullText = '';
        for (let i = 0; i < images.length; i++) {
          console.log(`[Hybrid Mode] Processing page ${i + 1}/${images.length} with OCR...`);
          const pageText = await processWithGeminiOCR(images[i], settings);
          fullText += pageText + '\n\n';
        }

        return fullText;
      }

    } catch (error) {
      console.error("[Hybrid Mode] Error during hybrid extraction:", error);
      // Fallback to direct OCR if hybrid routing fails
      console.log("[Hybrid Mode] Falling back to direct OCR...");
      return await processWithGeminiOCR(file, settings);
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d
    }
  }

  // ============================================================================
  // DIRECT OCR FOR IMAGES
  // ============================================================================
  console.log("[Direct Mode] Image file detected. Using Gemini OCR...");
  return await processWithGeminiOCR(file, settings);
}

/**
 * Process a file (image or PDF) with Gemini OCR
 * Extracted to separate function for reusability
 */
async function processWithGeminiOCR(
  file: File,
  settings: ProcessingSettings
): Promise<string> {
  if (!ai) {
    throw new Error("تعذر تهيئة خدمة الذكاء الاصطناعي (API Key missing).");
  }

  // Image Preprocessing (if enabled and file is an image)
  let processedFile = file;
  const isImage = file.type.startsWith('image/');
  if (isImage && settings.imagePreprocessing && settings.preprocessingPreset !== 'none') {
    console.log(`Applying image preprocessing: ${settings.preprocessingPreset}`);
    try {
      const preprocessOptions = PREPROCESSING_PRESETS[settings.preprocessingPreset];
      processedFile = await preprocessImage(file, preprocessOptions);
      console.log("Image preprocessing completed successfully");
    } catch (error) {
      console.warn("Image preprocessing failed, using original image:", error);
      processedFile = file; // Fallback to original
    }
  }

  // Prepare Instructions
  const cleaningInstructions = [];
  if (settings.removeDiacritics) cleaningInstructions.push("- Remove all Diacritics (Tashkeel/Harakat).");
  if (settings.removeTatweel) cleaningInstructions.push("- Remove all Tatweel (Kashida/Stretching characters).");
  if (settings.normalizeLamAlef) cleaningInstructions.push("- Normalize Lam-Alef ligatures and Hamza forms to standard Unicode.");

  // Advanced Flags
  if (settings.agenticPlus) cleaningInstructions.push("- MODE: AGENTIC_PLUS ENABLED. Use advanced visual reasoning to infer layout structure, read columns correctly, and handle complex document flows.");
  if (settings.specializedChartParsingAgentic) cleaningInstructions.push("- MODE: SPECIALIZED_CHART_PARSING_AGENTIC ENABLED. Detect charts/tables and represent their data structurally (e.g. Markdown tables) within the text output.");
  if (settings.preserveVerySmallText) cleaningInstructions.push("- MODE: PRESERVE_VERY_SMALL_TEXT ENABLED. Do NOT skip footnotes, marginalia, or very small font text. Extract everything visible.");
  if (settings.invalidateCache) cleaningInstructions.push(`- CACHE_CONTROL: INVALIDATE_CACHE (Timestamp: ${Date.now()}). Treat this as a fresh request.`);

  const isHighQuality = settings.ocrQuality === 'high';

  const prompt = `
    You are a specialized Arabic OCR and Text Processing engine.

    Task:
    1. Extract all text from the provided file.
    2. Strictly apply the following cleaning rules to the Arabic text:
    ${cleaningInstructions.join('\n    ')}
    3. Remove any page numbers, headers, or footers if they appear to be non-content (UNLESS preserve_very_small_text is enabled).
    4. Return ONLY the final cleaned text. Do not add any conversational filler.
    5. Ensure the text flows logically (Logical Order) even if the visual layout is complex.
    ${isHighQuality ? '6. ANALYZE DEEPLY: Pay extra attention to faint, handwritten, or low-contrast text.' : ''}
  `;

  try {
<<<<<<< HEAD
    const filePart = await fileToGenerativePart(file);
    const modelId = 'gemini-3-flash-preview';
=======
    const filePart = await fileToGenerativePart(processedFile);
    const modelId = isHighQuality ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
>>>>>>> 0c90ff251e7c572ef83423c7b1a71c1d8dd3948d

    const generationConfig = {
      temperature: isHighQuality ? 0 : 0.1,
      topK: isHighQuality ? 1 : undefined,
    };

    console.log(`Processing with model: ${modelId} | Quality: ${settings.ocrQuality}`);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        role: 'user',
        parts: [
            filePart,
            { text: prompt }
        ]
      },
      config: generationConfig
    });

    if (response.text) {
      let finalText = response.text;

      // Apply OCR error correction if enabled
      if (settings.correctOcrErrors) {
        console.log("Applying OCR error corrections...");
        finalText = correctArabicOcrErrors(finalText, { verbose: true });
      }

      return finalText;
    } else {
      throw new Error("لم يتم استخراج أي نص من النموذج.");
    }

  } catch (error: any) {
    handleGeminiError(error);
    return ""; // Unreachable but satisfies TS
  }
}

/**
 * Classifies a text segment using Gemini LLM when ambiguity is high.
 * Used for Layer 3 verification (Quran/Poetry vs Narration).
 */
export const classifyTextWithLLM = async (text: string): Promise<SegmentType | null> => {
  if (!ai || !text || text.length < 10) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Classify the following Arabic text into one of these categories:
        - "quran": If it is a verse from the Holy Quran.
        - "poetry": If it is Arabic poetry (She'r).
        - "narration": If it is standard prose or narration.
        
        Text:
        "${text.substring(0, 500)}"
        
        Return ONLY the category name in JSON format like: {"type": "category"}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["quran", "poetry", "narration"] }
          }
        }
      }
    });

    const jsonStr = response.text;
    if (jsonStr) {
      const result = JSON.parse(jsonStr);
      const typeStr = result.type?.toLowerCase();
      if (typeStr === 'quran') return SegmentType.QURAN;
      if (typeStr === 'poetry') return SegmentType.POETRY;
      return SegmentType.NARRATION;
    }
    return null;

  } catch (e) {
    console.warn("LLM Classification failed, falling back to basic rules.", e);
    return null;
  }
};

// ============================================================================
// PHASE 4: CLASSIFICATION & AUGMENTATION (Simulating the Hybrid Pipeline)
// ============================================================================

/**
 * Step 1: Fast Classification (Simulating BERT using Gemini Flash)
 * Returns dialect, sentiment, gender, and type.
 */
export const classifyChunkFast = async (text: string): Promise<FastLabels> => {
  if (!ai) throw new Error("AI Client not initialized");

  const start = performance.now();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze the following Arabic text snippet. Return a JSON object containing:
        1. "text_type": One of [narration, dialogue, poetry, quran, unknown].
        2. "dialect": The specific Arabic dialect (e.g., MSA, Egyptian, Levantine, Gulf) or "unknown".
        3. "dialect_confidence": Number between 0 and 1.
        4. "sentiment": One of [positive, negative, neutral, mixed].
        5. "sentiment_confidence": Number between 0 and 1.
        6. "speaker_gender": One of [male, female, unknown] based on linguistic cues.

        Text:
        "${text.substring(0, 1000)}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text_type: { type: Type.STRING, enum: ['narration', 'dialogue', 'poetry', 'quran', 'unknown'] },
            dialect: { type: Type.STRING },
            dialect_confidence: { type: Type.NUMBER },
            sentiment: { type: Type.STRING },
            sentiment_confidence: { type: Type.NUMBER },
            speaker_gender: { type: Type.STRING, enum: ['male', 'female', 'unknown'] }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return json as FastLabels;
  } catch (e) {
    console.error("Fast classification failed:", e);
    // Fallback
    return {
      text_type: 'unknown',
      dialect: 'unknown',
      dialect_confidence: 0,
      sentiment: 'neutral',
      sentiment_confidence: 0,
      speaker_gender: 'unknown'
    };
  }
};

/**
 * Step 2: Deep Augmentation (Simulating Anthropic/Claude using Gemini Pro/Flash)
 * Generates instruction pairs, reasoning, and entity extraction.
 */
export const augmentChunkDeep = async (text: string, fastLabels: FastLabels): Promise<LLMAugmentation | null> => {
  if (!ai) throw new Error("AI Client not initialized");

  try {
    const systemPrompt = `
      You are an expert Arabic literary analyst. 
      Analyze the text provided.
      Context: Type=${fastLabels.text_type}, Dialect=${fastLabels.dialect}, Sentiment=${fastLabels.sentiment}, Gender=${fastLabels.speaker_gender}.
      
      Generate a JSON object with:
      1. "instruction_pair": A deep educational Q&A based on the text.
      2. "reasoning": Critical analysis of why it was classified this way.
      3. "normalized_text": Convert to Modern Standard Arabic if it's dialect, otherwise null.
      4. "entities": Extract characters, emotions, and body language.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        ${systemPrompt}
        
        Text to Analyze:
        "${text}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            instruction_pair: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              }
            },
            reasoning: { type: Type.STRING },
            normalized_text: { type: Type.STRING },
            entities: {
              type: Type.OBJECT,
              properties: {
                characters: { type: Type.ARRAY, items: { type: Type.STRING } },
                emotions_expressed: { type: Type.ARRAY, items: { type: Type.STRING } },
                body_language: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return {
      model_used: 'gemini-3-flash-preview',
      ...json
    };
  } catch (e) {
    console.error("Deep augmentation failed:", e);
    return null;
  }
};

/**
 * Pipeline Runner: Combines Fast and Deep steps
 */
export const processEnrichedChunk = async (chunkId: number, text: string): Promise<EnrichedChunk> => {
  const startTotal = performance.now();

  // 1. Fast Classification
  const startBert = performance.now();
  const fastLabels = await classifyChunkFast(text);
  const endBert = performance.now();

  // 2. Deep Augmentation
  const startLlm = performance.now();
  const augmentation = await augmentChunkDeep(text, fastLabels);
  const endLlm = performance.now();

  const endTotal = performance.now();

  return {
    chunk_id: chunkId,
    text: text,
    token_count: text.split(' ').length,
    fast_labels: fastLabels,
    llm_augmentation: augmentation,
    processing_metadata: {
      bert_inference_ms: endBert - startBert,
      llm_inference_ms: endLlm - startLlm,
      total_processing_ms: endTotal - startTotal,
      timestamp: new Date().toISOString()
    }
  };
};

// ============================================================================
// SMART BATCHING FOR LARGE PDF FILES
// ============================================================================

/**
 * Processes a single batch through Gemini OCR
 * This is a helper function used by the parallel processor
 */
const processSingleBatchOCR = async (
  batch: PDFBatch,
  settings: ProcessingSettings
): Promise<string> => {
  if (!ai) {
    throw new Error("تعذر تهيئة خدمة الذكاء الاصطناعي (API Key missing).");
  }

  // Prepare cleaning instructions
  const cleaningInstructions = [];
  if (settings.removeDiacritics) cleaningInstructions.push("- Remove all Diacritics (Tashkeel/Harakat).");
  if (settings.removeTatweel) cleaningInstructions.push("- Remove all Tatweel (Kashida/Stretching characters).");
  if (settings.normalizeLamAlef) cleaningInstructions.push("- Normalize Lam-Alef ligatures and Hamza forms to standard Unicode.");

  // Advanced Flags
  if (settings.agenticPlus) cleaningInstructions.push("- MODE: AGENTIC_PLUS ENABLED. Use advanced visual reasoning to infer layout structure, read columns correctly, and handle complex document flows.");
  if (settings.specializedChartParsingAgentic) cleaningInstructions.push("- MODE: SPECIALIZED_CHART_PARSING_AGENTIC ENABLED. Detect charts/tables and represent their data structurally (e.g. Markdown tables) within the text output.");
  if (settings.preserveVerySmallText) cleaningInstructions.push("- MODE: PRESERVE_VERY_SMALL_TEXT ENABLED. Do NOT skip footnotes, marginalia, or very small font text. Extract everything visible.");

  const isHighQuality = settings.ocrQuality === 'high';

  const prompt = `
    You are a specialized Arabic OCR and Text Processing engine.

    IMPORTANT: You are processing BATCH ${batch.batchNumber} covering pages ${batch.startPage}-${batch.endPage} of a total ${batch.totalPages} page document.

    Task:
    1. Extract all text from the provided PDF pages.
    2. Strictly apply the following cleaning rules to the Arabic text:
    ${cleaningInstructions.join('\n    ')}
    3. Remove any page numbers, headers, or footers if they appear to be non-content (UNLESS preserve_very_small_text is enabled).
    4. Return ONLY the final cleaned text. Do not add any conversational filler or metadata.
    5. Ensure the text flows logically (Logical Order) even if the visual layout is complex.
    6. CRITICAL: Preserve sentence continuity. If a sentence/paragraph is cut off at the end, keep it as-is for merging with next batch.
    ${isHighQuality ? '7. ANALYZE DEEPLY: Pay extra attention to faint, handwritten, or low-contrast text.' : ''}
  `;

  try {
    const filePart = await fileToGenerativePart(new File([batch.blob], `batch_${batch.batchNumber}.pdf`, { type: 'application/pdf' }));
    const modelId = isHighQuality ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const generationConfig = {
      temperature: isHighQuality ? 0 : 0.1,
      topK: isHighQuality ? 1 : undefined,
    };

    console.log(`Processing batch ${batch.batchNumber} (pages ${batch.startPage}-${batch.endPage}) with model: ${modelId}`);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        role: 'user',
        parts: [
          filePart,
          { text: prompt }
        ]
      },
      config: generationConfig
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error(`لم يتم استخراج أي نص من الدفعة ${batch.batchNumber}`);
    }

  } catch (error: any) {
    handleGeminiError(error);
    return ""; // Unreachable but satisfies TS
  }
};

/**
 * Extracts text from large PDF files using Smart Batching
 *
 * Features:
 * - Automatically splits large PDFs into manageable batches
 * - Processes batches in parallel with rate limiting
 * - Provides progress callbacks for UI updates
 * - Handles failures gracefully (partial success)
 * - Smart merging of results
 */
export const extractArabicTextWithSmartBatching = async (
  file: File,
  settings: ProcessingSettings,
  progressCallback?: BatchProgressCallback
): Promise<{
  extractedText: string;
  batchResults: BatchResult[];
  metadata: {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    totalProcessingTimeMs: number;
    averageTimePerBatch: number;
    processingMode: 'single' | 'batched';
  };
}> => {

  if (!ai) {
    throw new Error("تعذر تهيئة خدمة الذكاء الاصطناعي (API Key missing).");
  }

  // Step 1: Get PDF metadata and determine if batching is needed
  const metadata = await getPDFMetadata(file);
  console.log(`PDF Metadata: ${metadata.totalPages} pages, ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`);

  // Determine if we should use batching
  const shouldUseBatching = settings.enableSmartBatching !== false && (
    metadata.totalPages > 50 || // More than 50 pages
    metadata.fileSize > 10 * 1024 * 1024 // Larger than 10 MB
  );

  if (!shouldUseBatching) {
    // Use the original single-file processing method
    console.log('Using standard single-file processing (small PDF)');
    const startTime = performance.now();
    const text = await extractArabicText(file, settings);
    const endTime = performance.now();

    return {
      extractedText: text,
      batchResults: [{
        batchNumber: 1,
        startPage: 1,
        endPage: metadata.totalPages,
        extractedText: text,
        processingTimeMs: endTime - startTime,
        success: true
      }],
      metadata: {
        totalBatches: 1,
        successfulBatches: 1,
        failedBatches: 0,
        totalProcessingTimeMs: endTime - startTime,
        averageTimePerBatch: endTime - startTime,
        processingMode: 'single'
      }
    };
  }

  // Step 2: Configure batching
  const batchSize = settings.batchSize || metadata.recommendedBatchSize;
  const batchingConfig: BatchingConfig = {
    pagesPerBatch: batchSize,
    overlapPages: 0 // No overlap for now, can be added later
  };

  console.log(`Using Smart Batching: ${batchSize} pages per batch`);

  // Step 3: Split PDF into batches
  const batches = await splitPDFIntoBatches(file, batchingConfig);
  console.log(`Split PDF into ${batches.length} batches`);

  // Step 4: Configure parallel processing
  const maxConcurrent = settings.maxConcurrentBatches ||
                        calculateOptimalConcurrency(true, batches.length); // Assume free tier for now

  const parallelConfig: ParallelProcessingConfig = {
    maxConcurrent,
    retryAttempts: 3,
    retryDelayMs: 2000,
    exponentialBackoff: true,
    rateLimitPerMinute: 15 // Gemini free tier
  };

  // Step 5: Process batches in parallel
  const processingFunction = (batch: PDFBatch) => processSingleBatchOCR(batch, settings);

  const batchResults = await processBatchesInParallel(
    batches,
    processingFunction,
    progressCallback,
    parallelConfig
  );

  // Step 6: Merge results
  const mergeResult = mergeBatchResults(batchResults);

  console.log(`Smart Batching Complete: ${mergeResult.successCount}/${batches.length} batches successful`);

  if (mergeResult.failedBatches.length > 0) {
    console.warn(`Failed batches: ${mergeResult.failedBatches.join(', ')}`);
  }

  return {
    extractedText: mergeResult.mergedText,
    batchResults,
    metadata: {
      totalBatches: batches.length,
      successfulBatches: mergeResult.successCount,
      failedBatches: mergeResult.failureCount,
      totalProcessingTimeMs: mergeResult.totalProcessingTimeMs,
      averageTimePerBatch: mergeResult.totalProcessingTimeMs / batches.length,
      processingMode: 'batched'
    }
  };
};
