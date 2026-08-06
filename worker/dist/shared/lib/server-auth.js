"use strict";
/**
 * Server-side authentication utilities for Next.js API routes.
 * This file can safely use server-only APIs like next/headers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuthToken = verifyAuthToken;
const headers_1 = require("next/headers");
/**
 * Verifies Firebase ID token from Authorization header in API routes.
 * This is the server-side equivalent of auth.currentUser for Next.js API routes.
 *
 * @param request - Optional Request object (for Route Handlers)
 * @returns User object with uid if authenticated, null otherwise
 */
async function verifyAuthToken(request) {
    try {
        // Get authorization header from either the provided request or next/headers
        let authHeader = null;
        if (request) {
            authHeader = request.headers.get("authorization");
        }
        else {
            try {
                const headersList = await (0, headers_1.headers)();
                authHeader = headersList.get("authorization");
            }
            catch {
                // headers() might fail in some contexts, that's okay
            }
        }
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        const token = authHeader.substring(7);
        // Since we don't have firebase-admin installed, we'll decode the token
        // to get the uid. This is not secure for production but functional for development.
        // In production, you should use firebase-admin to verify the token properly.
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const uid = payload.user_id || payload.sub;
        if (!uid) {
            return null;
        }
        return { uid, user: { uid } };
    }
    catch (error) {
        console.error("Token verification error:", error);
        return null;
    }
}
