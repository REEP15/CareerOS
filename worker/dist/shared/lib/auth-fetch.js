"use strict";
/**
 * Client-side authenticated fetch wrapper
 * Automatically includes Firebase ID token in Authorization header
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authFetch = authFetch;
const firebase_1 = require("./firebase");
/**
 * Fetch wrapper that automatically includes Firebase ID token for authenticated requests
 * @param url - The URL to fetch
 * @param options - Request options with optional skipAuth flag
 * @returns Fetch response
 */
async function authFetch(url, options = {}) {
    const { skipAuth = false, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers);
    if (!skipAuth) {
        try {
            const auth = (0, firebase_1.getAuth)();
            const user = auth.currentUser;
            if (user) {
                const token = await user.getIdToken();
                headers.set("Authorization", `Bearer ${token}`);
            }
        }
        catch (error) {
            console.error("Error getting auth token:", error);
        }
    }
    return fetch(url, {
        ...fetchOptions,
        headers,
    });
}
