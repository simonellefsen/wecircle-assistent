import { supabase } from "../supabaseClient";
import { DEFAULT_SETTINGS } from "../constants";
import type { AppSettings, UsageTotals } from "../types";

const SETTINGS_TABLE = "user_settings";

type RemoteSettingsRow = {
  language: string | null;
  currency: string | null;
  discount_percent: number | null;
  commission_percent: number | null;
  ai_provider: string | null;
  model_preference: string | null;
  custom_prompt: string | null;
  ai_usage_runs: number | null;
  ai_prompt_tokens: number | null;
  ai_completion_tokens: number | null;
  ai_total_tokens: number | null;
  ai_cost_usd: number | string | null;
};

const mapRowToSettings = (row: RemoteSettingsRow): AppSettings => ({
  provider: DEFAULT_SETTINGS.provider,
  model: row.model_preference || DEFAULT_SETTINGS.model,
  language: row.language || DEFAULT_SETTINGS.language,
  currency: row.currency || DEFAULT_SETTINGS.currency,
  discountPercent:
    typeof row.discount_percent === "number"
      ? Number(row.discount_percent)
      : DEFAULT_SETTINGS.discountPercent,
  commissionPercent:
    typeof row.commission_percent === "number"
      ? Number(row.commission_percent)
      : DEFAULT_SETTINGS.commissionPercent,
  customPrompt: row.custom_prompt || DEFAULT_SETTINGS.customPrompt,
});

const mapRowToUsage = (row: RemoteSettingsRow): UsageTotals => ({
  runs: row.ai_usage_runs ?? 0,
  promptTokens: row.ai_prompt_tokens ?? 0,
  completionTokens: row.ai_completion_tokens ?? 0,
  totalTokens: row.ai_total_tokens ?? 0,
  costUsd: typeof row.ai_cost_usd === "string"
    ? parseFloat(row.ai_cost_usd)
    : Number(row.ai_cost_usd ?? 0),
});

export const fetchUserSettings = async (userId?: string) => {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select(
      "language, currency, discount_percent, commission_percent, ai_provider, model_preference, custom_prompt, ai_usage_runs, ai_prompt_tokens, ai_completion_tokens, ai_total_tokens, ai_cost_usd"
    )
    .eq("user_id", userId)
    .single();

  if (error) {
    // If Supabase returns "PGRST116" there was simply no row yet
    if (error.code === "PGRST116") {
      return {
        settings: DEFAULT_SETTINGS,
        usage: {
          runs: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUsd: 0,
        },
      };
    }
    throw error;
  }

  return {
    settings: mapRowToSettings(data as RemoteSettingsRow),
    usage: mapRowToUsage(data as RemoteSettingsRow),
  };
};

type PersistableSettings = Pick<
  AppSettings,
  | "provider"
  | "model"
  | "language"
  | "currency"
  | "discountPercent"
  | "commissionPercent"
  | "customPrompt"
>;

export const persistUserSettings = async (
  userId: string,
  settings: PersistableSettings
) => {
  if (!supabase || !userId) return;
  const payload = {
    user_id: userId,
    ai_provider: DEFAULT_SETTINGS.provider,
    model_preference: settings.model,
    language: settings.language,
    currency: settings.currency,
    discount_percent: Number(settings.discountPercent.toFixed(4)),
    commission_percent: Number(settings.commissionPercent.toFixed(4)),
    custom_prompt:
      settings.customPrompt === DEFAULT_SETTINGS.customPrompt
        ? null
        : settings.customPrompt,
  };

  await supabase.from(SETTINGS_TABLE).upsert([payload], {
    onConflict: "user_id",
    defaultToNull: false,
  });
};

export const persistUsageTotals = async (
  userId: string,
  totals: UsageTotals
) => {
  if (!supabase || !userId) return;
  const payload = {
    user_id: userId,
    ai_usage_runs: totals.runs,
    ai_prompt_tokens: totals.promptTokens,
    ai_completion_tokens: totals.completionTokens,
    ai_total_tokens: totals.totalTokens,
    ai_cost_usd: Number(totals.costUsd.toFixed(4)),
  };

  await supabase.from(SETTINGS_TABLE).upsert([payload], {
    onConflict: "user_id",
    defaultToNull: false,
  });
};
