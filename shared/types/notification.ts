export enum NotificationType {
  NEW_HIGH_MATCH = "NEW_HIGH_MATCH",
  APPLICATION_COMPLETE = "APPLICATION_COMPLETE",
  COLLECTION_FINISHED = "COLLECTION_FINISHED",
  MISSION_FINISHED = "MISSION_FINISHED",
  ERROR = "ERROR",
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}
