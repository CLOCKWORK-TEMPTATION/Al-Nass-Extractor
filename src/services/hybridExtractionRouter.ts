/**
 * Hybrid Extraction Router
 * ========================
 *
 * Smart extraction router that:
 * 1. Attempts local PDF text extraction first (fast & free)
 * 2. Evaluates text quality (density & garbage ratio)
 * 3. If quality is good -> uses local extraction
 * 4. If quality is poor -> converts pages to images and uses Gemini OCR
 *
 * This approach optimizes cost and speed while avoiding common Arabic PDF issues
 * (reversed text, broken encoding, missing characters).
 */

import * as pdfjsLib from 'pdfjs-dist';

// Resolve pdfjs-dist import (handle ESM/CJS interop)
const pdfJs = (pdfjsLib as any).default ?? pdfjsLib;

// Initialize PDF worker
if (pdfJs.GlobalWorkerOptions) {
  pdfJs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

/**
 * Text Quality Metrics
 */
export interface TextQualityMetrics {
  textDensity: number;        // Characters per page
  garbageRatio: number;       // Percentage of garbage characters
  arabicRatio: number;        // Percentage of Arabic characters
  isQualityGood: boolean;     // Final decision
  reason: string;             // Explanation
}

/**
 * Extraction Result with metadata
 */
export interface ExtractionResult {
  text: string;
  method: 'local' | 'ocr';
  quality?: TextQualityMetrics;
  pagesProcessed: number;
  fallbackUsed: boolean;
}

/**
 * Arabic Unicode Ranges:
 * - Basic Arabic: \u0600-\u06FF
 * - Arabic Supplement: \u0750-\u077F
 * - Arabic Extended-A: \u08A0-\u08FF
 * - Arabic Presentation Forms: \uFB50-\uFDFF, \uFE70-\uFEFF
 */
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

/**
 * Common garbage patterns in broken Arabic PDFs:
 * - Replacement characters: �
 * - Control characters
 * - Excessive spaces
 * - Random Latin characters in Arabic text
 * - Box drawing characters
 */
const GARBAGE_PATTERNS = [
  /�/g,                           // Replacement character
  /[\x00-\x1F\x7F-\x9F]/g,       // Control characters
  /\s{5,}/g,                      // 5+ consecutive spaces
  /[▯▮▭▬▫▪□■]/g,                 // Box drawing
  /[A-Za-z]{10,}/g,               // Long Latin sequences in Arabic text
];

/**
 * Calculate text density (characters per page)
 */
export function calculateTextDensity(text: string, numPages: number): number {
  const totalChars = text.replace(/\s/g, '').length; // Exclude whitespace
  return numPages > 0 ? totalChars / numPages : 0;
}

/**
 * Calculate garbage character ratio
 */
export function calculateGarbageRatio(text: string): number {
  if (!text || text.length === 0) return 1.0; // Empty text = 100% garbage

  let garbageCount = 0;

  // Count matches for each garbage pattern
  for (const pattern of GARBAGE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      garbageCount += matches.length;
    }
  }

  return garbageCount / text.length;
}

/**
 * Calculate Arabic character ratio
 */
export function calculateArabicRatio(text: string): number {
  if (!text || text.length === 0) return 0;

  const arabicMatches = text.match(ARABIC_REGEX);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;
  const nonWhitespaceChars = text.replace(/\s/g, '').length;

  return nonWhitespaceChars > 0 ? arabicCount / nonWhitespaceChars : 0;
}

/**
 * Evaluate overall text quality
 *
 * Good quality criteria:
 * - Text density > 100 chars/page (indicates actual text extraction)
 * - Garbage ratio < 5%
 * - Arabic ratio > 50% (for Arabic documents)
 */
export function evaluateTextQuality(
  text: string,
  numPages: number
): TextQualityMetrics {
  const density = calculateTextDensity(text, numPages);
  const garbageRatio = calculateGarbageRatio(text);
  const arabicRatio = calculateArabicRatio(text);

  // Quality thresholds
  const MIN_DENSITY = 100;       // At least 100 chars per page
  const MAX_GARBAGE = 0.05;      // Max 5% garbage
  const MIN_ARABIC = 0.50;       // At least 50% Arabic chars

  let isQualityGood = false;
  let reason = '';

  if (density < MIN_DENSITY) {
    reason = `Low text density (${density.toFixed(0)} chars/page < ${MIN_DENSITY})`;
  } else if (garbageRatio > MAX_GARBAGE) {
    reason = `High garbage ratio (${(garbageRatio * 100).toFixed(1)}% > ${MAX_GARBAGE * 100}%)`;
  } else if (arabicRatio < MIN_ARABIC) {
    reason = `Low Arabic content (${(arabicRatio * 100).toFixed(1)}% < ${MIN_ARABIC * 100}%)`;
  } else {
    isQualityGood = true;
    reason = 'Text quality is good';
  }

  return {
    textDensity: density,
    garbageRatio: garbageRatio,
    arabicRatio: arabicRatio,
    isQualityGood: isQualityGood,
    reason: reason
  };
}

/**
 * Extract text locally from PDF using pdf.js
 */
export async function extractPdfTextLocally(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
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
}

/**
 * Convert a single PDF page to an image (PNG)
 * Returns a File object that can be sent to Gemini
 */
export async function convertPdfPageToImage(
  file: File,
  pageNumber: number
): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfJs.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(pageNumber);

  // Render at 2x scale for better OCR quality
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  // Convert canvas to Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png');
  });

  // Create File object from Blob
  return new File([blob], `page-${pageNumber}.png`, { type: 'image/png' });
}

/**
 * Convert all PDF pages to images
 */
export async function convertPdfToImages(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfJs.getDocument(arrayBuffer).promise;
  const images: File[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const imageFile = await convertPdfPageToImage(file, i);
    images.push(imageFile);
  }

  return images;
}

/**
 * Smart extraction router (Phase 1: Quality Check Only)
 *
 * This function:
 * 1. Attempts local extraction
 * 2. Evaluates quality
 * 3. Returns result with metadata
 *
 * The actual OCR fallback is handled by the caller (geminiService)
 * to avoid circular dependencies.
 */
export async function evaluatePdfExtraction(file: File): Promise<{
  localText: string;
  quality: TextQualityMetrics;
  shouldUseFallback: boolean;
  numPages: number;
}> {
  // Get PDF page count
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfJs.getDocument(arrayBuffer).promise;
  const numPages = pdf.numPages;

  // Attempt local extraction
  console.log('[Hybrid Router] Attempting local PDF extraction...');
  const localText = await extractPdfTextLocally(file);

  // Evaluate quality
  const quality = evaluateTextQuality(localText, numPages);

  console.log('[Hybrid Router] Quality Assessment:', {
    density: quality.textDensity.toFixed(0),
    garbageRatio: (quality.garbageRatio * 100).toFixed(1) + '%',
    arabicRatio: (quality.arabicRatio * 100).toFixed(1) + '%',
    decision: quality.isQualityGood ? 'USE LOCAL' : 'USE OCR',
    reason: quality.reason
  });

  return {
    localText,
    quality,
    shouldUseFallback: !quality.isQualityGood,
    numPages
  };
}
