
export class ConfigManager {
  private static instance: ConfigManager | null = null;

  // Configuration Properties
  public TOKENIZER_MODEL: string;
  public CHUNK_SIZE: number;
  public CHUNK_OVERLAP: number;
  public SOFT_BREAK_WORDS: string[];
  public PRESERVE_POETRY: boolean;
  public PRESERVE_DIALOGUE: boolean;

  private constructor() {
    // Load from process.env (shimmed in browser) or defaults
    this.TOKENIZER_MODEL = process.env.TOKENIZER_MODEL || "cl100k_base";
    this.CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "512", 10);
    this.CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "50", 10);
    
    // Default Arabic Conjunctions
    const defaultSoftBreaks = [
      "و", "ف", "ثم", "أو", "أم", "بل", "لكن", "لأن", "حيث", "بينما", "كما", "عندما", "لذا"
    ];

    if (process.env.SOFT_BREAK_WORDS) {
      try {
        this.SOFT_BREAK_WORDS = JSON.parse(process.env.SOFT_BREAK_WORDS);
      } catch (e) {
        console.warn("Failed to parse SOFT_BREAK_WORDS from env, using defaults.");
        this.SOFT_BREAK_WORDS = defaultSoftBreaks;
      }
    } else {
      this.SOFT_BREAK_WORDS = defaultSoftBreaks;
    }

    this.PRESERVE_POETRY = (process.env.PRESERVE_POETRY === "true");
    this.PRESERVE_DIALOGUE = (process.env.PRESERVE_DIALOGUE === "true");

    this.validate();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Resets the singleton instance. 
   * Useful when env vars change at runtime (in browser simulation).
   */
  public static reset(): void {
    ConfigManager.instance = null;
  }

  private validate() {
    if (this.CHUNK_OVERLAP >= this.CHUNK_SIZE) {
      throw new Error(`Invalid Configuration: CHUNK_OVERLAP (${this.CHUNK_OVERLAP}) must be less than CHUNK_SIZE (${this.CHUNK_SIZE})`);
    }
  }
}
