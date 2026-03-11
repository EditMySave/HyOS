"use client";

import { useNotificationSyncer } from "@/lib/hooks/use-notification-syncer";

export function NotificationSyncer() {
  useNotificationSyncer();
  return null;
}
