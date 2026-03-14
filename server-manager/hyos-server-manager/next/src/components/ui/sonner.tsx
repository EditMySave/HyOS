"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: "0",
          border: "1px solid var(--color-border)",
          background: "var(--color-card)",
          color: "var(--color-foreground)",
        },
      }}
    />
  );
}
