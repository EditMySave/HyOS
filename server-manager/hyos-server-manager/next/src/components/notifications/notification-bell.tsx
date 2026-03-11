"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationsStore, selectNotificationCount } from "@/lib/stores/notifications.store";

export function NotificationBell() {
  const count = useNotificationsStore(selectNotificationCount);

  return (
    <Button variant="ghost" size="icon-sm" className="relative" title="Notifications">
      <Bell className="size-4" />
      {count > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 size-4 p-0 text-[10px]"
        >
          {count}
        </Badge>
      )}
    </Button>
  );
}
