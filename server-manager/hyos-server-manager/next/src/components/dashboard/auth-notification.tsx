"use client";

import { AlertTriangle, Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthState } from "@/lib/services/server";

export function AuthNotification() {
  const [copied, setCopied] = useState(false);
  const { data: authState } = useAuthState(true); // Poll frequently

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  // Only show when auth is pending
  if (!authState || authState.status !== "pending") {
    return null;
  }

  const handleCopyCode = async () => {
    if (authState.authCode) {
      await navigator.clipboard.writeText(authState.authCode);
      setCopied(true);
    }
  };

  return (
    <Card className="border-warning bg-warning/10 animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <AlertTriangle className="size-8 text-warning" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-warning">
                Authentication Required
              </h3>
              <p className="text-sm text-foreground-secondary">
                The Hytale server needs to authenticate with your Hytale
                account. Complete this within 15 minutes or the code will
                expire.
              </p>
            </div>

            {authState.authUrl && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => window.open(authState.authUrl!, "_blank")}
                  >
                    <ExternalLink className="mr-2 size-4" />
                    Open Authentication Page
                  </Button>
                </div>

                {authState.authCode && (
                  <div className="flex items-center gap-2 rounded border border-warning/50 bg-background px-3 py-2">
                    <span className="text-sm text-foreground-secondary">
                      Or enter code manually:
                    </span>
                    <code className="flex-1 font-mono text-lg font-bold tracking-widest text-warning">
                      {authState.authCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCode}
                      className="shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1 size-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 size-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-foreground-muted">
              Do not restart the container while authenticating - you will get a
              new code!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
