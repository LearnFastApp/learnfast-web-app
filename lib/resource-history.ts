import { getAdminDb } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type ResourceType = "articles" | "videos" | "ted" | "podcasts";

export interface SeenResources {
  articles: Set<string>;
  videos: Set<string>;
  ted: Set<string>;
  podcasts: Set<string>;
}

export async function getSeenResources(uid: string, dimension: string): Promise<SeenResources> {
  const db = getAdminDb();
  const doc = await db.collection("presenter_resource_history").doc(uid).get();
  if (!doc.exists) {
    return { articles: new Set(), videos: new Set(), ted: new Set(), podcasts: new Set() };
  }
  const data = doc.data()!;
  return {
    articles: new Set<string>(data[`${dimension}_articles`] ?? []),
    videos: new Set<string>(data[`${dimension}_videos`] ?? []),
    ted: new Set<string>(data[`${dimension}_ted`] ?? []),
    podcasts: new Set<string>(data[`${dimension}_podcasts`] ?? []),
  };
}

export async function recordSeenResources(
  uid: string,
  dimension: string,
  served: { articles: string[]; videos: string[]; ted: string[]; podcasts: string[] },
  resets: { articles: boolean; videos: boolean; ted: boolean; podcasts: boolean }
) {
  const db = getAdminDb();
  const updates: Record<string, unknown> = {};

  const types: ResourceType[] = ["articles", "videos", "ted", "podcasts"];
  for (const type of types) {
    const key = `${dimension}_${type}`;
    if (resets[type]) {
      // Pool was exhausted — reset to only the newly served set
      updates[key] = served[type];
    } else if (served[type].length > 0) {
      updates[key] = FieldValue.arrayUnion(...served[type]);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.collection("presenter_resource_history").doc(uid).set(updates, { merge: true });
  }
}

export function filterUnseen<T>(
  items: T[],
  getKey: (item: T) => string,
  seen: Set<string>
): { items: T[]; didReset: boolean } {
  const unseen = items.filter((item) => !seen.has(getKey(item)));
  if (unseen.length > 0) return { items: unseen, didReset: false };
  // All seen — reset and serve the full pool fresh
  return { items, didReset: true };
}
