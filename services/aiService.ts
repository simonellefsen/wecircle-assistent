
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, AIResult } from "../types";

export const analyzeItem = async (
  images: string[],
  settings: AppSettings
): Promise<AIResult> => {
  // Always use the environment API key for Gemini as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (settings.provider === 'google') {
    const prompt = settings.customPrompt
      .replace('{language}', settings.language)
      .replace('{currency}', settings.currency);

    const imageParts = images.map(img => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.split(',')[1] || img
      }
    }));

    const response = await ai.models.generateContent({
      model: settings.model,
      contents: {
        parts: [
          ...imageParts,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: 'One-line description, max 58 characters.' },
            price: { type: Type.NUMBER, description: 'Resale price value.' },
            brand: { type: Type.STRING },
            type: { type: Type.STRING },
            color: { type: Type.STRING },
            size: { type: Type.STRING },
          },
          propertyOrdering: ['description', 'price', 'brand', 'type', 'color', 'size'],
          required: ['description', 'price']
        }
      }
    });

    const resultStr = response.text;
    if (!resultStr) throw new Error("Ingen respons fra AI");
    
    try {
        return JSON.parse(resultStr) as AIResult;
    } catch (e) {
        throw new Error("Kunne ikke læse AI respons");
    }
  } else {
    throw new Error(`Support for ${settings.provider} er planlagt. Brug venligst Google Gemini i mellemtiden.`);
  }
};