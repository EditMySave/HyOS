"use client";

import {
  ArrowUpCircle,
  AlertTriangle,
  KeyRound,
  ServerCrash,
  Package,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRestartServer, useScheduleUpdate } from "@/lib/services/server";
import type {
  AppNotification,
  NotificationType,
} from "@/lib/types/notifications.types";

const iconMap: Record<NotificationType, React.ElementType> = {
  "update-available": ArrowUpCircle,
  "low-ram": AlertTriangle,
  "auth-expired": KeyRound,
  "server-crashed": ServerCrash,
  "mod-load-failure": Package,
};

const severityColors = {
  info: "text-blue-400",
  warning: "text-warning",
  error: "text-destructive",
} as const;

export function NotificationItem({
  notification,
}: {
  notification: AppNotification;
}) {
  const { trigger: restartServer } = useRestartServer();
  const { trigger: scheduleUpdate } = useScheduleUpdate();

  const Icon = iconMap[notification.type];

  function handleMutation(target: string) {
    if (target === "restart-server") restartServer();
    if (target === "schedule-update") scheduleUpdate();
  }

  return (
    <div className="flex gap-3 py-2">
      <div className="shrink-0 pt-0.5">
        <Icon className={`size-4 ${severityColors[notification.severity]}`} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium leading-none">{notification.title}</p>
        <p className="text-xs text-muted-foreground">{notification.message}</p>
        {notification.actions.length > 0 && (
          <div className="flex gap-1.5 pt-1">
            {notification.actions.map((action) =>
              action.kind === "link" ? (
                <Button key={action.label} variant="outline" size="xs" asChild>
                  <Link href={action.target}>{action.label}</Link>
                </Button>
              ) : (
                <Button
                  key={action.label}
                  variant="outline"
                  size="xs"
                  onClick={() => handleMutation(action.target)}
                >
                  {action.label}
                </Button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
