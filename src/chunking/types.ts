
import { z } from "zod";
import { SegmentType } from "../types";

// 1. SplitPointType Enum
export const SplitPointTypeSchema = z.enum([
  "paragraph",
  "period",
  "comma",
  "conjunction",
  "space",
  "dialogue_complete",
  "poetry_complete",
  "forced_limit"
]);

export type SplitPointType = z.infer<typeof SplitPointTypeSchema>;

// 2. Chunk Interface
export const ChunkSchema = z.object({
  chunk_id: z.number().int().nonnegative(),
  chapter_id: z.number().int().nonnegative(),
  chapter_title: z.string(),
  content: z.string(),
  token_count: z.number().int().nonnegative(),
  char_count: z.number().int().nonnegative(),
  content_types: z.array(z.string()), // e.g., ['narration', 'dialogue'] contained in this chunk
  split_point: SplitPointTypeSchema,
  overlap_text: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).default({})
});

export type Chunk = z.infer<typeof ChunkSchema>;

// 3. Chunking Results
export const ChunkingMetadataSchema = z.object({
  total_chunks: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  average_chunk_size: z.number(),
  processing_time_ms: z.number(),
  model_used: z.string()
});

export type ChunkingMetadata = z.infer<typeof ChunkingMetadataSchema>;

export const ChunkingResultSchema = z.object({
  chunks: z.array(ChunkSchema),
  metadata: ChunkingMetadataSchema
});

export type ChunkingResult = z.infer<typeof ChunkingResultSchema>;

// 4. Input Structures (from Parser Module)
// We redefine these with Zod to ensure runtime safety when crossing module boundaries

export const SentenceSchema = z.object({
  id: z.number(),
  text: z.string()
});

export const InputSegmentSchema = z.object({
  segment_id: z.number(),
  type: z.nativeEnum(SegmentType), // Uses the enum from global types
  text: z.string(),
  speaker: z.string().optional(),
  word_count: z.number(),
  sentences: z.array(SentenceSchema),
  preserve_format: z.boolean(),
  warning: z.string().optional()
});

export type InputSegment = z.infer<typeof InputSegmentSchema>;

export const InputChapterSchema = z.object({
  chapter_id: z.number(),
  title: z.string(),
  segments: z.array(InputSegmentSchema)
});

export type InputChapter = z.infer<typeof InputChapterSchema>;

export const InputNovelMetadataSchema = z.object({
  title: z.string(),
  author: z.string(),
  total_chapters: z.number(),
  total_words: z.number(),
  parse_date: z.string()
});

export const InputStructureSchema = z.object({
  novel_metadata: InputNovelMetadataSchema,
  chapters: z.array(InputChapterSchema),
  // We can include statistics if needed, but it's optional for chunking
  statistics: z.any().optional() 
});

export type InputStructure = z.infer<typeof InputStructureSchema>;
