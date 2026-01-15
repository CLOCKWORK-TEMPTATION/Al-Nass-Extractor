/**
 * Text Conversion Service
 * خدمة تحويل النصوص إلى ملفات TXT بأفضل جودة عربية
 * 
 * Ported and Enhanced from convert_sokaria.py
 */

/**
 * Arabic text normalization options
 * خيارات تطبيع النصوص العربية
 */
export interface ArabicNormalizationOptions {
  removeDiacritics: boolean;        // إزالة التشكيل
  removeTatweel: boolean;           // إزالة الكاشيدة
  normalizeLamAlef: boolean;        // توحيد اللام ألف
  removeExtraSpaces: boolean;       // إزالة المسافات الزائدة
  normalizeQuotes: boolean;         // توحيد علامات التنصيص
  normalizeHyphens: boolean;        // توحيد الشرطات
  normalizeNumbers: boolean;        // توحيد الأرقام
  removeHiddenChars: boolean;       // إزالة الأحرف المخفية
}

/**
 * Text conversion result
 * نتيجة التحويل
 */
export interface TextConversionResult {
  success: boolean;
  content: string;
  originalLength: number;
  convertedLength: number;
  paragraphCount: number;
  sentenceCount: number;
  wordCount: number;
  encoding: string;
  message: string;
  warnings: string[];
  statistics: {
    arabicCharacters: number;
    englishCharacters: number;
    numbers: number;
    punctuation: number;
    whitespace: number;
  };
}

/**
 * Arabic Text Converter
 * محول النصوص العربية
 */
export class ArabicTextConverter {
  private static readonly ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  private static readonly DIACRITICS_RANGE = /[\u064B-\u0652\u0640]/g;
  private static readonly TATWEEL = /ـ+/g;
  private static readonly LAM_ALEF = /لا/g;
  private static readonly LAM_ALEF_VARIANTS = [/ﻻ/g, /ﻼ/g, /ﻹ/g, /ﻸ/g];
  private static readonly EXTRA_SPACES = /\s{2,}/g;
  private static readonly ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g;
  private static readonly HIDDEN_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

  /**
   * Convert file content to normalized Arabic text
   * تحويل محتوى الملف إلى نص عربي منظّم
   */
  static async convertToArabicText(
    content: string,
    options: Partial<ArabicNormalizationOptions> = {}
  ): Promise<TextConversionResult> {
    const defaultOptions: ArabicNormalizationOptions = {
      removeDiacritics: true,
      removeTatweel: true,
      normalizeLamAlef: true,
      removeExtraSpaces: true,
      normalizeQuotes: true,
      normalizeHyphens: true,
      normalizeNumbers: true,
      removeHiddenChars: true,
      ...options,
    };

    try {
      const originalLength = content.length;
      let text = content;

      // Step 1: Remove hidden characters
      if (defaultOptions.removeHiddenChars) {
        text = this.removeHiddenCharacters(text);
      }

      // Step 2: Remove zero-width characters
      text = text.replace(this.ZERO_WIDTH_CHARS, '');

      // Step 3: Normalize quotes
      if (defaultOptions.normalizeQuotes) {
        text = this.normalizeQuotes(text);
      }

      // Step 4: Normalize hyphens and dashes
      if (defaultOptions.normalizeHyphens) {
        text = this.normalizeHyphens(text);
      }

      // Step 5: Normalize Lam-Alef variants
      if (defaultOptions.normalizeLamAlef) {
        text = this.normalizeLamAlef(text);
      }

      // Step 6: Remove Tatweel (Kashida)
      if (defaultOptions.removeTatweel) {
        text = text.replace(this.TATWEEL, '');
      }

      // Step 7: Remove diacritics
      if (defaultOptions.removeDiacritics) {
        text = this.removeDiacritics(text);
      }

      // Step 8: Normalize numbers
      if (defaultOptions.normalizeNumbers) {
        text = this.normalizeNumbers(text);
      }

      // Step 9: Fix spacing around punctuation
      text = this.fixPunctationSpacing(text);

      // Step 10: Remove extra spaces
      if (defaultOptions.removeExtraSpaces) {
        text = text.replace(this.EXTRA_SPACES, ' ');
      }

      // Step 11: Clean up line endings
      text = this.normalizeLineEndings(text);

      // Step 12: Extract Arabic content
      text = this.extractArabicContent(text);

      // Calculate statistics
      const stats = this.calculateStatistics(text);
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
      const sentences = text.split(/[.!?؟!\u061F]+/).filter(s => s.trim().length > 0);

      return {
        success: true,
        content: text,
        originalLength,
        convertedLength: text.length,
        paragraphCount: paragraphs.length,
        sentenceCount: sentences.length,
        wordCount: this.countWords(text),
        encoding: 'UTF-8',
        message: '✅ تم التحويل بنجاح',
        warnings: this.detectIssues(text),
        statistics: stats,
      };
    } catch (error: any) {
      return {
        success: false,
        content: '',
        originalLength: content.length,
        convertedLength: 0,
        paragraphCount: 0,
        sentenceCount: 0,
        wordCount: 0,
        encoding: 'UTF-8',
        message: `❌ خطأ في التحويل: ${error.message}`,
        warnings: [],
        statistics: {
          arabicCharacters: 0,
          englishCharacters: 0,
          numbers: 0,
          punctuation: 0,
          whitespace: 0,
        },
      };
    }
  }

