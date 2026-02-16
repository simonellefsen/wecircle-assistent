import type { CircleItem } from "../types";
import { deleteUserItem, upsertUserItem } from "./userItemsService";

type PendingItemOp =
  | {
      userId: string;
      type: "upsert";
      itemId: string;
      item: CircleItem;
      queuedAt: number;
      attempts: number;
    }
  | {
      userId: string;
      type: "delete";
      itemId: string;
      queuedAt: number;
      attempts: number;
    };

const QUEUE_STORAGE_KEY = "wecircle_pending_item_ops_v1";

const readQueue = (): PendingItemOp[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingItemOp[]) : [];
  } catch {
    return [];
  }
};

const writeQueue = (ops: PendingItemOp[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(ops));
};

const compactQueue = (ops: PendingItemOp[]): PendingItemOp[] => {
  const map = new Map<string, PendingItemOp>();
  ops.forEach((op) => {
    const key = `${op.userId}:${op.itemId}`;
    map.set(key, op);
  });
  return Array.from(map.values()).sort((a, b) => a.queuedAt - b.queuedAt);
};

export const enqueuePendingUserItemUpsert = (userId: string, item: CircleItem) => {
  const next: PendingItemOp = {
    userId,
    type: "upsert",
    itemId: item.id,
    item,
    queuedAt: Date.now(),
    attempts: 0,
  };
  const queue = compactQueue([...readQueue(), next]);
  writeQueue(queue);
};

export const enqueuePendingUserItemDelete = (userId: string, itemId: string) => {
  const next: PendingItemOp = {
    userId,
    type: "delete",
    itemId,
    queuedAt: Date.now(),
    attempts: 0,
  };
  const queue = compactQueue([...readQueue(), next]);
  writeQueue(queue);
};

export const flushPendingUserItemOps = async (userId: string) => {
  const allOps = readQueue();
  if (allOps.length === 0) return;

  const userOps = allOps.filter((op) => op.userId === userId);
  const otherOps = allOps.filter((op) => op.userId !== userId);
  const keep: PendingItemOp[] = [...otherOps];

  for (const op of userOps) {
    try {
      if (op.type === "upsert") {
        await upsertUserItem(op.userId, op.item);
      } else {
        await deleteUserItem(op.userId, op.itemId);
      }
    } catch {
      keep.push({
        ...op,
        attempts: op.attempts + 1,
      });
    }
  }

  writeQueue(compactQueue(keep));
};

export const getPendingUserItemOpsCount = (userId: string) => {
  return readQueue().filter((op) => op.userId === userId).length;
};
