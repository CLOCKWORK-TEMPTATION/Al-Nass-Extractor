/**
 * Arabic OCR Post-Processing Correction Utility
 *
 * This module provides intelligent correction for common Arabic OCR errors:
 * 1. ى/ي confusion at word endings
 * 2. ه/ة confusion at word endings
 * 3. Hamza variations (ؤ/ء/ئ/أ/إ)
 *
 * Strategy: Dictionary-based correction with context-aware rules
 */

// ============================================================================
// COMMON WORD CORRECTIONS DICTIONARY
// ============================================================================

/**
 * Dictionary of commonly misread words and their corrections.
 * Format: "incorrect_form" => "correct_form"
 */
const COMMON_WORD_CORRECTIONS: Record<string, string> = {
  // ى/ي corrections at word endings
  "علي": "على",      // Preposition "on"
  "الي": "إلى",      // Preposition "to"
  "حتي": "حتى",      // Preposition "until"
  "متي": "متى",      // Question word "when"
  "لدي": "لدى",      // Preposition "with/at"
  "مني": "منى",      // Name
  "موسي": "موسى",    // Name Moses
  "عيسي": "عيسى",    // Name Jesus
  "ليلي": "ليلى",    // Name
  "سلمي": "سلمى",    // Name
  "بشري": "بشرى",    // Good news
  "ذكري": "ذكرى",    // Memory
  "فتوي": "فتوى",    // Religious ruling

  // ه/ة corrections at word endings
  "مدرسه": "مدرسة",   // School
  "جامعه": "جامعة",   // University
  "حياه": "حياة",     // Life
  "كتابه": "كتابة",   // Writing
  "قراءه": "قراءة",   // Reading
  "حكومه": "حكومة",   // Government
  "صناعه": "صناعة",   // Industry
  "زراعه": "زراعة",   // Agriculture
  "ثقافه": "ثقافة",   // Culture
  "سياحه": "سياحة",   // Tourism
  "رياضه": "رياضة",   // Sports
  "صحه": "صحة",       // Health
  "لغه": "لغة",       // Language
  "مكتبه": "مكتبة",   // Library
  "غرفه": "غرفة",     // Room
  "سيارة": "سيارة",   // Car (already correct, for reference)

  // Hamza corrections
  "مسؤل": "مسؤول",    // Responsible
  "سؤل": "سؤال",      // Question
  "مساءله": "مساءلة", // Accountability
  "رؤيه": "رؤية",     // Vision
  "مروءه": "مروءة",   // Chivalry
  "جزء": "جزء",       // Part (already correct)
  "شيء": "شيء",       // Thing (already correct)
  "ملء": "ملء",       // Filling (already correct)
};

/**
 * Extended dictionary with verb conjugations and derivatives
 */
const VERB_CORRECTIONS: Record<string, string> = {
  // Third-person feminine past tense verbs (should end with ت)
  "كتبة": "كتبت",
  "قرأة": "قرأت",
  "ذهبة": "ذهبت",
  "جاءة": "جاءت",
  "قالة": "قالت",

  // Passive participles and verbal nouns
  "مكتوبه": "مكتوبة",
  "مقروءه": "مقروءة",
  "محفوظه": "محفوظة",
  "منقوله": "منقولة",
  "مطبوعه": "مطبوعة",
};

// Merge all dictionaries
const FULL_CORRECTION_DICT = {
  ...COMMON_WORD_CORRECTIONS,
  ...VERB_CORRECTIONS,
};

// ============================================================================
// PATTERN-BASED CORRECTIONS
// ============================================================================

/**
 * Pattern-based rules for systematic corrections
 */
interface CorrectionRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
}

const CORRECTION_RULES: CorrectionRule[] = [
  // Rule 1: Fix ى → ي for common prepositions at word boundaries
  {
    pattern: /\b(عل|إل|حت|لد|مت)ى\b/g,
    replacement: (match, prefix) => {
      const corrections: Record<string, string> = {
        "عل": "على",
        "إل": "إلى",
        "حت": "حتى",
        "لد": "لدى",
        "مت": "متى",
      };
      return corrections[prefix] || match;
    },
    description: "Fix ى → ي confusion in common prepositions"
  },

  // Rule 2: Fix ه → ة for feminine nouns (pattern: word ending in ه preceded by non-connecting letter)
  {
    pattern: /([اوةيىؤءئأإآ])(ه)\b/g,
    replacement: '$1ة',
    description: "Fix ه → ة for feminine noun endings"
  },

  // Rule 3: Fix hamza on waw (ؤ) in middle of words
  {
    pattern: /([^ؤ])(و)([ؤ])/g,
    replacement: '$1ؤ',
    description: "Fix hamza on waw placement"
  },

  // Rule 4: Fix standalone hamza (ء) that should be on a carrier
  {
    pattern: /\s(ء)([اةبتثجحخدذرزسشصضطظعغفقكلمنهويى])/g,
    replacement: ' أ$2',
    description: "Fix standalone hamza at word beginning"
  },

  // Rule 5: Common suffix corrections for definite articles + feminine nouns
  {
    pattern: /ال([أ-ي]+)(ه)\b/g,
    replacement: 'ال$1ة',
    description: "Fix ال + feminine noun endings"
  },
];

// ============================================================================
// CONTEXT-AWARE CORRECTIONS
// ============================================================================

/**
 * Context patterns that help decide between ambiguous corrections
 */
interface ContextPattern {
  before?: RegExp;
  after?: RegExp;
  apply: (word: string) => string;
}

