import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import type { AppSettings, AIResult } from "../types";

type AnalyzePayload = {
  images: string[];
  settings: AppSettings;
  prompt: string;
};

type ProviderHandler = (args: {
  images: string[];
  prompt: string;
  settings: AppSettings;
  apiKey: string;
}) => Promise<AIResult>;

const PROVIDER_ENV_MAP: Record<string, string> = {
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

const REQUIRED_FIELDS = ["description", "price"] as const;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    price: { type: "number" },
    priceNew: { type: "number" },
    brand: { type: "string" },
    type: { type: "string" },
    color: { type: "string" },
    size: { type: "string" },
    material: { type: "string" },
    condition: { type: "string" },
    style: { type: "string" },
    similarLinks: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: REQUIRED_FIELDS,
};

const GOOGLE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING },
    price: { type: Type.NUMBER },
    priceNew: { type: Type.NUMBER },
    brand: { type: Type.STRING },
    type: { type: Type.STRING },
    color: { type: Type.STRING },
    size: { type: Type.STRING },
    material: { type: Type.STRING },
    condition: { type: Type.STRING },
    style: { type: Type.STRING },
    similarLinks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: REQUIRED_FIELDS as unknown as string[],
};

const normalizeDataUrl = (img: string) => {
  const [header, data] = img.split(",");
  if (!data) {
    throw new Error("Ugyldigt billede. Forventede et data-URL.");
  }
  const mimeMatch = header.match(/^data:(.*?);/);
  return {
    mimeType: mimeMatch?.[1] ?? "image/jpeg",
    data,
    original: img,
  };
};

const googleHandler: ProviderHandler = async ({ images, prompt, settings, apiKey }) => {
  const ai = new GoogleGenAI({ apiKey });
  const imageParts = images.map((img) => {
    const normalized = normalizeDataUrl(img);
    return {
      inlineData: {
        mimeType: normalized.mimeType,
        data: normalized.data,
      },
    };
  });

  const response = await ai.models.generateContent({
    model: settings.model,
    contents: {
      parts: [...imageParts, { text: prompt }],
    },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: GOOGLE_RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    const finish = response.candidates?.[0]?.finishReason;
    if (finish === "SAFETY") {
      throw new Error("Forespørgslen blev stoppet af sikkerhedsfiltre hos Google.");
    }
    throw new Error("Tomt svar fra Gemini.");
  }

  return JSON.parse(text) as AIResult;
};

const coerceContentToText = (content: unknown) => {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          const candidate = (part as { text?: string }).text;
          return candidate ?? "";
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
};

const stripJsonFences = (text: string) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const createOpenAICompatibleHandler =
  (options?: {
    baseURL?: string;
    headers?: Record<string, string>;
    useSchema?: boolean;
    systemPrompt?: string;
  }): ProviderHandler =>
  async ({ images, prompt, settings, apiKey }) => {
    const client = new OpenAI({
      apiKey,
      baseURL: options?.baseURL,
      defaultHeaders: options?.headers,
    });

    const userContent = [
      { type: "text" as const, text: prompt },
      ...images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img },
      })),
    ];

    const request: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: settings.model,
      messages: [
        {
          role: "system",
          content:
            options?.systemPrompt ??
            "You are a resale pricing analyst. Respond ONLY with compact JSON containing the requested fields.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: 0.1,
    };

    if (options?.useSchema) {
      request.response_format = {
        type: "json_schema",
        json_schema: {
          name: "ListingAnalysis",
          schema: RESPONSE_JSON_SCHEMA,
        },
      };
    }

    const completion = await client.chat.completions.create(request);
    let responseText = coerceContentToText(completion.choices[0]?.message?.content);

    if (!responseText) {
      throw new Error("Tomt svar fra modellen.");
    }

    if (!options?.useSchema) {
      responseText = stripJsonFences(responseText);
    }

    return JSON.parse(responseText) as AIResult;
  };

const openaiHandler = createOpenAICompatibleHandler({ useSchema: true });

const xaiHandler = createOpenAICompatibleHandler({
  baseURL: "https://api.x.ai/v1",
  systemPrompt:
    "You are Grok assisting resale experts. Always answer strictly with JSON using the provided fields.",
});

const openRouterHandler = createOpenAICompatibleHandler({
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer":
      process.env.OPENROUTER_REFERER || "https://wecircle-assistent.vercel.app",
    "X-Title": "WeCircle Assistent",
  },
});

const providerHandlers: Record<string, ProviderHandler> = {
  google: googleHandler,
  openai: openaiHandler,
  xai: xaiHandler,
  openrouter: openRouterHandler,
};

const readRequestBody = async (req: VercelRequest): Promise<AnalyzePayload> => {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : ({} as AnalyzePayload);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { images, settings, prompt } = await readRequestBody(req);

    if (!images?.length) {
      return res.status(400).send("Ingen billeder leveret til analyse.");
    }
    if (!settings?.provider) {
      return res.status(400).send("Manglende provider i settings.");
    }

    const envKeyName = PROVIDER_ENV_MAP[settings.provider];
    if (!envKeyName) {
      return res.status(400).send(`Provider '${settings.provider}' er ikke understøttet endnu.`);
    }

    const apiKey = process.env[envKeyName];
    if (!apiKey) {
      return res.status(500).send(`Environment variablen ${envKeyName} er ikke sat.`);
    }

    const handler = providerHandlers[settings.provider];
    if (!handler) {
      return res
        .status(400)
        .send(`Provider '${settings.provider}' har ikke en implementeret handler endnu.`);
    }

    const result = await handler({ images, prompt, settings, apiKey });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Analyze API error:", err);
    const message = err?.message ?? "Uventet fejl under analyse.";
    const status =
      message.includes("tomt svar") || message.includes("Manglende") || message.includes("Ingen")
        ? 400
        : 500;
    return res.status(status).send(message);
  }
}
