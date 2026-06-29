import { storage } from "@/src/utils/storage";

let cached: string | null = null;

// Stable per-device owner id. The user "owns" exactly one agent keyed by this.
export async function getOwnerId(): Promise<string> {
  if (cached) return cached;
  const existing = await storage.getItem<string>("owner_id", "");
  if (existing) {
    cached = existing;
    return existing;
  }
  const id =
    "owner_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  await storage.setItem("owner_id", id);
  cached = id;
  return id;
}
