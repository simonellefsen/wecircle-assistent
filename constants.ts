
import type { AppSettings } from './types';

export const OPENROUTER_PROVIDER = {
  id: 'openrouter',
  name: 'OpenRouter',
  icon: '🌐',
  apiKeyUrl: 'https://openrouter.ai/keys'
};

export const PROVIDERS = [OPENROUTER_PROVIDER];

export type ModelOption = {
  id: string;
  name: string;
  pricingLabel?: string;
};

export const MODELS_BY_PROVIDER: Record<string, ModelOption[]> = {
  openrouter: [
    { id: 'openai/gpt-5-mini', name: 'OpenAI GPT-5 Mini', pricingLabel: '$0.25/M input · $2/M output' },
    { id: 'x-ai/grok-4.20-multi-agent-beta', name: 'xAI Grok 4.20 Multi Agent Beta', pricingLabel: '$2/M input · $6/M output' },
    { id: 'google/gemini-3-flash-preview', name: 'Google Gemini 3 Flash Preview', pricingLabel: '$0.50/M input · $3/M output' },
    { id: 'x-ai/grok-4.20-beta', name: 'xAI Grok 4.20 Beta', pricingLabel: '$2/M input · $6/M output' },
    { id: 'qwen/qwen3.5-9b', name: 'Qwen 3.5 9B', pricingLabel: '$0.10/M input · $0.15/M output' },
    { id: 'stepfun/step-3.5-flash:free', name: 'StepFun Step 3.5 Flash (Free)', pricingLabel: '$0/M input · $0/M output' },
    { id: 'z-ai/glm-5v-turbo', name: 'Z.ai GLM 5V Turbo', pricingLabel: '$1.20/M input · $4/M output' },
    { id: 'rekaai/reka-edge', name: 'Reka Edge', pricingLabel: '$0.10/M input · $0.10/M output' },
    { id: 'amazon/nova-2-lite-v1', name: 'Amazon Nova 2 Lite v1', pricingLabel: '$0.30/M input · $2.50/M output' },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free', name: 'NVIDIA Nemotron Nano 12B v2 VL (Free)', pricingLabel: '$0/M input · $0/M output' }
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
Foreslå ALTID en rimelig genbrugspris i {currency} i feltet 'price'. Feltet 'price' er obligatorisk.
Hvis du ikke kan finde en aktuel markedspris online, skal du stadig estimere en realistisk genbrugspris ud fra mærke, materiale, stand, alder og sammenlignelige varer.
Find eller estimer varens oprindelige nypris i {currency} i feltet 'priceNew'. Hvis nyprisen ikke kan verificeres sikkert, må du estimere den konservativt eller udelade den.
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
