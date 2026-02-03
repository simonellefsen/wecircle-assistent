
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, AIResult } from "../types";

export class AnalysisError extends Error {
  constructor(public message: string, public type: 'api' | 'safety' | 'format' | 'network' | 'parse') {
    super(message);
    this.name = 'AnalysisError';
  }
}

export const analyzeItem = async (
  images: string[],
  settings: AppSettings,
  voiceContext?: string
): Promise<AIResult> => {
  if (!images || images.length === 0) {
    throw new AnalysisError("Ingen billeder fundet til analyse.", 'format');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = settings.customPrompt
    .replace('{language}', settings.language)
    .replace('{currency}', settings.currency);

  prompt += `\n\nSØGEINSTRUKTION (VIGTIGT):
Brug Google Search til at finde 2-3 lignende varer til salg online for at validere prisen og finde referencer.
Du SKAL prioritere at finde links fra de danske genbrugsplatforme 'Trendsales' og 'DBA' (Den Blå Avis).
1. Søg specifikt efter varen på Trendsales og DBA først.
2. Kun hvis du ikke finder relevante match på disse platforme, må du inkludere links fra generelle webshops eller internationale sider.
3. Forsøg altid at finde og verificere varens nuværende nypris (priceNew).
4. Inkludér alle fundne links i 'similarLinks' feltet.`;

  if (voiceContext) {
    prompt += `\n\nBRUGER-KONTEKST (Vigtigt!): ${voiceContext}`;
  }

  const imageParts = images.map((img, index) => {
    const parts = img.split(',');
    if (parts.length < 2) {
      throw new AnalysisError(`Billede ${index + 1} er i et ugyldigt format.`, 'format');
    }
    return {
      inlineData: {
        mimeType: "image/jpeg",
        data: parts[1]
      }
    };
  });

  try {
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
            material: { type: Type.STRING },
            style: { type: Type.STRING },
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
    
    if (!text) {
      // Check for safety ratings if text is missing
      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new AnalysisError("Analysen blev blokeret af sikkerhedshensyn. Billedet kan indeholde upassende indhold.", 'safety');
      }
      throw new AnalysisError("AI'en returnerede en tom respons. Prøv venligst igen.", 'api');
    }

    try {
      return JSON.parse(text) as AIResult;
    } catch (parseErr) {
      console.error("Parse error:", text);
      throw new AnalysisError("Kunne ikke læse AI-svaret. Formatet var ugyldigt.", 'parse');
    }
  } catch (err: any) {
    if (err instanceof AnalysisError) throw err;
    
    const errMsg = err.message || "";
    if (errMsg.includes("fetch")) {
      throw new AnalysisError("Netværksfejl. Tjek din internetforbindelse og prøv igen.", 'network');
    }
    if (errMsg.includes("429")) {
      throw new AnalysisError("API-begrænsning nået (Too Many Requests). Vent et øjeblik og prøv igen.", 'api');
    }
    if (errMsg.includes("API_KEY_INVALID")) {
      throw new AnalysisError("Ugyldig API-nøgle. Tjek dine indstillinger.", 'api');
    }
    
    throw new AnalysisError(`Der opstod en uventet fejl under analysen: ${err.message}`, 'api');
  }
};
