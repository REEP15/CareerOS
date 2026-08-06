"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.getUnreadCount = getUnreadCount;
exports.createNotification = createNotification;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.getNotification = getNotification;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("@/lib/firebase");
async function getNotifications(uid, maxCount = 50) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return [];
    }
    const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firebase_1.getUserNotificationsCollection)(uid), (0, firestore_1.orderBy)("createdAt", "desc"), (0, firestore_1.limit)(maxCount)));
    return snapshot.docs.map((document) => document.data());
}
async function getUnreadCount(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return 0;
    }
    const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firebase_1.getUserNotificationsCollection)(uid), (0, firestore_1.where)("read", "==", false)));
    return snapshot.size;
}
async function createNotification(uid, input) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return null;
    }
    const id = crypto.randomUUID();
    const notification = {
        id,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        read: false,
        createdAt: new Date().toISOString(),
    };
    await (0, firestore_1.setDoc)((0, firestore_1.doc)((0, firebase_1.getUserNotificationsCollection)(uid), id), notification);
    return notification;
}
async function markNotificationRead(uid, id) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return;
    }
    await (0, firestore_1.updateDoc)((0, firestore_1.doc)((0, firebase_1.getUserNotificationsCollection)(uid), id), { read: true });
}
async function markAllNotificationsRead(uid) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return;
    }
    const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)((0, firebase_1.getUserNotificationsCollection)(uid), (0, firestore_1.where)("read", "==", false)));
    if (snapshot.empty) {
        return;
    }
    const batch = (0, firestore_1.writeBatch)((0, firebase_1.getDb)());
    for (const document of snapshot.docs) {
        batch.update(document.ref, { read: true });
    }
    await batch.commit();
}
async function getNotification(uid, id) {
    if (!(0, firebase_1.isFirebaseConfigured)()) {
        return null;
    }
    const snapshot = await (0, firestore_1.getDoc)((0, firestore_1.doc)((0, firebase_1.getUserNotificationsCollection)(uid), id));
    return snapshot.exists() ? snapshot.data() : null;
}
