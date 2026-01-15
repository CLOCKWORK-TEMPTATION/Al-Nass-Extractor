import * as JSZip from 'jszip';
import * as mammoth from 'mammoth';
import { ProcessingSettings } from '../types';

/**
 * Applies Arabic text processing based on user settings
 * (removes diacritics, tatweel, normalizes ligatures)
 */
const applyArabicTextProcessing = (text: string, settings: ProcessingSettings): string => {
  let processed = text;

  // Remove Arabic diacritics (Tashkeel/Harakat)
  if (settings.removeDiacritics) {
    processed = processed.replace(/[\u064B-\u065F\u0670]/g, '');
  }

  // Remove Tatweel (Kashida/stretching character: ـ)
  if (settings.removeTatweel) {
    processed = processed.replace(/ـ+/g, '');
  }

  // Normalize Lam-Alef ligatures and Hamza variants
  if (settings.normalizeLamAlef) {
    // Lam-Alef ligatures
    processed = processed.replace(/\uFEFB/g, 'لا'); // ﻻ → لا
    processed = processed.replace(/\uFEF7/g, 'لأ'); // ﻷ → لأ
    processed = processed.replace(/\uFEF9/g, 'لإ'); // ﻹ → لإ
    processed = processed.replace(/\uFEF5/g, 'لآ'); // ﻵ → لآ

    // Hamza variants normalization
    processed = processed.replace(/[إأٱآ]/g, 'ا'); // All Alef variants → Alef
    processed = processed.replace(/[ىؤئ]/g, 'ي'); // Ya variants → Ya
  }

  return processed;
};

/**
 * Extracts text from EPUB files
 * EPUB files are ZIP archives containing XHTML content files
 * This version uses JSZip for direct extraction
 */
export const extractEpubText = async (
  file: File,
  settings: ProcessingSettings
): Promise<string> => {
  try {
    console.log('📖 Starting EPUB text extraction...');

    const arrayBuffer = await file.arrayBuffer();
    const JSZipModule = (JSZip as any).default || JSZip;
    const zip = await JSZipModule.loadAsync(arrayBuffer);

    // Step 1: Read META-INF/container.xml to find root file
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('Invalid EPUB: META-INF/container.xml not found');
    }

    const containerXml = await containerFile.async('text');
    const rootFileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootFileMatch) {
      throw new Error('Invalid EPUB: Could not find root file path');
    }

    const rootFilePath = rootFileMatch[1];
    console.log(`📁 Root file: ${rootFilePath}`);

    // Step 2: Parse OPF file to get spine order
    const opfFile = zip.file(rootFilePath);
    if (!opfFile) {
      throw new Error(`Root file not found: ${rootFilePath}`);
    }

    const opfContent = await opfFile.async('text');

    // Extract spine item references
    const spineMatch = opfContent.match(/<spine[^>]*>([\s\S]*?)<\/spine>/);
    if (!spineMatch) {
      throw new Error('Invalid EPUB: Could not find spine');
    }

    const spineItems = [...spineMatch[1].matchAll(/idref="([^"]+)"/g)].map(m => m[1]);
    console.log(`📚 Found ${spineItems.length} spine items`);

    // Build manifest map (id -> href)
    const manifestMap = new Map<string, string>();
    const manifestMatches = opfContent.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"/g);
    for (const match of manifestMatches) {
      manifestMap.set(match[1], match[2]);
    }

    // Step 3: Extract text from each spine item in order
    const basePath = rootFilePath.substring(0, rootFilePath.lastIndexOf('/') + 1);
    let fullText = '';
    let chapterCount = 0;

    for (const itemId of spineItems) {
      const href = manifestMap.get(itemId);
      if (!href) continue;

      const contentPath = basePath + href;
      const contentFile = zip.file(contentPath);

      if (contentFile) {
        try {
          const html = await contentFile.async('text');
          // Strip HTML tags to get plain text
          const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();

          if (text) {
            fullText += text + '\n\n';
            chapterCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract: ${contentPath}`, error);
        }
      }
    }

    console.log(`✅ EPUB extraction complete: ${chapterCount} sections extracted`);
    console.log(`📊 Total text length: ${fullText.length} characters`);

    // Apply Arabic text processing
    const processedText = applyArabicTextProcessing(fullText, settings);

    return processedText;

  } catch (error) {
    console.error('❌ EPUB extraction failed:', error);
    throw new Error(`فشل استخراج النص من EPUB: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
};

/**
 * Extracts text from DOCX files (Microsoft Word)
 * DOCX files are ZIP archives containing XML content
 */
export const extractDocxText = async (
  file: File,
  settings: ProcessingSettings
): Promise<string> => {
  try {
    console.log('📄 Starting DOCX text extraction...');

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Extract text using mammoth
    const mammothModule = (mammoth as any).default || mammoth;
    const result = await mammothModule.extractRawText({ arrayBuffer });

    const extractedText = result.value;

    console.log(`✅ DOCX extraction complete`);
    console.log(`📊 Total text length: ${extractedText.length} characters`);

    if (result.messages && result.messages.length > 0) {
      console.warn('⚠️ DOCX extraction warnings:', result.messages);
    }

    // Check if we got any text
    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error('الملف فارغ أو لا يحتوي على نص قابل للاستخراج');
    }

    // Apply Arabic text processing
    const processedText = applyArabicTextProcessing(extractedText, settings);

    return processedText;

  } catch (error) {
    console.error('❌ DOCX extraction failed:', error);
    throw new Error(`فشل استخراج النص من DOCX: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
  }
};

