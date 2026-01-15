
import { GoogleGenAI } from "@google/genai";
import { preprocessImage, PREPROCESSING_PRESETS } from '../utils/imagePreprocessing';

const getApiKey = (): string => {
  // Use the global process.env shim
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("مفتاح API غير موجود. يرجى التأكد من ضبط process.env.API_KEY.");
  }
  return key;
};

// Initialize client
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: getApiKey() });
} catch (e) {
  console.error("Failed to initialize Media Service Client:", e);
}

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeImage = async (file: File, prompt: string = "Analyze this image in detail and describe the visual elements, text, and overall context."): Promise<string> => {
  if (!ai) throw new Error("AI Client not initialized");
  
  const imagePart = await fileToGenerativePart(file);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [imagePart, { text: prompt }]
    }
  });
  
  return response.text || "لم يتم إنشاء تحليل للصورة.";
};

export const editImage = async (file: File, prompt: string): Promise<string> => {
  if (!ai) throw new Error("AI Client not initialized");

  const imagePart = await fileToGenerativePart(file);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        imagePart,
        { text: prompt }
      ]
    }
  });

  // Iterate to find the image part in the response
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("لم ينجح النموذج في توليد صورة معدلة.");
};

export const searchWithGrounding = async (query: string): Promise<{ text: string, sources: any[] }> => {
  if (!ai) throw new Error("AI Client not initialized");

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return {
    text: response.text || "لا توجد إجابة.",
    sources: sources
  };
};
