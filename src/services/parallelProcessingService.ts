/**
 * Parallel Processing Service
 *
 * Manages concurrent processing of PDF batches with rate limiting,
 * retry logic, and progress tracking.
 */

import pLimit from 'p-limit';
import { PDFBatch, BatchProgressCallback, BatchProgress } from './pdfBatchingService';
import { ProcessingSettings } from '../types';

/**
 * Result from processing a single batch
 */
export interface BatchResult {
  batchNumber: number;
  startPage: number;
  endPage: number;
  extractedText: string;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

/**
 * Configuration for parallel processing
 */
export interface ParallelProcessingConfig {
  maxConcurrent: number;          // Maximum concurrent API calls (default: 3)
  retryAttempts: number;          // Number of retry attempts per batch (default: 3)
  retryDelayMs: number;           // Base delay between retries in ms (default: 2000)
  exponentialBackoff: boolean;    // Use exponential backoff for retries (default: true)
  rateLimitPerMinute?: number;    // Maximum requests per minute (for Gemini free tier: 15)
}

/**
 * Default configuration optimized for Gemini API free tier
 */
const DEFAULT_CONFIG: ParallelProcessingConfig = {
  maxConcurrent: 3,                // Process 3 batches at a time
  retryAttempts: 3,
  retryDelayMs: 2000,
  exponentialBackoff: true,
  rateLimitPerMinute: 15          // Gemini free tier limit
};

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requestTimestamps: number[];
  lastCleanup: number;
}

const rateLimiterState: RateLimiterState = {
  requestTimestamps: [],
  lastCleanup: Date.now()
};

/**
 * Implements rate limiting based on requests per minute
 */
