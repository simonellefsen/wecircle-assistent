
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, AIResult } from "../types";

export const analyzeItem = async (
  images: string[],
  settings: AppSettings,
  contextMetadata?: string
): Promise<AIResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (settings.provider === 'google') {
    let prompt = settings.customPrompt
      .replace('{language}', settings.language)
      .replace('{currency}', settings.currency);

    if (contextMetadata) {
      prompt += `\n\nEkstra kontekst fra brugeren (brug disse rettede værdier til din analyse): ${contextMetadata}. 
      Brug Google Search til at finde en lignende vare til salg nu for at validere prisen. 
      Inkluder et direkte link til en lignende vare i feltet 'similarLink'.`;
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
            description: { type: Type.STRING, description: 'One-line description, max 58 characters.' },
            price: { type: Type.NUMBER, description: 'Resale price value.' },
            brand: { type: Type.STRING },
            type: { type: Type.STRING },
            color: { type: Type.STRING },
            size: { type: Type.STRING },
            material: { type: Type.STRING },
            condition: { type: Type.STRING },
            style: { type: Type.STRING },
            similarLink: { type: Type.STRING, description: 'URL to a similar item found online.' }
          },
          propertyOrdering: ['description', 'price', 'brand', 'type', 'color', 'size', 'material', 'condition', 'style', 'similarLink'],
          required: ['description', 'price']
        }
      }
    });

    const resultStr = response.text;
    if (!resultStr) throw new Error("Ingen respons fra AI");
    
    try {
        const parsed = JSON.parse(resultStr);
        return parsed as AIResult;
    } catch (e) {
        throw new Error("Kunne ikke læse AI respons");
    }
  } else {
    throw new Error(`Support for ${settings.provider} er planlagt. Brug venligst Google Gemini i mellemtiden.`);
  }
};
