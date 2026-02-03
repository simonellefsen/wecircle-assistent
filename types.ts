
export interface AppSettings {
  provider: string;
  model: string;
  language: string;
  currency: string;
  customPrompt: string;
}

export interface CircleItem {
  id: string;
  timestamp: number;
  photos: string[]; // base64 strings
  description: string;
  price: number;
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
  similarLink?: string;
}

export interface AIResult {
  description: string;
  price: number;
  brand: string;
  type: string;
  color: string;
  size: string;
  material: string;
  condition: string;
  style: string;
  similarLink?: string;
}
