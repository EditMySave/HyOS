"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotificationsStore } from "@/lib/stores/notifications.store";
import { NotificationBell } from "./notification-bell";
import { NotificationItem } from "./notification-item";

export function NotificationPanel() {
  const notifications = useNotificationsStore((s) => s.notifications);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <NotificationBell />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <div className="max-h-80 overflow-y-auto px-4">
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active notifications
            </p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
