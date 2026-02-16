import { supabase } from "../supabaseClient";
import type { CircleItem } from "../types";

type AuditEventType = "item_created" | "item_deleted";

export const logItemAuditEvent = async (
  userId: string | null | undefined,
  eventType: AuditEventType,
  item: Pick<CircleItem, "id" | "price" | "currency" | "description">,
) => {
  if (!supabase || !userId || !item?.id) return;

  const { error } = await supabase.from("audit_events").insert({
    user_id: userId,
    event_type: eventType,
    entity_type: "item",
    entity_id: item.id,
    metadata: {
      price: item.price ?? null,
      currency: item.currency ?? null,
      description: item.description ?? null,
    },
  });

  if (error) {
    console.warn("Kunne ikke logge audit event", error);
  }
};
