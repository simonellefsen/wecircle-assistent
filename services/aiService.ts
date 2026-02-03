
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, AIResult } from "../types";

export const analyzeItem = async (
  images: string[],
  settings: AppSettings
): Promise<AIResult> => {
  // Priority: User provided key in settings -> Environment key (only for Google)
  const userKey = settings.apiKeys[settings.provider];
  const googleEnvKey = process.env.API_KEY;

  if (settings.provider === 'google') {
    const apiKey = userKey || googleEnvKey;
    if (!apiKey) throw new Error("Google API nøgle mangler. Venligst tilføj den i indstillinger.");
    
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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
          required: ['description', 'price']
        }
      }
    });

    const resultStr = response.text;
    if (!resultStr) throw new Error("Ingen respons fra AI");
    return JSON.parse(resultStr) as AIResult;
  } else {
    // Check for API key for other providers
    if (!userKey) {
      throw new Error(`API nøgle til ${settings.provider} mangler. Venligst tilføj den i indstillinger.`);
    }

    // In a full implementation, we'd use fetch() to talk to OpenAI/Anthropic/xAI.
    // Since this is a specialized environment optimized for Gemini, 
    // we'll guide the user to provide the key first.
    throw new Error(`Support for ${settings.provider} er planlagt. Brug venligst Google Gemini i mellemtiden (kræver ingen ekstra nøgle).`);
  }
};
