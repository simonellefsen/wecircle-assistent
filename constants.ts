
import { AppSettings } from './types';

export const PROVIDERS = [
  { id: 'google', name: 'Google Gemini', icon: '✨' },
  { id: 'openai', name: 'OpenAI (GPT)', icon: '🤖' },
  { id: 'anthropic', name: 'Anthropic (Claude)', icon: '🧠' },
  { id: 'xai', name: 'xAI (Grok)', icon: '✖️' }
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
  customPrompt: `Identificer tøjet/genstanden på billedet/billederne.
Giv en beskrivelse på én linje på {language} (maks. 58 tegn), der indeholder mærke, type, farve og størrelse. 
Foreslå en rimelig genbrugspris i {currency}.
Hvis mærke, type, farve eller størrelse ikke kan identificeres med sikkerhed, skal du skrive "Ukendt" i det pågældende felt.
Returner resultatet strengt som JSON med nøglerne: 'description', 'price', 'brand', 'type', 'color', 'size'.`,
  apiKeys: {}
};

export const LANGUAGES = ['Dansk', 'English', 'Svenska', 'Norsk', 'Deutsch'];
export const CURRENCIES = ['DKK', 'EUR', 'USD', 'GBP', 'SEK', 'NOK'];