const CONTEXT_RULES: ContextPattern[] = [
  // If word ends with ى and is preceded by "من", likely means "from me" (مني not منى)
  {
    before: /\bمن$/,
    apply: (word) => word.replace(/ى$/, 'ي')
  },

  // If word is a verb conjugation (3rd fem. past), prefer ت over ة
  {
    after: /^(في|من|إلى|على|مع|عن)\b/,
    apply: (word) => {
      // Check if it looks like a verb (starts with common verb prefixes)
      if (/^(كتب|قرأ|ذهب|جاء|قال|فعل|عمل|أخذ|رأ)/.test(word)) {
        return word.replace(/ة$/, 'ت');
      }
      return word;
    }
  },
];

// ============================================================================
// MAIN CORRECTION FUNCTIONS
// ============================================================================

/**
 * Applies dictionary-based corrections to a single word
 */
function correctWordFromDictionary(word: string): string {
  // Direct lookup
  if (FULL_CORRECTION_DICT[word]) {
    return FULL_CORRECTION_DICT[word];
  }

  // Try without diacritics (if any remain)
  const stripped = word.replace(/[\u064B-\u065F\u0670]/g, '');
  if (FULL_CORRECTION_DICT[stripped]) {
    return FULL_CORRECTION_DICT[stripped];
  }

  return word;
}

/**
 * Applies pattern-based rules to text
 */
function applyPatternRules(text: string): string {
  let corrected = text;

  for (const rule of CORRECTION_RULES) {
    corrected = corrected.replace(rule.pattern, rule.replacement as any);
  }

  return corrected;
}

/**
 * Applies context-aware corrections word by word
 */
function applyContextCorrections(text: string): string {
  const words = text.split(/\s+/);
  const correctedWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const nextWord = i < words.length - 1 ? words[i + 1] : '';

    // Check each context rule
    for (const rule of CONTEXT_RULES) {
      if (rule.before && prevWord.match(rule.before)) {
        word = rule.apply(word);
      }
      if (rule.after && nextWord.match(rule.after)) {
        word = rule.apply(word);
      }
    }

    correctedWords.push(word);
  }

  return correctedWords.join(' ');
}

/**
 * Main correction pipeline - applies all correction strategies
 *
 * @param text - Raw OCR text in Arabic
 * @param options - Correction options
 * @returns Corrected text
 */
export interface CorrectionOptions {
  useDictionary?: boolean;       // Apply dictionary corrections (default: true)
  usePatternRules?: boolean;     // Apply pattern-based rules (default: true)
  useContextRules?: boolean;     // Apply context-aware rules (default: true)
  verbose?: boolean;             // Log corrections made (default: false)
}

export function correctArabicOcrErrors(
  text: string,
  options: CorrectionOptions = {}
): string {
  const {
    useDictionary = true,
    usePatternRules = true,
    useContextRules = true,
    verbose = false,
  } = options;

  if (!text || text.trim().length === 0) {
    return text;
  }

  let corrected = text;
  const corrections: string[] = [];

  // Step 1: Dictionary-based corrections (word by word)
  if (useDictionary) {
    const words = corrected.split(/\s+/);
    const correctedWords = words.map(word => {
      const originalWord = word;
      const correctedWord = correctWordFromDictionary(word);
      if (correctedWord !== originalWord && verbose) {
        corrections.push(`Dictionary: "${originalWord}" → "${correctedWord}"`);
      }
      return correctedWord;
    });
    corrected = correctedWords.join(' ');
  }

  // Step 2: Pattern-based rules
  if (usePatternRules) {
    const beforePatterns = corrected;
    corrected = applyPatternRules(corrected);
    if (verbose && corrected !== beforePatterns) {
      corrections.push(`Pattern rules applied (${CORRECTION_RULES.length} rules)`);
    }
  }

  // Step 3: Context-aware corrections
  if (useContextRules) {
    const beforeContext = corrected;
    corrected = applyContextCorrections(corrected);
    if (verbose && corrected !== beforeContext) {
      corrections.push(`Context rules applied (${CONTEXT_RULES.length} rules)`);
    }
  }

  // Log corrections if verbose mode is enabled
  if (verbose && corrections.length > 0) {
    console.log('✓ OCR Corrections Applied:');
    corrections.forEach(c => console.log(`  - ${c}`));
  }

  return corrected;
}

/**
 * Statistics about corrections made
 */
export interface CorrectionStats {
  totalWords: number;
  correctedWords: number;
  correctionRate: number;
  corrections: Array<{ original: string; corrected: string }>;
}

/**
 * Analyze and return statistics about corrections
 */
export function analyzeCorrections(originalText: string, correctedText: string): CorrectionStats {
  const originalWords = originalText.split(/\s+/).filter(w => w.length > 0);
  const correctedWords = correctedText.split(/\s+/).filter(w => w.length > 0);

  const corrections: Array<{ original: string; corrected: string }> = [];

  for (let i = 0; i < Math.min(originalWords.length, correctedWords.length); i++) {
    if (originalWords[i] !== correctedWords[i]) {
      corrections.push({
        original: originalWords[i],
        corrected: correctedWords[i]
      });
    }
  }

  return {
    totalWords: originalWords.length,
    correctedWords: corrections.length,
    correctionRate: corrections.length / originalWords.length,
    corrections
  };
}

/**
 * Add custom word to correction dictionary (for user-specific corrections)
 */
export function addCustomCorrection(incorrect: string, correct: string): void {
  FULL_CORRECTION_DICT[incorrect] = correct;
}

/**
 * Get all available corrections in the dictionary
 */
export function getCorrectionDictionary(): Record<string, string> {
  return { ...FULL_CORRECTION_DICT };
}
