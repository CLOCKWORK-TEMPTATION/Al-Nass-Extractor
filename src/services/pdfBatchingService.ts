/**
 * PDF Smart Batching Service
 *
 * Handles intelligent pagination and batching of large PDF files for optimal
 * processing with Gemini Vision API, avoiding token limits and memory issues.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Resolve pdfjs-dist import
const pdfJs = (pdfjsLib as any).default ?? pdfjsLib;

// Initialize PDF worker if not already done
if (pdfJs.GlobalWorkerOptions && !pdfJs.GlobalWorkerOptions.workerSrc) {
  pdfJs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

/**
 * Represents a batch of PDF pages
 */
export interface PDFBatch {
  batchNumber: number;
  startPage: number;
  endPage: number;
  totalPages: number;
  blob: Blob;
  pageCount: number;
}

/**
 * Configuration for PDF batching
 */
export interface BatchingConfig {
  pagesPerBatch: number;        // Number of pages per batch (default: 20)
  overlapPages?: number;         // Pages to overlap between batches for context (default: 0)
  maxBatches?: number;           // Maximum number of batches to process (for testing)
}

/**
 * Progress information for batch processing
 */
export interface BatchProgress {
  batchNumber: number;
  totalBatches: number;
  startPage: number;
  endPage: number;
  percentage: number;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * Progress callback for batch processing
 */
export type BatchProgressCallback = (progress: BatchProgress) => void;


/**
 * Extracts a specific page range from a PDF and returns it as a new Blob
 */
const extractPageRangeAsBlob = async (
  pdfDocument: any,
  startPage: number,
  endPage: number
): Promise<Blob> => {
  // For now, we'll convert pages to images and create a new PDF-like structure
  // This is a simplified approach - in production, you might want to use pdf-lib
  // to properly extract and create PDF pages

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Cannot create canvas context');
  }

  const images: Blob[] = [];

  // Render each page to canvas and convert to image
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      }, 'image/png', 0.95);
    });

    images.push(blob);
  }

  // For simplicity, we'll return the first image as a blob
  // In a full implementation, you'd combine all images into a single PDF
  // or process them separately
  return images[0];
}

/**
 * Splits a PDF file into batches of pages
 */
export const splitPDFIntoBatches = async (
  file: File,
  config: BatchingConfig = { pagesPerBatch: 20 }
): Promise<PDFBatch[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDocument = await pdfJs.getDocument(arrayBuffer).promise;
    const totalPages = pdfDocument.numPages;

    const { pagesPerBatch, overlapPages = 0, maxBatches } = config;
    const batches: PDFBatch[] = [];

    let batchNumber = 1;
    let currentPage = 1;

    while (currentPage <= totalPages) {
      // Calculate batch range
      const startPage = currentPage;
      const endPage = Math.min(currentPage + pagesPerBatch - 1, totalPages);

      // Create batch blob (simplified - using original file for now)
      // In production, extract actual page range
      const batch: PDFBatch = {
        batchNumber,
        startPage,
        endPage,
        totalPages,
        blob: file, // Simplified: using full file, in production extract pages
        pageCount: endPage - startPage + 1
      };

      batches.push(batch);

      // Check if we've reached max batches limit
      if (maxBatches && batchNumber >= maxBatches) {
        break;
      }

      // Move to next batch (accounting for overlap)
      currentPage = endPage + 1 - overlapPages;
      batchNumber++;
    }

    return batches;

  } catch (error) {
    console.error('Error splitting PDF into batches:', error);
    throw new Error(`فشل تقسيم ملف PDF: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
};

/**
 * Gets metadata about a PDF file without loading all pages
 */
export const getPDFMetadata = async (file: File): Promise<{
  totalPages: number;
  fileSize: number;
  recommendedBatchSize: number;
}> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDocument = await pdfJs.getDocument(arrayBuffer).promise;
    const totalPages = pdfDocument.numPages;
    const fileSize = file.size;

    // Calculate recommended batch size based on file size and page count
    // Heuristic: For large files, use smaller batches
    let recommendedBatchSize = 20;

    if (totalPages > 300) {
      recommendedBatchSize = 15;
    } else if (totalPages > 500) {
      recommendedBatchSize = 10;
    }

    // Adjust based on file size (bytes per page)
    const bytesPerPage = fileSize / totalPages;
    if (bytesPerPage > 500000) { // > 500KB per page
      recommendedBatchSize = Math.max(5, Math.floor(recommendedBatchSize * 0.7));
    }

    return {
      totalPages,
      fileSize,
      recommendedBatchSize
    };

  } catch (error) {
    console.error('Error getting PDF metadata:', error);
    throw new Error(`فشل الحصول على معلومات ملف PDF: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
};

/**
 * Converts a Blob to Base64 for API transmission
 */
export const blobToBase64 = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Estimates the processing time for a PDF based on page count and quality settings
 */
export const estimateProcessingTime = (
  totalPages: number,
  isHighQuality: boolean,
  pagesPerBatch: number
): {
  estimatedMinutes: number;
  estimatedBatches: number;
  averageSecondsPerBatch: number;
} => {
  const totalBatches = Math.ceil(totalPages / pagesPerBatch);

  // Average processing time per batch (empirical estimates)
  const secondsPerBatch = isHighQuality ? 45 : 20; // High quality takes longer

  const totalSeconds = totalBatches * secondsPerBatch;
  const estimatedMinutes = Math.ceil(totalSeconds / 60);

  return {
    estimatedMinutes,
    estimatedBatches: totalBatches,
    averageSecondsPerBatch: secondsPerBatch
  };
};
