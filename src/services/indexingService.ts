
import { HfInference } from '@huggingface/inference';
import { EnrichedChunk, CustomRegexRule } from '../types';

// =============================================================================
// 1. Constants & Model Registry
// =============================================================================

export interface ModelDefinition {
  id: string;
  name: string;
  dimensions: number;
  description?: string;
}

export const EMBEDDING_MODELS: Record<'gemini' | 'openai' | 'huggingface', ModelDefinition[]> = {
  gemini: [
    { 
      id: 'gemini-embedding-001', 
      name: 'Gemini Embedding 001 (Recommended)', 
      dimensions: 768,
      description: 'Google's latest embedding model for multilingual text.' 
    }
  ],
  openai: [
    { 
      id: 'text-embedding-3-small', 
      name: 'OpenAI v3 Small (Recommended)', 
      dimensions: 1536,
      description: 'Cost-effective, high performance.' 
    },
    { 
      id: 'text-embedding-3-large', 
      name: 'OpenAI v3 Large', 
      dimensions: 3072,
      description: 'Highest precision for complex tasks.' 
    },
    { 
      id: 'text-embedding-ada-002', 
      name: 'Ada 002 (Legacy)', 
      dimensions: 1536,
      description: 'Older generation model.' 
    }
  ],
  huggingface: [
    { 
      id: 'intfloat/multilingual-e5-large', 
      name: 'Multilingual E5 Large', 
      dimensions: 1024,
      description: 'Excellent for Arabic retrieval.' 
    },
    { 
      id: 'intfloat/multilingual-e5-small', 
      name: 'Multilingual E5 Small', 
      dimensions: 384,
      description: 'Fast and lightweight.' 
    },
    { 
      id: 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2', 
      name: 'Paraphrase Multilingual MPNet', 
      dimensions: 768,
      description: 'Balanced performance/speed.' 
    },
    { 
      id: 'sentence-transformers/LaBSE', 
      name: 'LaBSE', 
      dimensions: 768,
      description: 'Language-Agnostic BERT Sentence Embedding.' 
    },
    {
      id: 'Ubiquitous/arabic-bert-base-embedding',
      name: 'Arabic BERT Base (Ubiquitous)',
      dimensions: 768,
      description: 'Specialized Arabic model.'
    }
  ]
};

export const getModelDimensions = (provider: 'gemini' | 'openai' | 'huggingface', modelId: string): number => {
  const model = EMBEDDING_MODELS[provider].find(m => m.id === modelId);
  if (model) return model.dimensions;
  
  // Fallbacks if custom model string is used without explicit dimension handling elsewhere
  if (provider === 'gemini') return 768;
  if (provider === 'openai') return 1536;
  return 768; // Common default for HF BERT models
};

// =============================================================================
// 2. Utilities (Retry Logic & Text Processing)
// =============================================================================

export class RetryHandler {
  /**
   * Executes a function with exponential backoff retry logic.
   * @param fn The async function to execute.
   * @param context Description of the operation for logging.
   * @param maxRetries Maximum number of attempts (default: 3).
   * @param baseDelay Initial delay in ms (default: 2000).
   */
  static async execute<T>(
    fn: () => Promise<T>, 
    context: string, 
    maxRetries: number = 3, 
    baseDelay: number = 2000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if it's a 401 (Auth Error) or 400 (Bad Request) usually
        const status = error?.status || error?.response?.status;
        if (status === 401 || status === 403) {
          throw error; // Auth errors are fatal
        }

        if (attempt === maxRetries) break;

        const delay = baseDelay * Math.pow(2, attempt); // Exponential: 2s, 4s, 8s...
        const jitter = Math.random() * 200; // Add randomness to prevent thundering herd
        const totalDelay = delay + jitter;

        console.warn(`[${context}] Failed attempt ${attempt + 1}/${maxRetries}. Retrying in ${Math.round(totalDelay)}ms. Error: ${error.message}`);
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
    
    throw new Error(`[${context}] Failed after ${maxRetries} retries. Last error: ${lastError.message}`);
  }
}

