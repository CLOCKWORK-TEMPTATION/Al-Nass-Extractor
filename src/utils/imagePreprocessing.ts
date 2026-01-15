/**
 * Image Preprocessing Utilities for OCR Enhancement
 * Provides filters to improve OCR accuracy for Arabic text
 */

export interface PreprocessingOptions {
  grayscale?: boolean;
  binarization?: boolean;
  threshold?: number; // 0-255, default 128
  deskew?: boolean;
  denoise?: boolean;
  contrast?: number; // Multiplier, default 1.0
  brightness?: number; // -255 to 255, default 0
}

/**
 * Main preprocessing function that applies selected filters
 */
export const preprocessImage = async (
  file: File,
  options: PreprocessingOptions
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Get image data
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Apply filters in sequence
        if (options.grayscale) {
          imageData = applyGrayscale(imageData);
        }

        if (options.denoise) {
          imageData = applyDenoise(imageData);
        }

        if (options.contrast !== undefined && options.contrast !== 1.0) {
          imageData = applyContrast(imageData, options.contrast);
        }

        if (options.brightness !== undefined && options.brightness !== 0) {
          imageData = applyBrightness(imageData, options.brightness);
        }

        if (options.binarization) {
          const threshold = options.threshold || 128;
          imageData = applyBinarization(imageData, threshold);
        }

        // Put processed image back
        ctx.putImageData(imageData, 0, 0);

        // Apply deskewing if needed (rotation-based, done on canvas)
        if (options.deskew) {
          applyDeskew(canvas, ctx);
        }

        // Convert canvas to blob then to file
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from canvas'));
            return;
          }

          const processedFile = new File(
            [blob],
            `preprocessed_${file.name}`,
            { type: 'image/png' }
          );

          URL.revokeObjectURL(url);
          resolve(processedFile);
        }, 'image/png');

      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

/**
 * Convert image to grayscale
 */
const applyGrayscale = (imageData: ImageData): ImageData => {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;     // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
    // Alpha channel (i+3) remains unchanged
  }

  return imageData;
};

/**
 * Apply binarization (convert to pure black and white)
 * Uses Otsu's method if threshold is set to 'auto'
 */
const applyBinarization = (imageData: ImageData, threshold: number): ImageData => {
  const data = imageData.data;

  // If not grayscale, convert first
  let grayData = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Apply Otsu's method if threshold is 0 (auto)
  let finalThreshold = threshold;
  if (threshold === 0) {
    finalThreshold = calculateOtsuThreshold(grayData);
  }

  // Apply binarization
  for (let i = 0; i < data.length; i += 4) {
    const gray = grayData[i / 4];
    const binary = gray > finalThreshold ? 255 : 0;
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
  }

  return imageData;
};

/**
 * Otsu's method for automatic threshold calculation
 */
const calculateOtsuThreshold = (grayData: Uint8ClampedArray): number => {
  // Calculate histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < grayData.length; i++) {
    histogram[grayData[i]]++;
  }

  const total = grayData.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * Math.pow(mB - mF, 2);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  return threshold;
};

/**
 * Apply contrast adjustment
 */
const applyContrast = (imageData: ImageData, contrast: number): ImageData => {
  const data = imageData.data;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(factor * (data[i] - 128) + 128);
    data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128);
    data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128);
  }

  return imageData;
};

/**
 * Apply brightness adjustment
 */
const applyBrightness = (imageData: ImageData, brightness: number): ImageData => {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] + brightness);
    data[i + 1] = clamp(data[i + 1] + brightness);
    data[i + 2] = clamp(data[i + 2] + brightness);
  }

  return imageData;
};

/**
 * Simple denoising using median filter (3x3)
 */
const applyDenoise = (imageData: ImageData): ImageData => {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);

  const getPixel = (x: number, y: number, channel: number): number => {
    const idx = (y * width + x) * 4 + channel;
    return data[idx];
  };

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        // Get 3x3 neighborhood
        const neighbors = [
          getPixel(x - 1, y - 1, c), getPixel(x, y - 1, c), getPixel(x + 1, y - 1, c),
          getPixel(x - 1, y, c), getPixel(x, y, c), getPixel(x + 1, y, c),
          getPixel(x - 1, y + 1, c), getPixel(x, y + 1, c), getPixel(x + 1, y + 1, c)
        ];

        // Sort and take median
        neighbors.sort((a, b) => a - b);
        const median = neighbors[4];

        const idx = (y * width + x) * 4 + c;
        output[idx] = median;
      }
    }
  }

  imageData.data.set(output);
  return imageData;
};

/**
 * Detect and correct skew angle using projection profile method
 * This is a simplified version - for production, consider using more robust algorithms
 */
const applyDeskew = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void => {
  const angle = detectSkewAngle(canvas, ctx);

  if (Math.abs(angle) > 0.1) { // Only rotate if angle is significant
    // Save the canvas content
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rotate
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
  }
};

/**
 * Simple skew angle detection using horizontal projection
 */
const detectSkewAngle = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): number => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale for edge detection
  const grayscale = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayscale[i / 4] = gray;
  }

  // Test angles from -10 to +10 degrees
  let bestAngle = 0;
  let maxVariance = 0;

  for (let angle = -10; angle <= 10; angle += 0.5) {
    const variance = calculateProjectionVariance(
      grayscale,
      canvas.width,
      canvas.height,
      angle
    );

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
};

/**
 * Calculate variance of horizontal projection at given angle
 */
const calculateProjectionVariance = (
  grayscale: Uint8ClampedArray,
  width: number,
  height: number,
  angle: number
): number => {
  const rad = (angle * Math.PI) / 180;
  const projection = new Array(height).fill(0);

  // Calculate horizontal projection
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (grayscale[idx] < 128) { // Count dark pixels
        projection[y]++;
      }
    }
  }

  // Calculate variance
  const mean = projection.reduce((a, b) => a + b, 0) / projection.length;
  const variance = projection.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / projection.length;

  return variance;
};

/**
 * Clamp value between 0 and 255
 */
const clamp = (value: number): number => {
  return Math.max(0, Math.min(255, value));
};

/**
 * Get preview of preprocessed image as data URL (for UI preview)
 */
export const getPreprocessedPreview = async (
  file: File,
  options: PreprocessingOptions
): Promise<string> => {
  const processedFile = await preprocessImage(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(processedFile);
  });
};

/**
 * Preset configurations for common scenarios
 */
export const PREPROCESSING_PRESETS = {
  none: {
    grayscale: false,
    binarization: false,
    deskew: false,
    denoise: false,
  },
  basic: {
    grayscale: true,
    binarization: false,
    deskew: false,
    denoise: false,
  },
  standard: {
    grayscale: true,
    binarization: true,
    threshold: 0, // Auto (Otsu's method)
    deskew: true,
    denoise: false,
  },
  aggressive: {
    grayscale: true,
    binarization: true,
    threshold: 128,
    deskew: true,
    denoise: true,
    contrast: 1.2,
  },
} as const;
