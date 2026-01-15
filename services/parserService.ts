
import { 
  NovelStructure, 
  Chapter, 
  Segment, 
  SegmentType, 
  Sentence, 
  ParserConfig, 
  NovelStatistics 
} from '../types';
import { classifyTextWithLLM } from './geminiService';

// --- Constants & Regex Patterns ---

const CHAPTER_PATTERNS = [
  /^(الفصل|الباب|الجزء|القسم)\s+([أ-ي]+|\d+|[٠-٩]+).*$/,
  /^(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|العشرون|الثلاثون)$/,
  /^[٠-٩]+$/, // Arabic numbers only
  /^\d+$/     // English numbers only
];

const DASH_START_REGEX = /^[-–—]/;
const OPEN_QUOTE_REGEX = /[«"“]/;
const CLOSE_QUOTE_REGEX = /[»"”]/;
const SENTENCE_END_REGEX = /[.!?؟]/;

// Layer 2: Quranic specific Unicode ranges
const QURAN_UNICODE_REGEX = /[\u0610-\u061A\u06D6-\u06ED\uFD3E\uFD3F]/;

// Cache for LLM results
const LLM_VALIDATION_CACHE = new Map<string, SegmentType>();

class StreamUtils {
  /**
   * Async Generator to read source line by line.
   * Supports both String (memory) and Blob/File (streaming).
   * Implements the "aiofiles" pattern for browser environment.
   */
  static async *readLines(source: string | Blob): AsyncGenerator<string> {
    if (typeof source === 'string') {
      // Memory efficient string iteration (Generator) instead of .split() which allocates massive array
      const length = source.length;
      let start = 0;
      while (start < length) {
        let end = source.indexOf('\n', start);
        if (end === -1) end = length;
        
        const line = source.slice(start, end).trim();
        if (line) yield line;
        
        start = end + 1;
      }
    } else {
      // True Streaming for Blob/File
      // Uses ReadableStream to read chunks (buffer size controlled by browser, typically small)
      const stream = source.stream(); 
      const reader = stream.getReader();
      const decoder = new TextDecoder('utf-8');
      let pending = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          pending += decoder.decode(value, { stream: true });
          let newlineIndex;
          
          while ((newlineIndex = pending.indexOf('\n')) >= 0) {
            const line = pending.slice(0, newlineIndex).trim();
            pending = pending.slice(newlineIndex + 1);
            if (line) yield line;
          }
        }
        // Flush remaining text
        pending += decoder.decode();
        if (pending.trim()) yield pending.trim();
      } finally {
        // Ensure resource release (contextlib.aclosing equivalent)
        reader.releaseLock();
      }
    }
  }
}

class DetectionLayers {
  static isPoetryStructural(text: string): boolean {
    if (text.length < 20) return false;
    const parts = text.split(/\s{4,}|\.\.\.|\t/);
    if (parts.length === 2) {
      const len1 = parts[0].trim().length;
      const len2 = parts[1].trim().length;
      if (len1 === 0 || len2 === 0) return false;
      const diff = Math.abs(len1 - len2);
      const maxLen = Math.max(len1, len2);
      return (diff / maxLen) < 0.4;
    }
    return false;
  }

  static isQuranCharacterSet(text: string): boolean {
    return QURAN_UNICODE_REGEX.test(text);
  }

  static async resolveType(text: string, config: ParserConfig): Promise<SegmentType | null> {
    const isQuran = DetectionLayers.isQuranCharacterSet(text);
    const isPoetry = DetectionLayers.isPoetryStructural(text);

    let ambiguityScore = 0;
    const diacritics = text.match(/[\u064B-\u065F]/g);
    const diacriticDensity = diacritics ? (diacritics.length / text.length) : 0;

    if (diacriticDensity > 0.25) ambiguityScore += 0.4;
    if (isPoetry) ambiguityScore += 0.2;
    if (isQuran) ambiguityScore -= 0.5;

    if (ambiguityScore > 0.3 && !isQuran) {
      const cacheKey = text.substring(0, 50);
      if (LLM_VALIDATION_CACHE.has(cacheKey)) {
        return LLM_VALIDATION_CACHE.get(cacheKey) || null;
      }
      const verifiedType = await classifyTextWithLLM(text);
      if (verifiedType) {
        LLM_VALIDATION_CACHE.set(cacheKey, verifiedType);
        return verifiedType;
      }
    }

    if (isQuran && config.detect_quran) return SegmentType.QURAN;
    if (isPoetry && config.detect_poetry) return SegmentType.POETRY;

    return null;
  }
}

