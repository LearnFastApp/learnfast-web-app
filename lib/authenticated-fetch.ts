import type { User } from "firebase/auth";

// Always calls getIdToken() at the moment of the request, never before a long-running
// operation (upload, recording, polling) that could let the token go stale and expire.
export async function authenticatedFetch(user: User, input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
