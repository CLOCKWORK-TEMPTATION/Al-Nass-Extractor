
import { getEncoding, Tiktoken } from "js-tiktoken";

export class TokenizerService {
  private static instance: TokenizerService;
  private encoder: Tiktoken;
  private readonly DEFAULT_MODEL = "cl100k_base";

  private constructor() {
    try {
      // cl100k_base is the encoding used by GPT-3.5, GPT-4, and a good proxy for Gemini limits
      this.encoder = getEncoding(this.DEFAULT_MODEL);
    } catch (e) {
      console.warn(`Model ${this.DEFAULT_MODEL} not found, falling back to r50k_base`);
      this.encoder = getEncoding("r50k_base");
    }
  }

  public static getInstance(): TokenizerService {
    if (!TokenizerService.instance) {
      TokenizerService.instance = new TokenizerService();
    }
    return TokenizerService.instance;
  }

  /**
   * Counts the number of tokens in a text string.
   */
  public countTokens(text: string): number {
    if (!text) return 0;
    // Fast approximation for length check before heavy encode
    if (text.length < 100) return this.encoder.encode(text).length;
    
    return this.encoder.encode(text).length;
  }

  /**
   * Encodes text into an array of token integers.
   */
  public encode(text: string): Uint32Array {
    return this.encoder.encode(text);
  }

  /**
   * Decodes an array of token integers back into a string.
   */
  public decode(tokens: number[] | Uint32Array): string {
    const arr = tokens instanceof Uint32Array ? Array.from(tokens) : tokens;
    return new TextDecoder().decode(this.encoder.decode(arr));
  }

  /**
   * Crops the text to strictly fit within the token limit.
   * Decoding ensures we don't split multi-byte Arabic characters.
   */
  public cropToLimit(text: string, limit: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= limit) return text;
    
    const croppedTokens = tokens.slice(0, limit);
    return new TextDecoder().decode(this.encoder.decode(croppedTokens));
  }

  /**
   * Returns the last N tokens of the text (useful for sliding context windows).
   */
  public getLastTokens(text: string, count: number): string {
    const tokens = this.encoder.encode(text);
    if (tokens.length <= count) return text;

    const lastTokens = tokens.slice(tokens.length - count);
    return new TextDecoder().decode(this.encoder.decode(lastTokens));
  }
}
