
import { TokenizerService } from "./TokenizerService";
import { ConfigManager } from "../config";

export class RecursiveArabicSplitter {
  private tokenizer: TokenizerService;
  private config: ConfigManager;
  private separators: RegExp[];

  constructor() {
    this.tokenizer = TokenizerService.getInstance();
    this.config = ConfigManager.getInstance();

    // 4. Soft Break Conjunctions Regex
    // Logic: Split matches the whitespace BEFORE the conjunction word.
    // (?=...) is a positive lookahead to ensure the conjunction follows.
    // We match \s+ (one or more spaces) that are followed by one of the conjunctions and then a space.
    const conjunctions = this.config.SOFT_BREAK_WORDS
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special regex chars
      .join('|');
    
    // Pattern matches: Whitespace(s) -> Lookahead [ (Conjunction) + Whitespace ]
    const conjunctionRegex = new RegExp(`\\s+(?=(?:${conjunctions})\\s)`);

    // Hierarchy of separators
    this.separators = [
      // 1. Double Newline (Paragraphs)
      /\n\n+/, 
      
      // 2. Sentence Endings (Split AFTER punctuation)
      // Lookbehind: Matches one or more spaces that are PRECEDED by punctuation.
      // This ensures the punctuation stays attached to the preceding sentence.
      /(?<=[.!?؟])\s+/,
      
      // 3. Commas/Semicolons (Clauses)
      // Similar lookbehind logic.
      /(?<=[،;؛,])\s+/,
      
      // 4. Soft Break Conjunctions
      conjunctionRegex,
      
      // 5. Standard Space
      / /,
      
      // 6. Character split (Empty regex)
      /|/
    ];
  }

  /**
   * Recursively splits text into chunks that fit within the token limit.
   */
  public splitTextRecursively(text: string, limit: number): string[] {
    const finalChunks: string[] = [];
    this._splitRecursively(text, limit, this.separators, finalChunks);
    return finalChunks;
  }

  private _splitRecursively(
    text: string, 
    limit: number, 
    separators: RegExp[], 
    result: string[]
  ): void {
    const currentSep = separators[0];
    const nextSeparators = separators.slice(1);
    
    let splits: string[] = [];
    
    if (currentSep.source === "|") {
       splits = text.split(""); 
    } else {
       // Regular split.
       // Note: Javascript .split() consumes the characters matched by the regex.
       // For \n\n and ' ', they are consumed.
       // For lookbehinds/lookaheads (periods, commas, conjunctions), the matched part is usually just the whitespace.
       splits = text.split(currentSep).filter(s => s.length > 0);
    }

    let currentChunk: string[] = [];
    let currentLen = 0;

    for (const split of splits) {
      const splitLen = this.tokenizer.countTokens(split);

      if (splitLen > limit) {
        // CASE 1: The single split is larger than the limit
        
        // First, commit whatever is pending in the buffer
        if (currentChunk.length > 0) {
          result.push(this._joinChunk(currentChunk, currentSep));
          currentChunk = [];
          currentLen = 0;
        }

        // Then, recurse on this large split using the next separator in hierarchy
        if (nextSeparators.length > 0) {
          this._splitRecursively(split, limit, nextSeparators, result);
        } else {
          // If no separators left (e.g. even characters are too big?), force crop.
          console.warn(`[Chunking] Segment exceeds limit with no separators left. Forced cropping applied.`);
          result.push(this.tokenizer.cropToLimit(split, limit));
        }
      } else {
        // CASE 2: The split fits within limit (individually)
        
        // Check if adding it to current buffer would exceed limit
        // We add a heuristic buffer of 1 token for the separator that will be rejoined
        const estimatedTotal = currentLen + splitLen + 1; 
        
        if (estimatedTotal > limit) {
          // Buffer full, commit it
          result.push(this._joinChunk(currentChunk, currentSep));
          currentChunk = [split];
          currentLen = splitLen;
        } else {
          // Add to buffer
          currentChunk.push(split);
          currentLen += splitLen; // Note: We might be undercounting separator tokens slightly, but usually safe
        }
      }
    }

    // Commit any remaining segments in the buffer
    if (currentChunk.length > 0) {
      result.push(this._joinChunk(currentChunk, currentSep));
    }
  }

  /**
   * Reconstructs the chunk string from parts based on the separator used.
   */
  private _joinChunk(parts: string[], separator: RegExp): string {
    let joinChar = " ";
    
    // Heuristic to determine how to rejoin based on the separator that split them
    if (separator.source.includes("\\n")) {
      joinChar = "\n\n";
    } else if (separator.source === " ") {
      joinChar = " ";
    } else if (separator.source === "|") {
      joinChar = "";
    } else {
      // For lookarounds, we typically split on whitespace, so we restore a single space.
      joinChar = " ";
    }

    return parts.join(joinChar).trim();
  }
}
