import { supabase } from "../supabaseClient";
import type { UserPlanSnapshot } from "../types";

export const fetchUserPlan = async (userId?: string): Promise<UserPlanSnapshot | null> => {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("user_plan_assignments")
    .select(
      `
        status,
        period_end,
        billing_plans (
          slug,
          name,
          apple_product_id,
          usage_allowances
        )
      `
    )
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  const planRelationship = (data as any).billing_plans;
  const plan = Array.isArray(planRelationship) ? planRelationship[0] : planRelationship;
  return {
    slug: plan?.slug ?? "starter",
    name: plan?.name ?? "Starter",
    status: data.status,
    appleProductId: plan?.apple_product_id ?? undefined,
    periodEnd: data.period_end,
    allowance: plan?.usage_allowances ?? null,
  };
};