const waitForRateLimit = async (config: ParallelProcessingConfig): Promise<void> => {
  if (!config.rateLimitPerMinute) return;

  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Clean up old timestamps (older than 1 minute)
  rateLimiterState.requestTimestamps = rateLimiterState.requestTimestamps.filter(
    timestamp => timestamp > oneMinuteAgo
  );

  // Check if we're at the rate limit
  if (rateLimiterState.requestTimestamps.length >= config.rateLimitPerMinute) {
    const oldestTimestamp = rateLimiterState.requestTimestamps[0];
    const waitTime = 60000 - (now - oldestTimestamp) + 1000; // Add 1s buffer

    if (waitTime > 0) {
      console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // Record this request
  rateLimiterState.requestTimestamps.push(Date.now());
};

/**
 * Implements retry logic with exponential backoff
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  config: ParallelProcessingConfig,
  attemptNumber: number = 1
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Check if this is a rate limit error
    const isRateLimitError =
      error.message?.includes('429') ||
      error.message?.includes('Rate Limit') ||
      error.status === 429;

    // Check if this is a quota error (don't retry)
    const isQuotaError =
      error.message?.includes('403') ||
      error.message?.includes('quota') ||
      error.status === 403;

    if (isQuotaError) {
      throw new Error('تم تجاوز حصة الاستخدام. يرجى التحقق من مفتاح API.');
    }

    if (attemptNumber >= config.retryAttempts) {
      throw error; // Max retries reached
    }

    // Calculate delay
    let delay = config.retryDelayMs;
    if (config.exponentialBackoff) {
      delay = delay * Math.pow(2, attemptNumber - 1);
    }

    // Add extra delay for rate limit errors
    if (isRateLimitError) {
      delay = Math.max(delay, 10000); // At least 10 seconds for rate limits
    }

    console.log(`Attempt ${attemptNumber} failed. Retrying in ${delay / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return retryWithBackoff(fn, config, attemptNumber + 1);
  }
};

/**
 * Processes a single batch with retry and rate limiting
 */
export const processBatchWithRetry = async (
  batch: PDFBatch,
  processingFunction: (batch: PDFBatch) => Promise<string>,
  config: ParallelProcessingConfig,
  progressCallback?: BatchProgressCallback
): Promise<BatchResult> => {
  const startTime = performance.now();

  try {
    // Notify start of processing
    if (progressCallback) {
      progressCallback({
        batchNumber: batch.batchNumber,
        totalBatches: 0, // Will be set by the caller
        startPage: batch.startPage,
        endPage: batch.endPage,
        percentage: 0,
        status: 'processing'
      });
    }

    // Wait for rate limit
    await waitForRateLimit(config);

    // Process with retry
    const extractedText = await retryWithBackoff(
      () => processingFunction(batch),
      config
    );

    const endTime = performance.now();

    // Notify completion
    if (progressCallback) {
      progressCallback({
        batchNumber: batch.batchNumber,
        totalBatches: 0,
        startPage: batch.startPage,
        endPage: batch.endPage,
        percentage: 100,
        status: 'completed'
      });
    }

    return {
      batchNumber: batch.batchNumber,
      startPage: batch.startPage,
      endPage: batch.endPage,
      extractedText,
      processingTimeMs: endTime - startTime,
      success: true
    };

  } catch (error: any) {
    const endTime = performance.now();

    const errorMessage = error.message || 'خطأ غير معروف';

    // Notify error
    if (progressCallback) {
      progressCallback({
        batchNumber: batch.batchNumber,
        totalBatches: 0,
        startPage: batch.startPage,
        endPage: batch.endPage,
        percentage: 0,
        status: 'error',
        error: errorMessage
      });
    }

    return {
      batchNumber: batch.batchNumber,
      startPage: batch.startPage,
      endPage: batch.endPage,
      extractedText: '',
      processingTimeMs: endTime - startTime,
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Processes multiple batches in parallel with concurrency control
 */
export const processBatchesInParallel = async (
  batches: PDFBatch[],
  processingFunction: (batch: PDFBatch) => Promise<string>,
  progressCallback?: BatchProgressCallback,
  config: ParallelProcessingConfig = DEFAULT_CONFIG
): Promise<BatchResult[]> => {

  const totalBatches = batches.length;
  const results: BatchResult[] = [];
  let completedCount = 0;

  // Create concurrency limiter
  const limit = pLimit(config.maxConcurrent);

  console.log(`Starting parallel processing of ${totalBatches} batches with max ${config.maxConcurrent} concurrent requests`);

  // Create wrapped progress callback with percentage calculation
  const wrappedProgressCallback: BatchProgressCallback | undefined = progressCallback
    ? (progress) => {
        const percentage = Math.round((completedCount / totalBatches) * 100);
        progressCallback({
          batchNumber: progress.batchNumber,
          totalBatches,
          startPage: progress.startPage,
          endPage: progress.endPage,
          percentage,
          status: progress.status,
          error: progress.error
        });

        if (progress.status === 'completed' || progress.status === 'error') {
          completedCount++;
        }
      }
    : undefined;

  // Process all batches with concurrency control
  const promises = batches.map((batch) =>
    limit(() => processBatchWithRetry(
      batch,
      processingFunction,
      config,
      wrappedProgressCallback
    ))
  );

  // Wait for all batches to complete
  const batchResults = await Promise.all(promises);

  // Sort results by batch number to maintain order
  batchResults.sort((a, b) => a.batchNumber - b.batchNumber);

  return batchResults;
};

/**
 * Merges batch results into a single text, handling failures gracefully
 */
export const mergeBatchResults = (results: BatchResult[]): {
  mergedText: string;
  successCount: number;
  failureCount: number;
  failedBatches: number[];
  totalProcessingTimeMs: number;
} => {
  let mergedText = '';
  let successCount = 0;
  let failureCount = 0;
  const failedBatches: number[] = [];
  let totalProcessingTimeMs = 0;

  // Sort by batch number to maintain order
  const sortedResults = [...results].sort((a, b) => a.batchNumber - b.batchNumber);

  for (const result of sortedResults) {
    totalProcessingTimeMs += result.processingTimeMs;

    if (result.success && result.extractedText) {
      successCount++;

      // Add batch separator comment for debugging
      mergedText += `\n\n<!-- Batch ${result.batchNumber}: Pages ${result.startPage}-${result.endPage} -->\n\n`;
      mergedText += result.extractedText.trim();

    } else {
      failureCount++;
      failedBatches.push(result.batchNumber);

      // Add error marker
      mergedText += `\n\n<!-- ERROR in Batch ${result.batchNumber} (Pages ${result.startPage}-${result.endPage}): ${result.error || 'Unknown error'} -->\n\n`;
      mergedText += `[خطأ في معالجة الصفحات ${result.startPage}-${result.endPage}]\n\n`;
    }
  }

  return {
    mergedText: mergedText.trim(),
    successCount,
    failureCount,
    failedBatches,
    totalProcessingTimeMs
  };
};

/**
 * Calculates optimal concurrency based on API tier and file size
 */
export const calculateOptimalConcurrency = (
  isFreeTier: boolean,
  totalBatches: number
): number => {
  if (isFreeTier) {
    // Free tier: Conservative approach
    return Math.min(3, totalBatches);
  } else {
    // Paid tier: More aggressive
    return Math.min(5, totalBatches);
  }
};

export { DEFAULT_CONFIG as DEFAULT_PARALLEL_CONFIG };
