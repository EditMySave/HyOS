"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useHealthState } from "@/lib/services/server";

export function HealthNotification() {
  const { data: healthState } = useHealthState();

  if (!healthState) return null;

  const warnings = healthState.checks.filter((c) => c.status === "warn");
  if (warnings.length === 0) return null;

  return (
    <Card className="border-warning bg-warning/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <AlertTriangle className="size-6 text-warning" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-warning">
              Server Warning
            </h3>
            {warnings.map((w) => (
              <p key={w.name} className="text-sm text-foreground-secondary">
                {w.message}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