  /**
   * Convert KFX format to text
   * تحويل صيغة KFX إلى نص
   */
  static async convertKFXToText(binaryContent: Uint8Array): Promise<TextConversionResult> {
    try {
      // Decode binary content
      const decoder = new TextDecoder('utf-8');
      let text = decoder.decode(binaryContent);

      // Fallback to latin1 if UTF-8 fails
      if (!text || text.length === 0) {
        const latin1Decoder = new TextDecoder('iso-8859-6');
        text = latin1Decoder.decode(binaryContent);
      }

      // Extract Arabic text with improved regex
      const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\.\,\،\;\؛\:\-\!\؟\n]+/g;
      const matches = text.match(arabicPattern) || [];

      if (matches.length === 0) {
        return {
          success: false,
          content: '',
          originalLength: binaryContent.length,
          convertedLength: 0,
          paragraphCount: 0,
          sentenceCount: 0,
          wordCount: 0,
          encoding: 'binary',
          message: '⚠️ لم يتم العثور على نصوص عربية واضحة في ملف KFX',
          warnings: ['قد تحتاج لأداة متخصصة لتحويل KFX'],
          statistics: {
            arabicCharacters: 0,
            englishCharacters: 0,
            numbers: 0,
            punctuation: 0,
            whitespace: 0,
          },
        };
      }

      // Filter meaningful content
      const textParts = matches
        .filter(m => m.trim().length > 20)
        .map(m => m.trim());

      const fullText = textParts.join('\n');

      // Apply conversion
      return this.convertToArabicText(fullText);
    } catch (error: any) {
      return {
        success: false,
        content: '',
        originalLength: binaryContent.length,
        convertedLength: 0,
        paragraphCount: 0,
        sentenceCount: 0,
        wordCount: 0,
        encoding: 'binary',
        message: `❌ خطأ في تحويل KFX: ${error.message}`,
        warnings: [],
        statistics: {
          arabicCharacters: 0,
          englishCharacters: 0,
          numbers: 0,
          punctuation: 0,
          whitespace: 0,
        },
      };
    }
  }

  /**
   * Convert HTML content to plain text
   * تحويل محتوى HTML إلى نص عادي
   */
  static async convertHTMLToText(htmlContent: string): Promise<TextConversionResult> {
    try {
      // Remove HTML tags
      let text = htmlContent
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '');

      // Decode HTML entities
      text = this.decodeHTMLEntities(text);

      // Apply conversion
      return this.convertToArabicText(text);
    } catch (error: any) {
      return {
        success: false,
        content: '',
        originalLength: htmlContent.length,
        convertedLength: 0,
        paragraphCount: 0,
        sentenceCount: 0,
        wordCount: 0,
        encoding: 'UTF-8',
        message: `❌ خطأ في تحويل HTML: ${error.message}`,
        warnings: [],
        statistics: {
          arabicCharacters: 0,
          englishCharacters: 0,
          numbers: 0,
          punctuation: 0,
          whitespace: 0,
        },
      };
    }
  }

  // ============ Private Helper Methods ============

  private static removeHiddenCharacters(text: string): string {
    return text.replace(this.HIDDEN_CHARS, '');
  }

  private static normalizeQuotes(text: string): string {
    return text
      .replace(/[""]|''|«|»/g, '"') // Normalize quotes
      .replace(/['']/g, "'");        // Normalize apostrophes
  }

  private static normalizeHyphens(text: string): string {
    return text
      .replace(/[–—]/g, '-')   // Normalize dashes
      .replace(/­/g, '-');      // Soft hyphen
  }

  private static normalizeLamAlef(text: string): string {
    let result = text;
    // Normalize all Lam-Alef variants to standard
    for (const variant of this.LAM_ALEF_VARIANTS) {
      result = result.replace(variant, 'لا');
    }
    return result;
  }

  private static removeDiacritics(text: string): string {
    return text.replace(this.DIACRITICS_RANGE, '');
  }

  private static normalizeNumbers(text: string): string {
    // Convert Arabic-Indic digits to Western digits
    return text
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776));
  }

  private static fixPunctationSpacing(text: string): string {
    return text
      .replace(/\s+([.،؛:\-!?\)])/g, '$1')     // Remove space before punctuation
      .replace(/([(\[])\s+/g, '$1')            // Remove space after opening bracket
      .replace(/\s{2,}([.،؛:\-!?\)])/g, '$1'); // Multiple spaces before punctuation
  }

  private static normalizeLineEndings(text: string): string {
    return text
      .replace(/\r\n/g, '\n')                  // Windows to Unix
      .replace(/\r/g, '\n')                    // Old Mac to Unix
      .replace(/\n{3,}/g, '\n\n');            // Multiple newlines to double
  }

  private static extractArabicContent(text: string): string {
    // Split into lines and filter meaningful ones
    const lines = text.split('\n');
    const meaningfulLines = lines.filter(line => {
      const trimmed = line.trim();
      // Keep line if it has at least 10 Arabic characters or is a header
      return trimmed.length > 0 && (
        (trimmed.match(this.ARABIC_RANGE) || []).length >= 10 ||
        trimmed.match(/^[*#\-]{1,3}\s/) // Headers/lists
      );
    });

    return meaningfulLines.join('\n');
  }

  private static calculateStatistics(text: string) {
    const arabicMatches = text.match(this.ARABIC_RANGE) || [];
    const englishMatches = text.match(/[a-zA-Z]/g) || [];
    const numberMatches = text.match(/[0-9]/g) || [];
    const punctuationMatches = text.match(/[.،؛:\-!?\)"']/g) || [];
    const whitespaceMatches = text.match(/\s/g) || [];

    return {
      arabicCharacters: arabicMatches.length,
      englishCharacters: englishMatches.length,
      numbers: numberMatches.length,
      punctuation: punctuationMatches.length,
      whitespace: whitespaceMatches.length,
    };
  }

  private static countWords(text: string): number {
    // Split by spaces and punctuation
    const words = text
      .split(/[\s\n]+/)
      .filter(w => w.length > 0);
    return words.length;
  }

  private static decodeHTMLEntities(text: string): string {
    const map: Record<string, string> = {
      '&nbsp;': ' ',
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&laquo;': '«',
      '&raquo;': '»',
    };

    let result = text;
    for (const [entity, char] of Object.entries(map)) {
      result = result.replace(new RegExp(entity, 'g'), char);
    }

    // Handle numeric entities
    result = result.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    });

    result = result.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    return result;
  }

  private static detectIssues(text: string): string[] {
    const warnings: string[] = [];

    if (text.length === 0) {
      warnings.push('⚠️ النص فارغ');
    }

    if ((text.match(/[a-zA-Z]/g) || []).length > (text.length * 0.3)) {
      warnings.push('⚠️ النص يحتوي على نسبة عالية من النصوص الإنجليزية');
    }

    if ((text.match(/\d+/g) || []).length > (text.length * 0.1)) {
      warnings.push('⚠️ النص يحتوي على نسبة عالية من الأرقام');
    }

    if (!text.match(/[\u0600-\u06FF]/)) {
      warnings.push('⚠️ النص لا يحتوي على أحرف عربية');
    }

    const uniqueChars = new Set(text).size;
    if (uniqueChars < 50) {
      warnings.push('⚠️ النص قد يكون ناقصاً أو معطوباً');
    }

    return warnings;
  }
}

