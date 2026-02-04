
export interface AppSettings {
  provider: string;
  model: string;
  language: string;
  currency: string;
  customPrompt: string;
  discountPercent: number;
  commissionPercent: number;
}

export interface UsageTotals {
  runs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface CircleItem {
  id: string;
  timestamp: number;
  photos: string[]; // base64 strings
  description: string;
  price: number;
  priceNew?: number;
  currency: string;
  details: {
    brand?: string;
    type?: string;
    color?: string;
    size?: string;
    material?: string;
    condition?: string;
    style?: string;
  };
  similarLinks?: string[];
}

export interface AIResult {
  description: string;
  price: number;
  priceNew?: number;
  brand: string;
  type: string;
  color: string;
  size: string;
  material: string;
  condition: string;
  style: string;
  similarLinks?: string[];
}

export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
}

export interface AIAnalyzeResponse {
  result: AIResult;
  usage?: AIUsage;
}
