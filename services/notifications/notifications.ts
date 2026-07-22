import { doc, getDoc, setDoc, getDocs, query, orderBy, limit, where, updateDoc, writeBatch } from "firebase/firestore";

import { getNotificationsCollection, getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { Notification, NotificationType } from "@/types/notification";

export async function getNotifications(maxCount = 50): Promise<Notification[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(
    query(getNotificationsCollection(), orderBy("createdAt", "desc"), limit(maxCount)),
  );
  return snapshot.docs.map((document) => document.data());
}

export async function getUnreadCount(): Promise<number> {
  if (!isFirebaseConfigured()) {
    return 0;
  }

  const snapshot = await getDocs(
    query(getNotificationsCollection(), where("read", "==", false)),
  );
  return snapshot.size;
}

export async function createNotification(input: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const id = crypto.randomUUID();
  const notification: Notification = {
    id,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    read: false,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(getDb(), "notifications", id), notification);
  return notification;
}

export async function markNotificationRead(id: string) {
  if (!isFirebaseConfigured()) {
    return;
  }

  await updateDoc(doc(getDb(), "notifications", id), { read: true });
}

export async function markAllNotificationsRead() {
  if (!isFirebaseConfigured()) {
    return;
  }

  const snapshot = await getDocs(
    query(getNotificationsCollection(), where("read", "==", false)),
  );

  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(getDb());

  for (const document of snapshot.docs) {
    batch.update(document.ref, { read: true });
  }

  await batch.commit();
}

export async function getNotification(id: string): Promise<Notification | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getDb(), "notifications", id));
  return snapshot.exists() ? (snapshot.data() as Notification) : null;
}