/**
 * File Format Detection
 * كشف صيغة الملف
 */
export class FileFormatDetector {
  static detectFormat(filename: string, content?: Uint8Array | string): string {
    const ext = filename.toLowerCase().split('.').pop() || '';

    // Check by extension first
    const extensionMap: Record<string, string> = {
      'txt': 'text',
      'md': 'markdown',
      'html': 'html',
      'htm': 'html',
      'pdf': 'pdf',
      'docx': 'docx',
      'doc': 'doc',
      'epub': 'epub',
      'kfx': 'kfx',
      'mobi': 'mobi',
    };

    if (extensionMap[ext]) {
      return extensionMap[ext];
    }

    // Check by magic bytes if content provided
    if (content instanceof Uint8Array) {
      if (content[0] === 0x25 && content[1] === 0x50) return 'pdf'; // %P
      if (content[0] === 0x50 && content[1] === 0x4B) return 'docx'; // PK
      if (content[0] === 0xFE && content[1] === 0xFF) return 'html';  // BOM
    }

    return 'unknown';
  }
}

/**
 * Text Export Utility
 * أداة تصدير النص
 */
export class TextExportUtility {
  /**
   * Create downloadable text file
   * إنشاء ملف نص قابل للتحميل
   */
  static async downloadAsText(
    content: string,
    filename: string = 'output.txt',
    encoding: string = 'UTF-8'
  ): Promise<void> {
    // Ensure BOM for proper Arabic display
    const bom = encoding === 'UTF-8' ? '\uFEFF' : '';
    const blob = new Blob([bom + content], { type: `text/plain;charset=${encoding}` });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy text to clipboard
   * نسخ النص إلى الحافظة
   */
  static async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate filename with timestamp
   * إنشاء اسم ملف مع الطابع الزمني
   */
  static generateFilename(basename: string, extension: string = 'txt'): string {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10);
    return `${basename}_${timestamp}.${extension}`;
  }