class ArabicUtils {
  static countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

class SentenceParser {
  static parse(text: string, config: ParserConfig, startId: number = 1): Sentence[] {
    const sentences: Sentence[] = [];
    const tempText = text.replace(/([.!?؟!;])/g, "$1|SPLIT|");
    const rawSentences = tempText.split("|SPLIT|");
    
    let currentId = startId;

    for (const raw of rawSentences) {
      const cleaned = raw.trim();
      if (!cleaned) continue;

      const wordCount = cleaned.split(/\s+/).length;

      if (wordCount > config.max_sentence_words) {
        const subParts = cleaned.split('،');
        let tempChunk = "";
        
        for (const part of subParts) {
          const projectedLength = (tempChunk + part).split(/\s+/).length;
          if (projectedLength < config.max_sentence_words) {
            tempChunk += part + "،";
          } else {
            sentences.push({ id: currentId++, text: tempChunk.replace(/،$/, '').trim() });
            tempChunk = part + "،";
          }
        }
        if (tempChunk) {
            sentences.push({ id: currentId++, text: tempChunk.replace(/،$/, '').trim() });
        }
      } else {
        sentences.push({ id: currentId++, text: cleaned });
      }
    }
    return sentences;
  }
}

class SegmentParser {
  static findIndexForWordLimit(text: string, limit: number): number {
    let words = 0;
    let i = 0;
    let inSpace = false;
    for (; i < text.length; i++) {
      if (/\s/.test(text[i])) {
        if (!inSpace) {
          words++;
          inSpace = true;
          if (words >= limit) return i;
        }
      } else {
        inSpace = false;
      }
    }
    return i;
  }

