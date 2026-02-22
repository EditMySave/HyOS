"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send error event to Umami if loaded
    window.umami?.track("client-error", {
      message: error.message?.substring(0, 500) ?? "Unknown error",
      stack: error.stack?.substring(0, 500) ?? "",
      source: "global-error-boundary",
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            gap: "1rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ color: "#666" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              background: "#000",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