export class ArabicNormalizer {
  static normalize(text: string, customRules?: CustomRegexRule[]): string {
    if (!text) return '';

    let result = text
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Tashkeel
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة(\s|$)/g, 'ه$1')
      .replace(/ـ/g, ''); // Remove Tatweel

    // Apply custom regex rules if provided
    if (customRules && customRules.length > 0) {
      result = this.applyCustomRules(result, customRules);
    }

    return result;
  }

  static cleanProcess(text: string, customRules?: CustomRegexRule[]): string {
    let result = text.replace(/[^\w\s\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim();

    // Apply custom regex rules if provided
    if (customRules && customRules.length > 0) {
      result = this.applyCustomRules(result, customRules);
    }

    return result;
  }

  /**
   * Applies custom regex rules to the text
   * @param text The text to process
   * @param rules Array of custom regex rules
   * @returns Processed text with rules applied
   */
  static applyCustomRules(text: string, rules: CustomRegexRule[]): string {
    if (!text || !rules || rules.length === 0) return text;

    let result = text;

    // Apply only enabled rules in order
    rules
      .filter(rule => rule.enabled && rule.pattern)
      .forEach(rule => {
        try {
          const regex = new RegExp(rule.pattern, rule.flags || 'g');

          // Handle escape sequences in replacement (like \n, \t)
          const replacementText = rule.replacement
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r');

          result = result.replace(regex, replacementText);
        } catch (error) {
          console.error(`[ArabicNormalizer] Error applying custom rule "${rule.name}":`, error);
          // Continue with other rules even if one fails
        }
      });

    return result;
  }
}

export class BoilerplateDetector {
  private stopPhrases: string[] = [
    'بسم الله الرحمن الرحيم',
    'حقوق النشر محفوظة',
    'الفصل الأول', 'الفصل الثاني',
    'جميع الحقوق محفوظة',
    'طبعة أولى',
    '***'
  ];

  isBoilerplate(text: string): boolean {
    const normalized = ArabicNormalizer.normalize(text);
    if (normalized.length < 10) return true;
    if (this.stopPhrases.some(phrase => normalized.includes(ArabicNormalizer.normalize(phrase)))) {
      return true;
    }
    return false;
  }
}

export class IDGenerator {
  static async generate(content: string, source: string, page: number): Promise<string> {
    const data = `${source}|${page}|${content.trim()}`;
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
  }
  
  static async generateUUIDLike(content: string, source: string, page: number): Promise<string> {
    const id = await this.generate(content, source, page);
    // Format as UUID-ish: 8-4-4-4-12 (padded)
    const padded = id.padEnd(32, '0');
    return `${padded.substring(0,8)}-${padded.substring(8,12)}-${padded.substring(12,16)}-${padded.substring(16,20)}-${padded.substring(20,32)}`;
  }
}

// =============================================================================
// 3. Embedder
// =============================================================================

export interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
}

