
import { getEncoding, Tiktoken, TiktokenModel } from "js-tiktoken";
import { ConfigManager } from "../config";

export class TokenizerService {
  private static instance: TokenizerService;
  private encoder: Tiktoken;
  private config: ConfigManager;

  private constructor() {
    this.config = ConfigManager.getInstance();
    const modelName = this.config.TOKENIZER_MODEL as TiktokenModel;
    
    try {
      this.encoder = getEncoding(modelName);
    } catch (e) {
      console.warn(`Tokenizer model '${modelName}' not found or not supported in browser, falling back to 'cl100k_base'`);
      this.encoder = getEncoding("cl100k_base");
    }
  }

  public static getInstance(): TokenizerService {
    if (!TokenizerService.instance) {
      TokenizerService.instance = new TokenizerService();
    }
    return TokenizerService.instance;
  }

  /**
   * Counts tokens in the given text.
   */
  public countTokens(text: string): number {
    if (!text) return 0;
    // Fast path for very short strings to avoid encoding overhead if needed
    // But encoding is fast enough generally.
    return this.encoder.encode(text).length;
  }

  /**
   * Encodes text to token array.
   */
  public encode(text: string): Uint32Array {
    return this.encoder.encode(text);
  }

  /**
   * Decodes token array to string.
   */
  public decode(tokens: number[] | Uint32Array): string {
    const arr = tokens instanceof Uint32Array ? Array.from(tokens) : tokens;
    return new TextDecoder().decode(this.encoder.decode(arr));
  }

  /**
   * Truncates text to a maximum token limit without breaking unicode characters.
   */
  public cropToLimit(text: string, limit: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= limit) return text;
    
    const croppedTokens = tokens.slice(0, limit);
    return new TextDecoder().decode(this.encoder.decode(croppedTokens));
  }

  /**
   * Retrieves the last N tokens from the text (useful for overlap calculations).
   */
  public getLastTokens(text: string, count: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= count) return text;

    const lastTokens = tokens.slice(tokens.length - count);
    return new TextDecoder().decode(this.encoder.decode(lastTokens));
  }
}
