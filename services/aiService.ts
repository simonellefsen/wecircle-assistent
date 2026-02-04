
import type { AppSettings, AIAnalyzeResponse } from "../types";

export class AnalysisError extends Error {
  constructor(public message: string, public type: 'api' | 'safety' | 'format' | 'network' | 'parse') {
    super(message);
    this.name = 'AnalysisError';
  }
}

export const ANALYZE_API_URL = import.meta.env.VITE_ANALYZE_URL || "/api/analyze";

const buildPrompt = (settings: AppSettings, voiceContext?: string) => {
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

  return prompt;
};

export const analyzeItem = async (
  images: string[],
  settings: AppSettings,
  voiceContext?: string
): Promise<AIAnalyzeResponse> => {
  if (!images || images.length === 0) {
    throw new AnalysisError("Ingen billeder fundet til analyse.", 'format');
  }

  try {
    const response = await fetch(ANALYZE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        images,
        settings,
        prompt: buildPrompt(settings, voiceContext)
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new AnalysisError(message || "API-fejl under analyse.", 'api');
    }

    const result = await response.json();
    if (!result || typeof result !== 'object' || !('result' in result)) {
      throw new AnalysisError("API'et returnerede et uventet format.", 'parse');
    }
    return result as AIAnalyzeResponse;
  } catch (err: any) {
    if (err instanceof AnalysisError) throw err;

    const errMsg = err?.message || "";
    if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
      throw new AnalysisError("Netværksfejl. Tjek din internetforbindelse og prøv igen.", 'network');
    }

    throw new AnalysisError(`Der opstod en uventet fejl under analysen: ${errMsg}`, 'api');
  }
};
