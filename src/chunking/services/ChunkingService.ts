
import { ConfigManager } from "../config";
import { TokenizerService } from "./TokenizerService";
import { RecursiveArabicSplitter } from "./RecursiveArabicSplitter";
import { 
  InputStructure, 
  ChunkingResult, 
  Chunk, 
  SplitPointType 
} from "../types";
import { SegmentType } from "../../types";

interface BufferItem {
  text: string;
  type: SegmentType;
  tokens: number;
}

export class ChunkingService {
  private config: ConfigManager;
  private tokenizer: TokenizerService;
  private splitter: RecursiveArabicSplitter;

  // Processing State
  private currentBuffer: BufferItem[] = [];
  private currentBufferTokens: number = 0;
  private chunks: Chunk[] = [];
  private globalChunkId: number = 1;
  private lastChunkText: string | null = null;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.tokenizer = TokenizerService.getInstance();
    this.splitter = new RecursiveArabicSplitter();
  }

  /**
   * Main Entry Point: Processes a parsed novel structure into chunks.
   */
  public process(input: InputStructure): ChunkingResult {
    const startTime = performance.now();
    this._resetState();

    // Iterate through Chapters
    for (const chapter of input.chapters) {
      // 1. Reset Overlap Context at the start of a chapter?
      // Usually better to keep chapters distinct to avoid bleeding context across chapters.
      // We flush any pending buffer from previous chapter (though it should be empty if logic is correct).
      this._flushBuffer(chapter.chapter_id, chapter.title, "paragraph");
      this.lastChunkText = null; 

      for (const segment of chapter.segments) {
        const segTokens = this.tokenizer.countTokens(segment.text);
        
        // --- CASE 1: Segment > Chunk Limit (Recursive Split) ---
        if (segTokens > this.config.CHUNK_SIZE) {
          // A. Flush current buffer first
          this._flushBuffer(chapter.chapter_id, chapter.title, "forced_limit");
          
          // B. Split the large segment
          const parts = this.splitter.splitTextRecursively(segment.text, this.config.CHUNK_SIZE);
          
          // C. Create chunks for each part
          for (const part of parts) {
            // Recursive splits are usually forced by size
            this._createChunk(part, chapter.chapter_id, chapter.title, [segment.type], "forced_limit");
          }
          continue;
        }

        // --- CASE 2: Buffer + Segment > Chunk Limit (Overflow Check) ---
        if (this.currentBufferTokens + segTokens > this.config.CHUNK_SIZE) {
          
          // Heuristic: Preserve Dialogue Context
          // If it's a dialogue and the overflow is small (<10%), keep it in the current chunk.
          const isDialogue = segment.type === SegmentType.DIALOGUE;
          const overflowRatio = (this.currentBufferTokens + segTokens) / this.config.CHUNK_SIZE;
          const shouldPreserve = this.config.PRESERVE_DIALOGUE && isDialogue && overflowRatio < 1.1;

          if (shouldPreserve) {
             this._addToBuffer(segment.text, segment.type, segTokens);
             // Flush immediately to prevent further growth
             this._flushBuffer(chapter.chapter_id, chapter.title, "dialogue_complete");
          } else {
            // Determine split point based on the LAST item in the buffer
            const lastItem = this.currentBuffer[this.currentBuffer.length - 1];
            let splitType: SplitPointType = "forced_limit";
            
            if (lastItem) {
              if (lastItem.type === SegmentType.DIALOGUE) splitType = "dialogue_complete";
              else if (lastItem.type === SegmentType.POETRY) splitType = "poetry_complete";
              else splitType = "paragraph"; // Default for narration break
            }

            this._flushBuffer(chapter.chapter_id, chapter.title, splitType);
            
            // Start new buffer with current segment
            this._addToBuffer(segment.text, segment.type, segTokens);
          }
        } 
        // --- CASE 3: Fits in Buffer ---
        else {
          this._addToBuffer(segment.text, segment.type, segTokens);
        }
      }

      // End of Chapter: Flush remaining buffer
      this._flushBuffer(chapter.chapter_id, chapter.title, "paragraph");
    }

    const endTime = performance.now();
    const totalTokens = this.chunks.reduce((acc, c) => acc + c.token_count, 0);
    const avgSize = this.chunks.length > 0 ? totalTokens / this.chunks.length : 0;

    return {
      chunks: this.chunks,
      metadata: {
        total_chunks: this.chunks.length,
        total_tokens: totalTokens,
        average_chunk_size: avgSize,
        processing_time_ms: endTime - startTime,
        model_used: this.config.TOKENIZER_MODEL
      }
    };
  }

  private _resetState() {
    this.currentBuffer = [];
    this.currentBufferTokens = 0;
    this.chunks = [];
    this.globalChunkId = 1;
    this.lastChunkText = null;
  }

  private _addToBuffer(text: string, type: SegmentType, tokens: number) {
    this.currentBuffer.push({ text, type, tokens });
    this.currentBufferTokens += tokens;
  }

  private _flushBuffer(chapterId: number, chapterTitle: string, splitPoint: SplitPointType) {
    if (this.currentBuffer.length === 0) return;

    const combinedText = this.currentBuffer.map(b => b.text).join("\n");
    const uniqueTypes = Array.from(new Set(this.currentBuffer.map(b => b.type)));

    this._createChunk(combinedText, chapterId, chapterTitle, uniqueTypes, splitPoint);

    this.currentBuffer = [];
    this.currentBufferTokens = 0;
  }

  private _createChunk(
    text: string, 
    chapterId: number, 
    chapterTitle: string, 
    types: string[], 
    splitPoint: SplitPointType
  ) {
    let finalContent = text;
    let overlapStr: string | null = null;

    // Handle Overlap (retrieve from previous chunk text)
    if (this.lastChunkText && this.config.CHUNK_OVERLAP > 0) {
      overlapStr = this.tokenizer.getLastTokens(this.lastChunkText, this.config.CHUNK_OVERLAP);
      if (overlapStr) {
         // Prepend overlap to current text
         finalContent = overlapStr + " " + text;
      }
    }

    const tokenCount = this.tokenizer.countTokens(finalContent);
    const charCount = finalContent.length;

    const chunk: Chunk = {
      chunk_id: this.globalChunkId++,
      chapter_id: chapterId,
      chapter_title: chapterTitle,
      content: finalContent,
      token_count: tokenCount,
      char_count: charCount,
      content_types: types,
      split_point: splitPoint,
      overlap_text: overlapStr,
      metadata: {}
    };

    this.chunks.push(chunk);
    
    // Store final content for next overlap
    // Note: We typically overlap using the *visual* content of this chunk.
    this.lastChunkText = finalContent;
  }
}
