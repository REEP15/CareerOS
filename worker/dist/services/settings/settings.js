"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
const settings_1 = require("@/types/settings");
const SETTINGS_DOC_ID = "primary";
async function getSettings(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return {
            id: SETTINGS_DOC_ID,
            ...settings_1.DEFAULT_SETTINGS,
            firebaseConfigured: false,
            updatedAt: new Date().toISOString(),
        };
    }
    const snapshot = await (0, firestore_1.getDoc)((0, firestore_1.doc)((0, firebase_1.getUserSettingsCollection)(uid), SETTINGS_DOC_ID));
    if (!snapshot.exists()) {
        return {
            id: SETTINGS_DOC_ID,
            ...settings_1.DEFAULT_SETTINGS,
            firebaseConfigured: (0, firebase_1.isFirebaseConfigured)(),
            updatedAt: new Date().toISOString(),
        };
    }
    const data = snapshot.data();
    return {
        ...data,
        firebaseConfigured: (0, firebase_1.isFirebaseConfigured)(),
    };
}
async function saveSettings(uid, input) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        throw new Error("Firebase environment variables are missing.");
    }
    const existing = await getSettings(uid);
    const settings = {
        ...existing,
        ...input,
        id: SETTINGS_DOC_ID,
        firebaseConfigured: (0, firebase_1.isFirebaseConfigured)(),
        updatedAt: new Date().toISOString(),
    };
    await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firebase_1.getUserSettingsCollection)(uid), SETTINGS_DOC_ID), settings);
    return settings;
}
