"use client";

import { useState, useEffect } from "react";
import { useModProvidersStore } from "@/lib/stores/mod-providers.store";
import {
  useProviderSettings,
  useSaveProviderSettings,
  useResetProviderKey,
} from "@/lib/services/mods/providers.hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ModProvider } from "@/lib/services/mods/browser/types";
import { cn } from "@/lib/utils";
import { Check, RotateCcw } from "lucide-react";

const PROVIDERS: {
  id: ModProvider;
  name: string;
  description: string;
  authType: "api_key" | "sso";
  helpUrl: string;
  optional?: boolean;
}[] = [
  {
    id: "curseforge",
    name: "CurseForge",
    description: "Largest mod catalog",
    authType: "api_key",
    helpUrl: "https://console.curseforge.com",
  },
  {
    id: "modtale",
    name: "Modtale",
    description: "Official Hytale community repository",
    authType: "api_key",
    helpUrl: "https://modtale.net/api-docs",
    optional: true,
  },
  {
    id: "nexusmods",
    name: "NexusMods",
    description: "Established modding platform",
    authType: "api_key",
    helpUrl: "https://www.nexusmods.com/settings/api-keys",
  },
];

export function ModProviderSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setProvidersFromSettings = useModProvidersStore(
    (s) => s.setProvidersFromSettings,
  );
  const setProviderEnabled = useModProvidersStore((s) => s.setProviderEnabled);

  const { data: settings, mutate: mutateSettings } = useProviderSettings();
  const { trigger: saveSettings, isMutating: isSaving } =
    useSaveProviderSettings();
  const { trigger: resetKey, isMutating: isResetting } = useResetProviderKey();

  const [enabledState, setEnabledState] = useState<
    Record<ModProvider, boolean>
  >({
    curseforge: false,
    modtale: true,
    nexusmods: false,
  });
  const [newKeyInput, setNewKeyInput] = useState<Record<ModProvider, string>>({
    curseforge: "",
    modtale: "",
    nexusmods: "",
  });
  const [successId, setSuccessId] = useState<ModProvider | null>(null);

  useEffect(() => {
    if (open) {
      mutateSettings();
    }
  }, [open, mutateSettings]);

  useEffect(() => {
    if (open && settings) {
      const enabled: Record<ModProvider, boolean> = {
        curseforge: false,
        modtale: true,
        nexusmods: false,
      };
      for (const p of settings.providers) {
        enabled[p.id] = p.enabled;
      }
      setEnabledState(enabled);
      setProvidersFromSettings(settings);
    }
  }, [open, settings, setProvidersFromSettings]);

  const handleSave = async (id: ModProvider) => {
    const apiKey = newKeyInput[id]?.trim();
    if (!apiKey) return;
    try {
      const updated = await saveSettings({
        provider: id,
        enabled: enabledState[id],
        apiKey,
      });
      if (updated) {
        setProvidersFromSettings(updated);
        setNewKeyInput((prev) => ({ ...prev, [id]: "" }));
        setProviderEnabled(
          id,
          updated.providers.find((p) => p.id === id)!.enabled,
        );
        setSuccessId(id);
        setTimeout(() => setSuccessId(null), 2000);
        mutateSettings();
      }
    } catch (e) {
      console.error("Save provider settings failed:", e);
    }
  };

  const handleReset = async (id: ModProvider) => {
    try {
      const updated = await resetKey(id);
      if (updated) {
        setProvidersFromSettings(updated);
        setProviderEnabled(
          id,
          updated.providers.find((p) => p.id === id)!.enabled,
        );
        setSuccessId(id);
        setTimeout(() => setSuccessId(null), 2000);
        mutateSettings();
      }
    } catch (e) {
      console.error("Reset API key failed:", e);
    }
  };

  const settingsByProvider = new Map(
    settings?.providers.map((p) => [p.id, p]) ?? [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mod sources</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enable mod repositories and add API keys to search and install mods
          </p>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {PROVIDERS.map((provider) => {
            const enabled = enabledState[provider.id];
            const hasApiKey =
              settingsByProvider.get(provider.id)?.hasApiKey ?? false;
            const showSave =
              !hasApiKey && (newKeyInput[provider.id]?.trim() ?? "").length > 0;
            const showReset = hasApiKey;
            const justSuccess = successId === provider.id;
            const busy = isSaving || isResetting;

            return (
              <div
                key={provider.id}
                className={cn(
                  "rounded-none border p-4",
                  enabled && "border-primary/30 bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 shrink-0">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        setEnabledState((prev) => ({
                          ...prev,
                          [provider.id]: next,
                        }));
                        try {
                          const updated = await saveSettings({
                            provider: provider.id,
                            enabled: next,
                          });
                          if (updated) {
                            setProvidersFromSettings(updated);
                            setProviderEnabled(provider.id, next);
                            mutateSettings();
                          }
                        } catch (err) {
                          console.error("Update enabled failed:", err);
                        }
                      }}
                      disabled={busy}
                      className="h-4 w-4 rounded-none border-input"
                    />
                    <span className="text-sm">Enable</span>
                  </label>
                </div>

                {enabled && provider.authType === "api_key" && (
                  <div className="mt-4 space-y-2">
                    <label
                      htmlFor={`${provider.id}-key`}
                      className="block text-sm font-medium"
                    >
                      API key {provider.optional && "(optional)"}
                    </label>
                    <Input
                      id={`${provider.id}-key`}
                      type="password"
                      placeholder={
                        hasApiKey ? "API key configured" : "Enter API key"
                      }
                      value={hasApiKey ? "" : (newKeyInput[provider.id] ?? "")}
                      onChange={(e) =>
                        setNewKeyInput((prev) => ({
                          ...prev,
                          [provider.id]: e.target.value,
                        }))
                      }
                      disabled={hasApiKey}
                      className="max-w-full rounded-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your key at{" "}
                      <a
                        href={provider.helpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {provider.helpUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </p>
                  </div>
                )}

                {enabled && provider.authType === "api_key" && (
                  <div className="mt-3 flex items-center gap-2">
                    {showReset ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReset(provider.id)}
                        disabled={busy || justSuccess}
                        className="rounded-none"
                      >
                        {justSuccess ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Reset
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset key
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSave(provider.id)}
                        disabled={!showSave || busy || justSuccess}
                        className="rounded-none"
                      >
                        {justSuccess ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Saved
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
