// Custom Regex Rule for Text Cleaning
export interface CustomRegexRule {
  id: string;
  name: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
  description?: string;
  flags?: string; // 'g', 'gi', 'gm', etc.
}

export interface ProcessingSettings {
  removeDiacritics: boolean; // Tashkeel
  removeTatweel: boolean;    // Kashida
  normalizeLamAlef: boolean; // Ligatures & Hamza
  ocrEngine: 'gemini-flash'; // Simulating the 'tesseract' vs others choice
  ocrQuality: 'standard' | 'high'; // New option for quality vs speed
  directPdfExtraction: boolean; // Bypass OCR for selectable PDF text

  // Custom Regex Rules for Advanced Text Cleaning
  customRegexRules: CustomRegexRule[];

  // Advanced Analysis Flags
  agenticPlus: boolean;
  invalidateCache: boolean;
  specializedChartParsingAgentic: boolean;
  preserveVerySmallText: boolean;

  // OCR Post-Processing Correction
  correctOcrErrors: boolean; // Apply intelligent correction for common Arabic OCR errors (ى/ي, ه/ة, hamza)

  // Image Preprocessing Options
  imagePreprocessing: boolean; // Enable/disable preprocessing
  preprocessingPreset: 'none' | 'basic' | 'standard' | 'aggressive'; // Preset configurations

  // Smart Batching Settings (for large PDFs)
  enableSmartBatching?: boolean;       // Enable smart batching for large PDFs (default: auto-detect)
  batchSize?: number;                  // Pages per batch (default: auto-calculated based on file size)
  maxConcurrentBatches?: number;       // Maximum concurrent API calls (default: 3)
}

export interface PDFPageImage {
  pageNumber: number;
  imageData: string; // Base64 or Blob URL
  width: number;
  height: number;
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

  // Progress Tracking
  currentStep?: string; // e.g. "OCR Extraction", "Parsing", "Chunking"
  progress?: number; // 0 to 100
  estimatedRemainingTime?: number; // Seconds

  // Smart Batching Progress
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    processingMode: 'single' | 'batched';
  };

  // Pipeline Results (for JSON Export)
  parsedData?: NovelStructure;
  chunkingResult?: ChunkingResult;

  // Hybrid Extraction Metadata
  extractionMethod?: 'local' | 'ocr' | 'hybrid'; // Method used
  qualityMetrics?: {
    textDensity: number;
    garbageRatio: number;
    arabicRatio: number;
    reason: string;
  };

  // PDF Verification Support
  originalFile?: File; // Store original file for verification
  pdfPages?: PDFPageImage[]; // Extracted PDF pages as images
  isPDF?: boolean; // Flag to identify PDF files
}

