
import type { AppSettings } from './types';

export const PROVIDERS = [
  { 
    id: 'google', 
    name: 'Google Gemini', 
    icon: '✨', 
    apiKeyUrl: 'https://ai.google.dev/gemini-api/docs/api-key' 
  },
  { 
    id: 'openai', 
    name: 'OpenAI (GPT)', 
    icon: '🤖', 
    apiKeyUrl: 'https://platform.openai.com/api-keys' 
  },
  { 
    id: 'anthropic', 
    name: 'Anthropic (Claude)', 
    icon: '🧠', 
    apiKeyUrl: 'https://console.anthropic.com/settings/keys' 
  },
  { 
    id: 'xai', 
    name: 'xAI (Grok)', 
    icon: '✖️', 
    apiKeyUrl: 'https://console.x.ai/' 
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    apiKeyUrl: 'https://openrouter.ai/keys'
  }
];

export const MODELS_BY_PROVIDER: Record<string, { id: string, name: string }[]> = {
  google: [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-opus-latest', name: 'Claude 3 Opus' },
  ],
  xai: [
    { id: 'grok-2-vision-latest', name: 'Grok-2 Vision' }
  ],
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
