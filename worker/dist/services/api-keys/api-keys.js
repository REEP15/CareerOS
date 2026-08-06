"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKeys = getApiKeys;
exports.getApiKey = getApiKey;
exports.saveApiKey = saveApiKey;
exports.hasApiKey = hasApiKey;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/shared/lib/firebase");
const API_KEYS_DOC_ID = "user";
async function getApiKeys(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return {};
    }
    const snapshot = await (0, firestore_1.getDoc)((0, firestore_1.doc)((0, firebase_1.getUserApiKeysCollection)(uid), API_KEYS_DOC_ID));
    if (!snapshot.exists()) {
        return {};
    }
    return snapshot.data();
}
async function getApiKey(uid, provider) {
    const apiKeys = await getApiKeys(uid);
    return apiKeys[provider];
}
async function saveApiKey(uid, provider, apiKey) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        throw new Error("Firebase environment variables are missing.");
    }
    const existing = await getApiKeys(uid);
    const updated = {
        ...existing,
        [provider]: apiKey,
    };
    await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firebase_1.getUserApiKeysCollection)(uid), API_KEYS_DOC_ID), updated);
}
async function hasApiKey(uid, provider) {
    const apiKey = await getApiKey(uid, provider);
    return Boolean(apiKey);
}