  /**
   * Validate text content quality
   * التحقق من جودة محتوى النص
   */
  static validateTextQuality(text: string): {
    isValid: boolean;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    details: Record<string, number>;
  } {
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const totalChars = text.length;
    const arabicRatio = totalChars > 0 ? (arabicChars / totalChars) * 100 : 0;

    const lines = text.split('\n').filter(l => l.trim().length > 0).length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const avgWordLength = words > 0 ? totalChars / words : 0;

    let score = 0;
    const details: Record<string, number> = {
      arabicRatio,
      lineCount: lines,
      wordCount: words,
      avgWordLength: parseFloat(avgWordLength.toFixed(2)),
    };

    // Scoring logic
    if (arabicRatio >= 70) score += 25;
    else if (arabicRatio >= 50) score += 15;
    else if (arabicRatio >= 30) score += 5;

    if (lines >= 100) score += 25;
    else if (lines >= 50) score += 15;
    else if (lines >= 10) score += 5;

    if (words >= 5000) score += 25;
    else if (words >= 2000) score += 15;
    else if (words >= 500) score += 5;

    if (avgWordLength >= 5 && avgWordLength <= 8) score += 25;
    else if (avgWordLength >= 4 && avgWordLength <= 9) score += 15;
    else score += 5;

    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (score >= 90) quality = 'excellent';
    else if (score >= 70) quality = 'good';
    else if (score >= 40) quality = 'fair';

    return {
      isValid: score >= 40,
      quality,
      score: Math.round(score),
      details,
    };
  }
}
