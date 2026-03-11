import { create } from "zustand";
import type { AppNotification } from "@/lib/types/notifications.types";

interface NotificationsState {
  notifications: AppNotification[];
  sync: (next: AppNotification[]) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],
  sync: (next) => set({ notifications: next }),
}));

export const selectNotificationCount = (state: NotificationsState) =>
  state.notifications.length;