export enum FileType {
  PDF = 'application/pdf',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  EPUB = 'application/epub+zip',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

// Extended Novel Analysis Types
export interface ExtendedNovelAnalysis {
  metadata: NovelMetadataResult;
  characters: any[]; // CharacterProfile from templates
  dialogues: any[]; // DialogueEntry from templates
  plot_events: any[]; // PlotEvent from plotEventsService
  settings: any[]; // NovelSetting from settingsAnalysisService
  cultural_context?: any; // CulturalContext from culturalContextService
  statistics: {
    total_characters: number;
    total_dialogues: number;
    total_events: number;
    total_settings: number;
  };
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
  overlap_text?: string | null;
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

// --- Novel Metadata Extraction Types (Phase 5) ---

export interface NovelMetadataDataset {
  dataset_version: string;
  language: string;
  created_date: string;
  last_updated: string;
  schema_type: string;
}

export interface NovelTitle {
  primary: string;
  alternative_titles: string[];
  english_translation: string;
}

export interface NovelAuthor {
  full_name: string;
  first_name: string;
  last_name: string;
  nationality: string;
  birth_year: number | null;
  death_year: number | null;
  biography_summary: string;
}

export interface NovelPublication {
  first_published: string | null;
  publisher: string;
  place: string;
  original_language: string;
  copyright_status: string;
}

export interface NovelBasicInfo {
  novel_id: string;
  title: NovelTitle;
  author: NovelAuthor;
  publication: NovelPublication;
}

export interface NovelGenre {
  primary: string;
  secondary: string[];
}

export interface NovelSeriesInfo {
  is_part_of_series: boolean;
  series_name: string;
  series_order: number | null;
  other_parts: string[];
}

export interface NovelTheme {
  theme: string;
  prominence: string;
}

export interface NovelNarrativeStyle {
  perspective: string;
  tense: string;
  tone: string[];
}

export interface NovelLiteraryClassification {
  genre: NovelGenre;
  literary_movement: string;
  series_info: NovelSeriesInfo;
  themes: NovelTheme[];
  narrative_style: NovelNarrativeStyle;
}

export interface NovelSourceFile {
  filename: string;
  file_size_bytes: number | null;
  encoding: string;
}

export interface NovelContentMetrics {
  total_characters: number | null;
  total_words: number | null;
  total_sentences: number | null;
  total_paragraphs: number | null;
  estimated_reading_time_minutes: number | null;
}

export interface NovelStructureInfo {
  chapter_count: number | null;
  parts: number | null;
  has_prologue: boolean;
  has_epilogue: boolean;
  has_sections: boolean;
}

export interface NovelTextStatistics {
  source_file: NovelSourceFile;
  content_metrics: NovelContentMetrics;
  structure: NovelStructureInfo;
  dialogue_ratio: number | null;
  description_ratio: number | null;
  internal_monologue_ratio: number | null;
}

export interface NovelTimePeriod {
  start: string;
  end: string;
  description: string;
}

export interface NovelHistoricalContext {
  major_events: string[];
  political_regime: string;
  social_conditions: string;
}

export interface NovelTimelineCoverage {
  duration_years: number | null;
  span_type: string;
  pacing: string;
}

export interface NovelTemporalSetting {
  time_period: NovelTimePeriod;
  historical_context: NovelHistoricalContext;
  timeline_coverage: NovelTimelineCoverage;
}

export interface NovelPrimaryLocation {
  country: string;
  city: string;
  district: string;
  street: string;
  specific_place: string;
}

export interface NovelSecondaryLocation {
  place: string;
  significance: string;
  frequency: string;
}

export interface NovelGeographicalSetting {
  primary_location: NovelPrimaryLocation;
  secondary_locations: NovelSecondaryLocation[];
  urban_rural: string;
  cultural_region: string;
}

export interface NovelMainCharacter {
  name: string;
  role: string;
  gender: string;
}

export interface NovelCharacterSummary {
  total_characters: number | null;
  main_characters: NovelMainCharacter[];
  character_dynamics: string;
}

export interface NovelNarrativeArc {
  opening: string;
  inciting_incident: string;
  rising_action: string[];
  climax: string;
  falling_action: string[];
  resolution: string;
}

export interface NovelPlotStructure {
  plot_type: string;
  narrative_arc: NovelNarrativeArc;
  subplots: string[];
}

export interface NovelGenderRoles {
  male: string;
  female: string;
}

export interface NovelLanguageVariety {
  narrative: string;
  dialogue: string;
}

export interface NovelCulturalContext {
  religion: string;
  social_class: string;
  family_structure: string;
  gender_roles: NovelGenderRoles;
  customs_traditions: string[];
  language_variety: NovelLanguageVariety;
}

export interface NovelMajorAward {
  award_name: string;
  year: number | null;
  citation: string;
  significance: string;
}

export interface NovelAwardsRecognition {
  major_awards: NovelMajorAward[];
  other_honors: string[];
}

export interface NovelAdaptation {
  type: string;
  year: number | null;
  director: string;
  cast: string[];
  description: string;
}

export interface NovelAIModel {
  model: string;
  purpose: string;
}

export interface NovelExtractionMetadata {
  extraction_date: string;
  extraction_method: string;
  ai_models_used: NovelAIModel[];
  processing_pipeline: string;
  chunk_size: number | null;
  overlap: number | null;
  confidence_score: number | null;
  human_validation_required: boolean;
  extraction_notes: string;
}

export interface NovelDataQuality {
  completeness: number | null;
  accuracy: number | null;
  consistency: number | null;
  validation_status: string;
  last_validation_date: string;
  issues_found: string[];
  recommendations: string[];
}

export interface NovelRelatedResources {
  sequels: string[];
  prequels: string[];
  spin_offs: string[];
  critical_studies: string[];
  external_links: string[];
}

export interface NovelLicenseUsage {
  license_type: string;
  attribution_required: boolean;
  commercial_use: boolean;
  modification_allowed: boolean;
  share_alike: boolean;
}

export interface NovelFullMetadata {
  metadata: NovelMetadataDataset;
  basic_info: NovelBasicInfo;
  literary_classification: NovelLiteraryClassification;
  text_statistics: NovelTextStatistics;
  temporal_setting: NovelTemporalSetting;
  geographical_setting: NovelGeographicalSetting;
  character_summary: NovelCharacterSummary;
  plot_structure: NovelPlotStructure;
  cultural_context: NovelCulturalContext;
  awards_recognition: NovelAwardsRecognition;
  adaptations: NovelAdaptation[];
  extraction_metadata: NovelExtractionMetadata;
  data_quality: NovelDataQuality;
  related_resources: NovelRelatedResources;
  tags_keywords: string[];
  license_usage: NovelLicenseUsage;
}

export interface NovelMetadataResult {
  novel_metadata: NovelFullMetadata;
}
