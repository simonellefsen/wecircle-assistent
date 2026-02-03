import type { VercelRequest, VercelResponse } from "@vercel/node";

const PROVIDER_ENV_MAP: Record<string, string> = {
  google: "GEMINI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const statuses = Object.entries(PROVIDER_ENV_MAP).map(([provider, envKey]) => ({
    provider,
    hasKey: Boolean(process.env[envKey]),
  }));

  return res.status(200).json({ statuses });
}
