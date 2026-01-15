
import { ChunkingService } from "./services/ChunkingService";
import { InputStructure, ChunkingResult, InputStructureSchema } from "./types";
import { ConfigManager } from "./config";

/**
 * Main facade for the Chunking Module.
 */
export class ChunkingProcessor {
  private service: ChunkingService;
  private config: ConfigManager;

  constructor() {
    this.service = new ChunkingService();
    this.config = ConfigManager.getInstance();
  }

  /**
   * Validates input and runs the chunking process.
   * @param input The parsed NovelStructure object or a JSON string.
   */
  public run(input: InputStructure | string): ChunkingResult {
    let parsedInput: InputStructure;

    // 1. Validation & Parsing
    try {
      if (typeof input === 'string') {
        const rawObj = JSON.parse(input);
        parsedInput = InputStructureSchema.parse(rawObj);
      } else {
        parsedInput = InputStructureSchema.parse(input);
      }
    } catch (e: any) {
      console.error("[Chunking] Input validation failed:", e);
      throw new Error(`Invalid Input Structure: ${e.message}`);
    }

    // 2. Execution
    const result = this.service.process(parsedInput);

    // 3. Reporting
    this.logReport(result);

    return result;
  }

  /**
   * structured logging similar to Python's Rich library
   */
  private logReport(result: ChunkingResult) {
    const meta = result.metadata;
    const styles = {
      title: "font-weight: bold; color: #4f46e5; font-size: 14px;", // Indigo
      label: "font-weight: bold; color: #475569;", // Slate-600
      val: "color: #0f172a;", // Slate-900
      success: "color: #16a34a;", // Green
    };

    console.group("%c📊 Chunking Report", styles.title);
    
    console.log(`%cTotal Chunks:      %c${meta.total_chunks}`, styles.label, styles.val);
    console.log(`%cTotal Tokens:      %c${meta.total_tokens}`, styles.label, styles.val);
    console.log(`%cAvg Chunk Size:    %c${meta.average_chunk_size.toFixed(2)} tokens`, styles.label, styles.val);
    console.log(`%cProcessing Time:   %c${meta.processing_time_ms.toFixed(2)} ms`, styles.label, styles.val);
    
    // Detailed stats
    const splitCounts = result.chunks.reduce((acc, c) => {
      acc[c.split_point] = (acc[c.split_point] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.groupCollapsed("✂️ Split Point Statistics");
    console.table(splitCounts);
    console.groupEnd();

    console.log(`%c✨ Process Completed Successfully`, styles.success);
    console.groupEnd();
  }
}

// Export Singleton Instance for convenience
export const chunker = new ChunkingProcessor();
