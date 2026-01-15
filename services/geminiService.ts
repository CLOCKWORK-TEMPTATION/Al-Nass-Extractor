

import { GoogleGenAI, Type } from "@google/genai";
import { ProcessingSettings, SegmentType } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

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
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
 * Extracts raw text from a DOCX file using Mammoth.
 */
const extractDocxTextLocally = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error("DOCX extraction failed:", error);
        throw new Error("فشل في قراءة ملف Word");
    }
};

/**
 * Reads text content from a plain text file.
 */
const extractPlainTextLocally = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

/**
 * Processes the file using Gemini or Local PDF extraction.
 */
export const extractArabicText = async (
  file: File, 
  settings: ProcessingSettings
): Promise<string> => {
  
  if (!ai) {
    throw new Error("تعذر تهيئة خدمة الذكاء الاصطناعي (API Key missing).");
  }

  // Handle Text/Docx pre-extraction
  let preExtractedText: string | null = null;
  const isDocx = file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isTxt = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.type.startsWith('text/') || file.type === 'application/json';

  if (isDocx) {
      preExtractedText = await extractDocxTextLocally(file);
  } else if (isTxt) {
      preExtractedText = await extractPlainTextLocally(file);
  }

  // 0. Direct Extraction Bypass (PDF or Text/Docx)
  if (settings.directPdfExtraction) {
    let localText = preExtractedText;

    if (file.type === 'application/pdf') {
        console.log("Attempting direct PDF text extraction...");
        localText = await extractPdfTextLocally(file);
    }

    if (localText && localText.trim().length > 0) {
       // Basic cleaning even for local text
       let processed = localText;
       if (settings.removeDiacritics) {
         processed = processed.replace(/[\u064B-\u065F\u0670]/g, ''); // Basic regex for Tashkeel
       }
       if (settings.removeTatweel) {
         processed = processed.replace(/ـ+/g, '');
       }
       return processed;
    } else if (file.type === 'application/pdf') {
      console.log("Direct extraction yielded little/no text. Falling back to Gemini OCR.");
    }
  }

  // 1. Prepare Instructions
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
    let parts: any[] = [];
    
    if (preExtractedText) {
        // Use pre-extracted text
        parts.push({ text: `Content of the file:\n${preExtractedText}` });
    } else {
        // Convert file to base64 for Gemini (Images/PDF)
        const filePart = await fileToGenerativePart(file);
        parts.push(filePart);
    }
    parts.push({ text: prompt });

    const modelId = isHighQuality ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const generationConfig = {
      temperature: isHighQuality ? 0 : 0.1,
      topK: isHighQuality ? 1 : undefined,
    };

    console.log(`Processing with model: ${modelId} | Quality: ${settings.ocrQuality}`);

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        role: 'user',
        parts: parts
      },
      config: generationConfig
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("لم يتم استخراج أي نص من النموذج.");
    }

  } catch (error: any) {
    handleGeminiError(error);
    return ""; // Unreachable but satisfies TS
  }
};

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
