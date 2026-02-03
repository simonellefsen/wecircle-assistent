
import { AppSettings } from './types';

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
  ]
};

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'google',
  model: 'gemini-3-flash-preview',
  language: 'Dansk',
  currency: 'DKK',
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
