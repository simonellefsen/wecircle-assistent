
import type { AppSettings } from './types';

export const OPENROUTER_PROVIDER = {
  id: 'openrouter',
  name: 'OpenRouter',
  icon: '🌐',
  apiKeyUrl: 'https://openrouter.ai/keys'
};

export const PROVIDERS = [OPENROUTER_PROVIDER];

export const MODELS_BY_PROVIDER: Record<string, { id: string, name: string }[]> = {
  openrouter: [
    { id: 'openai/gpt-4.1', name: 'OpenAI GPT-4.1' },
    { id: 'google/gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' },
    { id: 'x-ai/grok-4.1-fast', name: 'xAI Grok 4.1 Fast' },
    { id: 'amazon/nova-2-lite-v1', name: 'Amazon Nova 2 Lite v1' },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA Nemotron Nano 12B v2 VL (Free)' }
  ]
};

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'openrouter',
  model: 'nvidia/nemotron-nano-12b-v2-vl:free',
  language: 'Dansk',
  currency: 'DKK',
  discountPercent: 0,
  commissionPercent: 0.2,
  customPrompt: `Identificer varen på billederne.
Foreslå en rimelig genbrugspris i {currency} i feltet 'price'.
Find eller estimer varens oprindelige nypris i {currency} i feltet 'priceNew'.
Formuler en beskrivelse på én linje (maks. 58 tegn) på {language} i feltet 'description'. Beskrivelsen SKAL inkludere mærke, type, farve og størrelse hvis de er kendte (f.eks. "Nike Air Max 90 Sort Str. 42").
Identificer også brand, type, farve, størrelse, materiale, stand og stil i de respektive felter.
Brug Google Search til at verificere priser og finde lignende links.
Returner resultatet som JSON med nøglerne: 'description', 'price', 'priceNew', 'brand', 'type', 'color', 'size', 'material', 'condition', 'style', 'similarLinks'.`,
};

export const LANGUAGES = ['Dansk', 'English', 'Svenska', 'Norsk', 'Deutsch'];
export const CURRENCIES = ['DKK', 'EUR', 'USD', 'GBP', 'SEK', 'NOK'];
export const DISCOUNT_OPTIONS = [0, 0.25, 0.5];

export type SubscriptionPlan = {
  slug: string;
  name: string;
  description: string;
  priceLabel: string;
  appleProductId: string;
  monthlyAnalyzes: number;
  monthlyTokens: number;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    slug: "starter",
    name: "Starter",
    description: "10 analyser pr. måned • ideel til begyndere",
    priceLabel: "Gratis",
    appleProductId: "",
    monthlyAnalyzes: 10,
    monthlyTokens: 20000,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "100 analyser + prioriteret support",
    priceLabel: "249 kr./md.",
    appleProductId: "com.wecircle.assistent.pro",
    monthlyAnalyzes: 100,
    monthlyTokens: 200000,
  },
  {
    slug: "scale",
    name: "Scale",
    description: "Ubegrænset analyser, team-adgang, ekstra rapporter",
    priceLabel: "Kontakt os",
    appleProductId: "com.wecircle.assistent.scale",
    monthlyAnalyzes: 1000,
    monthlyTokens: 1000000,
  },
];
