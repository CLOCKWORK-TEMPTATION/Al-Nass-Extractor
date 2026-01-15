
import * as pdfjsLib from 'pdfjs-dist';
import { PDFPageImage } from '../types';

// Resolve pdfjs-dist import (handle ESM/CJS interop where exports might be under .default)
const pdfJs = (pdfjsLib as any).default ?? pdfjsLib;

// Initialize PDF worker
if (pdfJs.GlobalWorkerOptions) {
  pdfJs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

/**
 * Converts all pages of a PDF file to images
 * @param file - The PDF file to convert
 * @param scale - Scale factor for rendering (default: 2 for high quality)
 * @returns Array of PDFPageImage objects
 */
export const convertPdfToImages = async (
  file: File,
  scale: number = 2
): Promise<PDFPageImage[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfJs.getDocument(arrayBuffer).promise;
    const pages: PDFPageImage[] = [];

    console.log(`Converting ${pdf.numPages} PDF pages to images...`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        console.error(`Failed to get canvas context for page ${pageNum}`);
        continue;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Convert canvas to base64 image
      const imageData = canvas.toDataURL('image/png', 0.95);

      pages.push({
        pageNumber: pageNum,
        imageData: imageData,
        width: viewport.width,
        height: viewport.height,
      });

      console.log(`Converted page ${pageNum}/${pdf.numPages}`);
    }

    console.log(`Successfully converted ${pages.length} pages`);
    return pages;

  } catch (error) {
    console.error('Failed to convert PDF to images:', error);
    throw new Error('فشل تحويل ملف PDF إلى صور. يرجى التحقق من صحة الملف.');
  }
};

/**
 * Converts a single page of a PDF file to an image
 * @param file - The PDF file
 * @param pageNum - Page number (1-indexed)
 * @param scale - Scale factor for rendering
 * @returns PDFPageImage object or null if failed
 */
export const convertPdfPageToImage = async (
  file: File,
  pageNum: number,
  scale: number = 2
): Promise<PDFPageImage | null> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfJs.getDocument(arrayBuffer).promise;

    if (pageNum < 1 || pageNum > pdf.numPages) {
      console.error(`Invalid page number: ${pageNum}. PDF has ${pdf.numPages} pages.`);
      return null;
    }

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Failed to get canvas context');
      return null;
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    const imageData = canvas.toDataURL('image/png', 0.95);

    return {
      pageNumber: pageNum,
      imageData: imageData,
      width: viewport.width,
      height: viewport.height,
    };

  } catch (error) {
    console.error(`Failed to convert PDF page ${pageNum} to image:`, error);
    return null;
  }
};

/**
 * Gets the number of pages in a PDF file
 * @param file - The PDF file
 * @returns Number of pages or 0 if failed
 */
export const getPdfPageCount = async (file: File): Promise<number> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfJs.getDocument(arrayBuffer).promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Failed to get PDF page count:', error);
    return 0;
  }
};