  static async parse(text: string, config: ParserConfig, startId: number = 1): Promise<Segment[]> {
    const segments: Segment[] = [];
    let currentId = startId;

    const paragraphs = text.split(/\r?\n+/);

    for (const rawParagraph of paragraphs) {
      const paragraph = rawParagraph.trim();
      if (!paragraph) continue;

      if (DASH_START_REGEX.test(paragraph)) {
        segments.push({
          segment_id: currentId++,
          type: SegmentType.DIALOGUE,
          text: paragraph,
          word_count: ArabicUtils.countWords(paragraph),
          sentences: SentenceParser.parse(paragraph, config),
          preserve_format: false
        });
        continue;
      }

      const detectedType = await DetectionLayers.resolveType(paragraph, config);
      
      if (detectedType === SegmentType.QURAN || detectedType === SegmentType.POETRY) {
         segments.push({
          segment_id: currentId++,
          type: detectedType,
          text: paragraph,
          word_count: ArabicUtils.countWords(paragraph),
          sentences: [],
          preserve_format: true
        });
        continue;
      }

      let cursor = 0;
      let state: 'NARRATION' | 'DIALOGUE' = 'NARRATION';
      const RUNAWAY_WORD_LIMIT = 200;

      while (cursor < paragraph.length) {
        if (state === 'NARRATION') {
          const remaining = paragraph.substring(cursor);
          const match = remaining.match(OPEN_QUOTE_REGEX);
          if (!match) {
            const text = remaining.trim();
            if (text) {
              segments.push({
                segment_id: currentId++,
                type: SegmentType.NARRATION,
                text: text,
                word_count: ArabicUtils.countWords(text),
                sentences: SentenceParser.parse(text, config),
                preserve_format: false
              });
            }
            cursor = paragraph.length;
          } else {
            const openIdx = cursor + match.index!;
            const preText = paragraph.substring(cursor, openIdx).trim();
            if (preText) {
              segments.push({
                segment_id: currentId++,
                type: SegmentType.NARRATION,
                text: preText,
                word_count: ArabicUtils.countWords(preText),
                sentences: SentenceParser.parse(preText, config),
                preserve_format: false
              });
            }
            state = 'DIALOGUE';
            cursor = openIdx; 
          }
        } 
        else if (state === 'DIALOGUE') {
          const searchStart = cursor + 1;
          const remaining = paragraph.substring(searchStart);
          const closeMatch = remaining.match(CLOSE_QUOTE_REGEX);
          let potentialEndIndex = closeMatch ? (searchStart + closeMatch.index! + 1) : paragraph.length;
          
          const content = paragraph.substring(cursor, potentialEndIndex);
          const wordCount = ArabicUtils.countWords(content);
          
          if (wordCount <= RUNAWAY_WORD_LIMIT) {
             segments.push({
               segment_id: currentId++,
               type: SegmentType.DIALOGUE,
               text: content.trim(),
               word_count: wordCount,
               sentences: SentenceParser.parse(content, config),
               preserve_format: false
             });
             cursor = potentialEndIndex;
             state = 'NARRATION'; 
          } else {
             const limitIndex = cursor + SegmentParser.findIndexForWordLimit(paragraph.substring(cursor), RUNAWAY_WORD_LIMIT);
             const searchChunk = paragraph.substring(cursor, limitIndex);
             let cutIndex = -1;
             for (let i = searchChunk.length - 1; i >= 0; i--) {
                if (SENTENCE_END_REGEX.test(searchChunk[i])) {
                  cutIndex = cursor + i + 1;
                  break;
                }
             }
             if (cutIndex === -1) cutIndex = cursor + searchChunk.length;
             
             const fixedContent = paragraph.substring(cursor, cutIndex).trim();
             console.warn(`[Parser] Runaway dialogue detected at ID ${currentId}. Auto-closed.`);
             segments.push({
               segment_id: currentId++,
               type: SegmentType.DIALOGUE,
               text: fixedContent,
               word_count: ArabicUtils.countWords(fixedContent),
               sentences: SentenceParser.parse(fixedContent, config),
               preserve_format: false,
               warning: "Formatting Error: Runaway dialogue auto-closed"
             });
             cursor = cutIndex;
             state = 'NARRATION';
          }
        }
      }
    }
    return segments;
  }
}

class ChapterParser {
  /**
   * Parses chapters from a line generator (stream).
   * Processes each chapter independently and yields it, enabling memory flushing.
   */
  static async *parseStream(lineGenerator: AsyncGenerator<string>, config: ParserConfig): AsyncGenerator<Chapter> {
    let currentChapterLines: string[] = [];
    let currentTitle = "مقدمة / بداية";
    let chapterCounter = 1;

    for await (const line of lineGenerator) {
      let isNewChapter = false;

      // Check Chapter Patterns (only on short lines)
      if (line.length < 50) {
        for (const pattern of CHAPTER_PATTERNS) {
          if (pattern.test(line)) {
            isNewChapter = true;
            break;
          }
        }
      }

      if (isNewChapter) {
        // Process & Flush previous chapter
        const contentStr = currentChapterLines.join('\n').trim();
        if (contentStr) {
          const segments = await SegmentParser.parse(contentStr, config);
          yield {
            chapter_id: chapterCounter++,
            title: currentTitle,
            segments: segments
          };
        }
        
        // Reset context (This mimics flushing from memory)
        currentTitle = line;
        currentChapterLines = []; 
      } else {
        currentChapterLines.push(line);
      }
    }

    // Process final chapter
    const lastContent = currentChapterLines.join('\n').trim();
    if (lastContent) {
      const segments = await SegmentParser.parse(lastContent, config);
      yield {
        chapter_id: chapterCounter++,
        title: currentTitle,
        segments: segments
      };
    }
  }
}

export class ParsingService {
  static calculateStatistics(chapters: Chapter[]): NovelStatistics {
    let totalSegments = 0;
    let narrationSegments = 0;
    let dialogueSegments = 0;
    let poetryCnt = 0;
    let quranCnt = 0;
    let totalSentences = 0;
    let totalSentenceLength = 0;

    for (const chap of chapters) {
      for (const seg of chap.segments) {
        totalSegments++;
        if (seg.type === SegmentType.NARRATION) narrationSegments++;
        else if (seg.type === SegmentType.DIALOGUE) dialogueSegments++;
        else if (seg.type === SegmentType.POETRY) poetryCnt++;
        else if (seg.type === SegmentType.QURAN) quranCnt++;

        for (const sent of seg.sentences) {
          totalSentences++;
          totalSentenceLength += sent.text.split(/\s+/).length;
        }
      }
    }

    const avgLen = totalSentences > 0 ? (totalSentenceLength / totalSentences) : 0;

    return {
      narration_percentage: totalSegments ? (narrationSegments / totalSegments * 100) : 0,
      dialogue_percentage: totalSegments ? (dialogueSegments / totalSegments * 100) : 0,
      poetry_count: poetryCnt,
      quran_count: quranCnt,
      average_sentence_length: Math.round(avgLen * 100) / 100
    };
  }

  static async parseNovel(
    source: string | Blob, 
    fileName: string, 
    config: ParserConfig
  ): Promise<NovelStructure> {
    
    // Use Async Generator Pipeline
    const lineGenerator = StreamUtils.readLines(source);
    const chapterGenerator = ChapterParser.parseStream(lineGenerator, config);
    
    const chapters: Chapter[] = [];
    
    // Consume stream
    for await (const chapter of chapterGenerator) {
      chapters.push(chapter);
      // NOTE: In a true streaming architecture (e.g. Node.js to File), we would write `chapter` to disk here.
      // In this React app, we collect them to display the result.
      // However, the memory footprint *during* parsing is now minimized because
      // we only hold `currentChapterLines` in memory, not the entire `fullText.split('\n')` array.
    }

    const stats = this.calculateStatistics(chapters);
    const totalWords = chapters.reduce((sum, ch) => 
      sum + ch.segments.reduce((sSum, seg) => sSum + seg.word_count, 0), 0
    );

    return {
      novel_metadata: {
        title: fileName.replace(/\.[^/.]+$/, ""),
        author: "غير معروف",
        total_chapters: chapters.length,
        total_words: totalWords,
        parse_date: new Date().toISOString().split('T')[0]
      },
      chapters: chapters,
      statistics: stats
    };
  }
}