export class GeminiEmbedder implements EmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-embedding-001') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT'
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini Embedding Error: ${response.statusText}`);
      }

      const data = await response.json();
      embeddings.push(data.embedding.values);
    }
    
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY'
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Embedding Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding.values;
  }
}

export class HuggingFaceEmbedder implements EmbeddingProvider {
  private hf: HfInference;
  private model: string;

  constructor(apiKey: string, model: string = 'intfloat/multilingual-e5-large') {
    this.hf = new HfInference(apiKey);
    this.model = model;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const response = await this.hf.featureExtraction({
      model: this.model,
      inputs: texts,
    });
    
    // HF Inference API returns (number[]) for single input or (number[][]) for multiple
    // We strictly want number[][]
    if (Array.isArray(response) && response.length > 0) {
        if (typeof response[0] === 'number') {
            return [response as number[]];
        } else {
            return response as number[][];
        }
    }
    return [];
  }
}

// Simple OpenAI implementation via fetch to avoid full SDK size if not needed
export class OpenAIEmbedder implements EmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
            model: this.model,
            input: texts
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    // Sort by index to ensure order matches input
    return data.data.sort((a: any, b: any) => a.index - b.index).map((item: any) => item.embedding);
  }
}

// =============================================================================
// 4. Vector DB (Qdrant)
// =============================================================================

export class QdrantClient {
  private baseUrl: string;
  private apiKey: string;
  private collection: string;

  constructor(url: string, apiKey: string, collection: string) {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
    this.collection = collection;
  }

  private getHeaders(): HeadersInit {
    const headers: any = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['api-key'] = this.apiKey;
    return headers;
  }

  async ensureCollection(dimensions: number) {
    try {
        const checkRes = await fetch(`${this.baseUrl}/collections/${this.collection}`, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (checkRes.status === 404) {
            console.log(`Creating collection: ${this.collection} with ${dimensions} dimensions`);
            const res = await fetch(`${this.baseUrl}/collections/${this.collection}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    vectors: {
                        size: dimensions,
                        distance: 'Cosine'
                    }
                })
            });
            if (!res.ok) throw new Error(await res.text());
        } else {
            // Check if existing dimensions match
            const data = await checkRes.json();
            const existingDim = data.result?.config?.params?.vectors?.size || data.result?.config?.params?.vectors?.default?.size;
            if (existingDim && existingDim !== dimensions) {
               throw new Error(`Collection exists with dimension ${existingDim}, but selected model uses ${dimensions}. Please use a different collection name.`);
            }
        }
    } catch (e: any) {
        throw new Error(`Qdrant Connection Error: ${e.message}. Check CORS and URL.`);
    }
  }

  async upsert(points: any[]) {
    const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points?wait=true`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ points: points })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Qdrant Upsert Failed: ${err}`);
    }
  }

  async search(vector: number[], topK: number = 5) {
    const response = await fetch(`${this.baseUrl}/collections/${this.collection}/points/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        vector: vector,
        limit: topK,
        with_payload: true
      })
    });
    return response.json();
  }
}

// =============================================================================
// 5. Indexer Pipeline
// =============================================================================

export interface IndexingConfig {
    qdrantUrl: string;
    qdrantApiKey: string;
    collectionName: string;
    embeddingProvider: 'gemini' | 'huggingface' | 'openai';
    embeddingApiKey: string;
    embeddingModel: string;
    customModelName?: string; // For custom user-defined models
    manualDimensions?: number; // For custom models where dim is unknown
    detectBoilerplate: boolean;
    batchSize: number;
    maxRetries?: number;
    retryDelay?: number;
    customRegexRules?: CustomRegexRule[]; // Custom regex rules for text cleaning
}

export class IndexerPipeline {
  private config: IndexingConfig;
  private embedder: EmbeddingProvider;
  private vectorDB: QdrantClient;
  private boilerplateDetector = new BoilerplateDetector();

  constructor(config: IndexingConfig) {
    this.config = config;
    this.vectorDB = new QdrantClient(config.qdrantUrl, config.qdrantApiKey, config.collectionName);
    
    // Resolve Model Name: Use custom name if 'custom' is selected, otherwise use ID
    const targetModel = config.embeddingModel === 'custom' && config.customModelName 
      ? config.customModelName 
      : (config.embeddingModel || 'gemini-embedding-001');

    if (config.embeddingProvider === 'gemini') {
        this.embedder = new GeminiEmbedder(config.embeddingApiKey, targetModel);
    } else if (config.embeddingProvider === 'openai') {
        this.embedder = new OpenAIEmbedder(config.embeddingApiKey, targetModel);
    } else {
        this.embedder = new HuggingFaceEmbedder(config.embeddingApiKey, targetModel);
    }
  }

  async initialize(dimensions: number) {
    // Retry initialization connection as well
    await RetryHandler.execute(
        () => this.vectorDB.ensureCollection(dimensions),
        "Init Collection",
        this.config.maxRetries || 3,
        this.config.retryDelay || 2000
    );
  }

  async processBatch(chunks: EnrichedChunk[], sourceFileName: string) {
    // 1. Prepare texts
    const textsToEmbed = chunks.map(c => {
        // Toggle Boilerplate: Only check if enabled in config
        if (this.config.detectBoilerplate && this.boilerplateDetector.isBoilerplate(c.text)) {
            return '';
        }

        // E5 model specific prefix (for known E5 models or if custom name contains 'e5')
        const modelNameLower = (this.config.embeddingModel === 'custom' && this.config.customModelName)
            ? this.config.customModelName.toLowerCase()
            : this.config.embeddingModel.toLowerCase();

        const processed = ArabicNormalizer.cleanProcess(c.text, this.config.customRegexRules);
        if (modelNameLower.includes('e5')) {
            return `query: ${processed}`;
        }
        return processed;
    });

    // 2. Identify indices that need embedding (non-boilerplate)
    const validIndices: number[] = [];
    const validTexts: string[] = [];
    
    textsToEmbed.forEach((t, i) => {
        if (t !== '') {
            validIndices.push(i);
            validTexts.push(t);
        }
    });

    let vectors: number[][] = [];
    
    // 3. Batch Embedding Call
    if (validTexts.length > 0) {
        // RETRY MECHANISM: Embedding Generation (Batched)
        vectors = await RetryHandler.execute(
            () => this.embedder.embedDocuments(validTexts),
            "Embedding Generation",
            this.config.maxRetries || 3,
            this.config.retryDelay || 2000
        );
    }

    const points = [];
    let vectorIndex = 0;

    // 4. Map vectors back to original chunks
    for (let i = 0; i < chunks.length; i++) {
        // If this chunk was skipped (boilerplate), continue
        if (textsToEmbed[i] === '') {
            continue;
        }

        const vec = vectors[vectorIndex++];
        if (!vec) continue;

        const chunk = chunks[i];

        // Metadata & Payload
        const processedText = ArabicNormalizer.cleanProcess(chunk.text, this.config.customRegexRules);
        const normalizedText = ArabicNormalizer.normalize(chunk.text, this.config.customRegexRules);
        
        // Generate UUID
        const id = await IDGenerator.generateUUIDLike(chunk.text, sourceFileName, 0);

        points.push({
            id: id,
            vector: vec,
            payload: {
                content: {
                    raw_text: chunk.text,
                    processed_text: processedText,
                    normalized_text: normalizedText
                },
                position: {
                    source_file: sourceFileName,
                    chunk_id: chunk.chunk_id
                },
                classification: chunk.fast_labels,
                metadata: {
                    augmented: !!chunk.llm_augmentation,
                    token_count: chunk.token_count,
                    indexed_at: new Date().toISOString(),
                    model: this.config.embeddingModel === 'custom' ? this.config.customModelName : this.config.embeddingModel
                }
            }
        });
    }

    if (points.length > 0) {
        // RETRY MECHANISM: Vector DB Upsert
        await RetryHandler.execute(
            () => this.vectorDB.upsert(points),
            "Qdrant Upsert",
            this.config.maxRetries || 3,
            this.config.retryDelay || 2000
        );
    }

    return points.length;
  }

  async search(query: string) {
    let normalizedQuery = ArabicNormalizer.cleanProcess(query, this.config.customRegexRules);

    const modelNameLower = (this.config.embeddingModel === 'custom' && this.config.customModelName)
        ? this.config.customModelName.toLowerCase()
        : this.config.embeddingModel.toLowerCase();

    // E5 models require "query: " prefix for asymmetric tasks
    if (modelNameLower.includes('e5')) {
        normalizedQuery = `query: ${normalizedQuery}`;
    }
    
    // Retry both embedding and search for robustness
    const [vector] = await RetryHandler.execute(
        () => this.embedder.embedDocuments([normalizedQuery]),
        "Search Embedding",
        2, 
        1000
    );
    
    return await RetryHandler.execute(
        () => this.vectorDB.search(vector, 5),
        "Qdrant Search",
        2,
        1000
    );
  }
}
