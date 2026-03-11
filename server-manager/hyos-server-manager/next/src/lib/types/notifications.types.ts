export type NotificationSeverity = "info" | "warning" | "error";
export type NotificationType =
  | "update-available"
  | "low-ram"
  | "auth-expired"
  | "server-crashed"
  | "mod-load-failure";

export interface NotificationAction {
  label: string;
  kind: "link" | "mutation";
  target: string; // href for link, mutation key for mutation
}

export interface AppNotification {
  id: string; // deterministic: type + discriminator
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actions: NotificationAction[];
}
