import { doc, getDoc, setDoc, getDocs, query, orderBy, limit, where, updateDoc, writeBatch } from "firebase/firestore";

import { getUserNotificationsCollection, getDb, isFirebaseConfigured } from "@/lib/firebase";
import type { Notification, NotificationType } from "@/types/notification";

export async function getNotifications(uid: string, maxCount = 50): Promise<Notification[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const snapshot = await getDocs(
    query(getUserNotificationsCollection(uid), orderBy("createdAt", "desc"), limit(maxCount)),
  );
  return snapshot.docs.map(
    (document) => document.data() as Notification
)
}
export async function getUnreadCount(uid: string): Promise<number> {
  if (!isFirebaseConfigured()) {
    return 0;
  }

  const snapshot = await getDocs(
    query(getUserNotificationsCollection(uid), where("read", "==", false)),
  );
  return snapshot.size;
}

export async function createNotification(uid: string, input: {
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

  await setDoc(doc(getUserNotificationsCollection(uid), id), notification);
  return notification;
}

export async function markNotificationRead(uid: string, id: string) {
  if (!isFirebaseConfigured()) {
    return;
  }

  await updateDoc(doc(getUserNotificationsCollection(uid), id), { read: true });
}

export async function markAllNotificationsRead(uid: string) {
  if (!isFirebaseConfigured()) {
    return;
  }

  const snapshot = await getDocs(
    query(getUserNotificationsCollection(uid), where("read", "==", false)),
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

export async function getNotification(uid: string, id: string): Promise<Notification | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const snapshot = await getDoc(doc(getUserNotificationsCollection(uid), id));
  return snapshot.exists() ? (snapshot.data() as Notification) : null;
}
