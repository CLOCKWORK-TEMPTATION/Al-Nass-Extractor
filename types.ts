
export interface ProcessingSettings {
  removeDiacritics: boolean; // Tashkeel
  removeTatweel: boolean;    // Kashida
  normalizeLamAlef: boolean; // Ligatures & Hamza
  ocrEngine: 'gemini-flash'; // Simulating the 'tesseract' vs others choice
  ocrQuality: 'standard' | 'high'; // New option for quality vs speed
  directPdfExtraction: boolean; // Bypass OCR for selectable PDF text
  
  // Advanced Analysis Flags
  agenticPlus: boolean;
  invalidateCache: boolean;
  specializedChartParsingAgentic: boolean;
  preserveVerySmallText: boolean;
}

export interface ExtractedFile {
  id: string;
  name: string;
  originalSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText: string;
  processingTime?: number;
  errorMsg?: string;
  wordCount?: number;
}

export enum FileType {
  PDF = 'application/pdf',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp'
}

// --- Parser Types ---

export enum SegmentType {
  NARRATION = "narration",
  DIALOGUE = "dialogue",
  POETRY = "poetry",
  QURAN = "quran",
  HEADING = "heading"
}

export interface Sentence {
  id: number;
  text: string;
}

export interface Segment {
  segment_id: number;
  type: SegmentType;
  text: string;
  speaker?: string;
  word_count: number;
  sentences: Sentence[];
  preserve_format: boolean;
  warning?: string; // New field for parser warnings (e.g., runaway dialogue)
}

export interface Chapter {
  chapter_id: number;
  title: string;
  segments: Segment[];
}

export interface NovelMetadata {
  title: string;
  author: string;
  total_chapters: number;
  total_words: number;
  parse_date: string;
}

export interface NovelStatistics {
  narration_percentage: number;
  dialogue_percentage: number;
  poetry_count: number;
  quran_count: number;
  average_sentence_length: number;
}

export interface NovelStructure {
  novel_metadata: NovelMetadata;
  chapters: Chapter[];
  statistics: NovelStatistics;
}

export interface ParserConfig {
  max_sentence_words: number;
  detect_poetry: boolean;
  detect_quran: boolean;
}

// --- Chunking Types (Mirrored from internal module for App state) ---
export interface Chunk {
  chunk_id: number;
  chapter_id: number;
  chapter_title: string;
  content: string;
  token_count: number;
  char_count: number;
  content_types: string[];
  split_point: string;
  overlap_text: string | null;
  metadata: Record<string, any>;
}

export interface ChunkingResult {
  chunks: Chunk[];
  metadata: {
    total_chunks: number;
    total_tokens: number;
    average_chunk_size: number;
    processing_time_ms: number;
    model_used: string;
  };
}

// --- Classification & Enrichment Types (Phase 4) ---

export interface FastLabels {
  text_type: 'narration' | 'dialogue' | 'poetry' | 'quran' | 'unknown';
  dialect: string;
  dialect_confidence: number;
  sentiment: string;
  sentiment_confidence: number;
  speaker_gender: 'male' | 'female' | 'unknown';
}

export interface LLMAugmentation {
  model_used: string;
  normalized_text?: string;
  reasoning?: string;
  instruction_pair?: {
    question: string;
    answer: string;
  };
  entities?: {
    characters?: string[];
    emotions_expressed?: string[];
    body_language?: string[];
  };
}

export interface EnrichedChunk {
  chunk_id: number; // Mapped from string in original schema to number here matching Chunk ID
  text: string;
  token_count: number;
  fast_labels: FastLabels;
  llm_augmentation: LLMAugmentation | null;
  processing_metadata: {
    bert_inference_ms: number;
    llm_inference_ms: number;
    total_processing_ms: number;
    timestamp: string;
  };
}

// Re-export Novel Metadata types from src/types.ts
export type { NovelMetadataResult } from './src/types';