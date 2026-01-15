
import { TokenizerService } from "./tokenizer.service";

interface SplitterOptions {
  chunkSize: number;
  chunkOverlap?: number;
}

export class RecursiveArabicSplitter {
  private tokenizer: TokenizerService;
  private chunkSize: number;
  private chunkOverlap: number;

  // Hierarchy of separators for Arabic text
  private separators: RegExp[] = [
    // 1. Double Newline (Paragraphs)
    /\n\n+/, 
    
    // 2. Sentence Endings (Split AFTER punctuation, keeping punctuation with the sentence)
    // Lookbehind ensure punctuation stays with the left part. \s+ consumes the space.
    /(?<=[.!?؟])\s+/,
    
    // 3. Commas/Semicolons (Clauses)
    /(?<=[،;؛,])\s+/,
    
    // 4. Soft Break Conjunctions (Split BEFORE the word)
    // Matches whitespace followed by (Waw/Fa/Thumma/Aw/Bal/Lakin) then space
    /\s+(?=(?:و|ف|ثم|أو|بل|لكن)\s)/,
    
    // 5. Standard Space
    / /,
    
    // 6. Character split (Empty string - catch all)
    /|/
  ];

  constructor(options: SplitterOptions) {
    this.tokenizer = TokenizerService.getInstance();
    this.chunkSize = options.chunkSize;
    this.chunkOverlap = options.chunkOverlap || 0;
  }

  /**
   * Main entry point to split text recursively.
   */
  public splitText(text: string): string[] {
    const finalChunks: string[] = [];
    this._splitRecursively(text, this.separators, finalChunks);
    return finalChunks;
  }

  private _splitRecursively(text: string, separators: RegExp[], result: string[]): void {
    const currentSep = separators[0];
    const nextSeparators = separators.slice(1);
    
    // Try to split text by the current separator
    let splits: string[] = [];
    
    // Handle the "char split" case (empty regex) specially or standard split
    if (currentSep.source === "|") {
       splits = text.split(""); 
    } else {
       // Filter empty strings resulting from consecutive separators
       splits = text.split(currentSep).filter(s => s.length > 0);
    }

    let currentChunk: string[] = [];
    let currentLen = 0;

    for (const split of splits) {
      const splitLen = this.tokenizer.countTokens(split);

      if (splitLen > this.chunkSize) {
        // CASE: Single split is TOO BIG even after splitting by currentSep
        
        // 1. Commit what we have so far in buffer
        if (currentChunk.length > 0) {
          result.push(this._joinChunk(currentChunk, currentSep));
          currentChunk = [];
          currentLen = 0;
        }

        // 2. If we have more separators, recurse on this big chunk
        if (nextSeparators.length > 0) {
          this._splitRecursively(split, nextSeparators, result);
        } else {
          // 3. No more separators, forced to crop (Hard limit fallback)
          // This happens if a single character string is > chunk size (unlikely) 
          // or at the character level split.
          console.warn(`Chunk exceeds limit with no separators left. Truncating: ${split.substring(0, 20)}...`);
          result.push(this.tokenizer.cropToLimit(split, this.chunkSize));
        }
      } else {
        // CASE: Single split fits, let's see if we can add it to current buffer
        if (currentLen + splitLen > this.chunkSize) {
          // Buffer full, commit it
          result.push(this._joinChunk(currentChunk, currentSep));
          currentChunk = [split];
          currentLen = splitLen;
        } else {
          // Add to buffer
          currentChunk.push(split);
          currentLen += splitLen;
        }
      }
    }

    // Commit remaining buffer
    if (currentChunk.length > 0) {
      result.push(this._joinChunk(currentChunk, currentSep));
    }
  }

  /**
   * Joins a list of string parts back together.
   * If the separator was a regex that consumed space (like \s+), we might need 
   * to reinject a space to keep text readable, unless the split logic implicitly handled it.
   */
  private _joinChunk(parts: string[], separator: RegExp): string {
    // Determine the join character based on separator type
    let joinChar = "";
    
    if (separator.source.includes("\\n")) {
      joinChar = "\n\n";
    } else if (separator.source === " ") {
      joinChar = " ";
    } else if (separator.source === "|") {
      joinChar = "";
    } else {
      // For lookarounds like (?<=[...])\s+, the split consumed the whitespace.
      // We usually want to restore a single space.
      joinChar = " ";
    }

    return parts.join(joinChar).trim();
  }
}
