
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, AIResult } from "../types";

export const analyzeItem = async (
  images: string[],
  settings: AppSettings,
  voiceContext?: string
): Promise<AIResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = settings.customPrompt
    .replace('{language}', settings.language)
    .replace('{currency}', settings.currency);

  prompt += `\n\nBrug Google Search til at finde lignende varer til salg online. Prioritér Trendsales, DBA eller officielle shops. Find nyprisen.`;

  if (voiceContext) {
    prompt += `\n\nBRUGER-KONTEKST (Vigtigt!): ${voiceContext}`;
  }

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
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          price: { type: Type.NUMBER },
          priceNew: { type: Type.NUMBER },
          brand: { type: Type.STRING },
          type: { type: Type.STRING },
          color: { type: Type.STRING },
          size: { type: Type.STRING },
          condition: { type: Type.STRING },
          similarLinks: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }
          }
        },
        required: ['description', 'price']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Ingen respons");
  return JSON.parse(text) as AIResult;
};
