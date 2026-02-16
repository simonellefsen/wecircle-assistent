import { supabase } from "../supabaseClient";
import type { CircleItem } from "../types";

const USER_ITEMS_TABLE = "user_items";

type UserItemRow = {
  item_id: string;
  item_timestamp: number | null;
  item_data: CircleItem | null;
};

const normalizeItem = (row: UserItemRow): CircleItem | null => {
  if (!row.item_data || !row.item_id) return null;
  const item = row.item_data;
  return {
    ...item,
    id: item.id || row.item_id,
    timestamp:
      typeof item.timestamp === "number"
        ? item.timestamp
        : Number(row.item_timestamp ?? 0),
  };
};

export const fetchUserItems = async (userId?: string): Promise<CircleItem[]> => {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from(USER_ITEMS_TABLE)
    .select("item_id, item_timestamp, item_data")
    .eq("user_id", userId)
    .order("item_timestamp", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data as UserItemRow[]) || [])
    .map(normalizeItem)
    .filter((item): item is CircleItem => Boolean(item));
};

export const upsertUserItem = async (userId: string, item: CircleItem) => {
  if (!supabase || !userId || !item?.id) return;
  const payload = {
    user_id: userId,
    item_id: item.id,
    item_timestamp: Number(item.timestamp || 0),
    item_data: item,
  };

  const { error } = await supabase.from(USER_ITEMS_TABLE).upsert([payload], {
    onConflict: "user_id,item_id",
    defaultToNull: false,
  });
  if (error) throw error;
};

export const upsertUserItems = async (userId: string, items: CircleItem[]) => {
  if (!supabase || !userId || items.length === 0) return;
  const payload = items
    .filter((item) => item?.id)
    .map((item) => ({
      user_id: userId,
      item_id: item.id,
      item_timestamp: Number(item.timestamp || 0),
      item_data: item,
    }));

  if (payload.length === 0) return;

  const { error } = await supabase.from(USER_ITEMS_TABLE).upsert(payload, {
    onConflict: "user_id,item_id",
    defaultToNull: false,
  });
  if (error) throw error;
};

export const deleteUserItem = async (userId: string, itemId: string) => {
  if (!supabase || !userId || !itemId) return;
  const { error } = await supabase
    .from(USER_ITEMS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("item_id", itemId);
  if (error) throw error;
};
