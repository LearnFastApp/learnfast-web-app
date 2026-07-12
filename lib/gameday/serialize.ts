interface FirestoreTimestampLike {
  toDate: () => Date;
}

function isFirestoreTimestamp(value: unknown): value is FirestoreTimestampLike {
  return !!value && typeof value === "object" && typeof (value as FirestoreTimestampLike).toDate === "function";
}

/**
 * Firestore Timestamp fields (targetDate, generatedAt, completedAt, ...) must
 * never reach a JSON API response as raw Timestamp objects — client code
 * expects plain ISO strings (e.g. sorting prescribedSessions by targetDate
 * with string comparison crashes with "x.localeCompare is not a function"
 * if a Timestamp object slips through instead). Converts every
 * Timestamp-valued field one level deep; nested/array Timestamps are not
 * expected on any of the Gameday document shapes.
 */
export function serializeTimestamps<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = isFirestoreTimestamp(value) ? value.toDate().toISOString() : value;
  }
  return result as T;
}
