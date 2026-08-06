/**
 * Client-side authenticated fetch wrapper
 * Automatically includes Firebase ID token in Authorization header
 */

import { getAuth as getFirebaseAuth } from "./firebase";

type AuthenticatedFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

/**
 * Fetch wrapper that automatically includes Firebase ID token for authenticated requests
 * @param url - The URL to fetch
 * @param options - Request options with optional skipAuth flag
 * @returns Fetch response
 */
export async function authFetch(url: string, options: AuthenticatedFetchOptions = {}): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth) {
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      
      if (user) {
        const token = await user.getIdToken();
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (error) {
      console.error("Error getting auth token:", error);
    }
  }

  return fetch(url, {
    ...fetchOptions,
    headers,
  });
}
