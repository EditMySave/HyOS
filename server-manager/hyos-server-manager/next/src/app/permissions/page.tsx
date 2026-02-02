"use client";

import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PermissionsData } from "@/lib/services/permissions";
import {
  useAddOp,
  useCreateGroup,
  useDeleteGroup,
  usePermissionsData,
  useRemoveOp,
  useUpdateGroup,
} from "@/lib/services/permissions";
import { cn } from "@/lib/utils";

type TabId = "operators" | "groups" | "users";

function getOperators(data: PermissionsData | undefined): string[] {
  if (!data?.users) return [];
  return Object.entries(data.users)
    .filter(([, entry]) =>
      entry.groups?.some((g) => g.toLowerCase() === "op"),
    )
    .map(([uuid]) => uuid);
}

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("operators");
  const [opInput, setOpInput] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupPerms, setNewGroupPerms] = useState("");
  const [editingGroup, setEditingGroup] = useState<{
    name: string;
    permissions: string[];
  } | null>(null);

  const { data: permissions, isLoading, mutate } = usePermissionsData(15000);
  const { trigger: addOpTrigger, isMutating: isAddingOp } = useAddOp();
  const { trigger: removeOpTrigger, isMutating: isRemovingOp } = useRemoveOp();
  const { trigger: createGroupTrigger, isMutating: isCreatingGroup } =
    useCreateGroup();
  const { trigger: deleteGroupTrigger, isMutating: isDeletingGroup } =
    useDeleteGroup();
  const { trigger: updateGroupTrigger, isMutating: isUpdatingGroup } =
    useUpdateGroup();

  const operators = getOperators(permissions);
  const groups = permissions?.groups
    ? Object.entries(permissions.groups).map(([name, entry]) => ({
        name,
        permissions: entry.permissions ?? [],
      }))
    : [];
  const users = permissions?.users
    ? Object.entries(permissions.users).map(([uuid, entry]) => ({
        uuid,
        groups: entry.groups ?? [],
        permissions: entry.permissions ?? [],
      }))
    : [];

  const showResult = useCallback((success: boolean, message: string) => {
    setResult({ success, message });
    setTimeout(() => setResult(null), 5000);
  }, []);

  const handleAddOp = async () => {
    if (!opInput.trim()) return;
    try {
      const res = await addOpTrigger({ player: opInput.trim() });
      showResult(res?.success ?? true, res?.output ?? "Operator added");
      setOpInput("");
      void mutate();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to add operator",
      );
    }
  };

  const handleRemoveOp = async (player: string) => {
    try {
      const res = await removeOpTrigger({ player });
      showResult(res?.success ?? true, res?.output ?? "Operator removed");
      void mutate();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to remove operator",
      );
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createGroupTrigger({
        name: newGroupName.trim(),
        permissions: newGroupPerms
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      });
      showResult(true, "Group created");
      setNewGroupName("");
      setNewGroupPerms("");
      void mutate();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to create group",
      );
    }
  };

  const handleDeleteGroup = async (name: string) => {
    if (name.toLowerCase() === "op") return;
    try {
      await deleteGroupTrigger({ name });
      showResult(true, "Group deleted");
      setExpandedGroup(null);
      void mutate();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to delete group",
      );
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    try {
      await updateGroupTrigger({
        name: editingGroup.name,
        permissions: editingGroup.permissions,
      });
      showResult(true, "Group updated");
      setEditingGroup(null);
      setExpandedGroup(null);
      void mutate();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to update group",
      );
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "operators", label: "Operators" },
    { id: "groups", label: "Groups" },
    { id: "users", label: "Users" },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="font-cablefied text-4xl font-bold text-foreground mb-2">
          Permissions
        </h1>
        <p className="text-muted-foreground">
          Manage operator status and permission groups
        </p>
      </div>

      {result ? (
        <div
          className={cn(
            "fixed top-6 right-6 z-50 max-w-md border p-4 shadow-lg",
            result.success
              ? "border-status-online/40 bg-status-online/10 text-status-online"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          <div className="font-medium">
            {result.success ? "Success" : "Error"}
          </div>
          <div className="mt-1 text-sm opacity-90">{result.message}</div>
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-b-[#2d6cff] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "operators" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Operators
              <span className="text-xs font-normal text-status-online border border-status-online/50 px-2 py-0.5">
                Live
              </span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void mutate()}
              title="Refresh"
            >
              <RefreshCw className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Operators have full server access. Changes apply immediately via
              /op add and /op remove.
            </p>
            <div className="flex gap-2">
              <Input
                value={opInput}
                onChange={(e) => setOpInput(e.target.value)}
                placeholder="UUID or username"
                className="max-w-xs font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleAddOp()}
              />
              <Button
                onClick={handleAddOp}
                disabled={isAddingOp || !opInput.trim()}
              >
                {isAddingOp ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Add OP
              </Button>
            </div>
            <div className="border border-border">
              {operators.length === 0 ? (
                <div className="p-4 text-muted-foreground text-sm">
                  No operators. Add a player by UUID or username above.
                </div>
              ) : (
                <table className="w-full">
                  <tbody>
                    {operators.map((player) => (
                      <tr
                        key={player}
                        className="border-t border-border first:border-t-0"
                      >
                        <td className="p-3 font-mono text-sm">{player}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveOp(player)}
                            disabled={isRemovingOp}
                          >
                            {isRemovingOp ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Remove OP"
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "groups" && (
        <>
          <div className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
            Changes to custom groups require server restart to take effect.
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Groups
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void mutate()}
                title="Refresh"
              >
                <RefreshCw className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap items-end">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="max-w-[200px]"
                />
                <Input
                  value={newGroupPerms}
                  onChange={(e) => setNewGroupPerms(e.target.value)}
                  placeholder="Permissions (comma-separated, e.g. *)"
                  className="max-w-xs font-mono"
                />
                <Button
                  onClick={handleCreateGroup}
                  disabled={isCreatingGroup || !newGroupName.trim()}
                >
                  {isCreatingGroup ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Create group
                </Button>
              </div>
              <div className="border border-border">
                {groups.length === 0 ? (
                  <div className="p-4 text-muted-foreground text-sm">
                    No groups. Create one above or ensure permissions.json
                    exists.
                  </div>
                ) : (
                  <table className="w-full">
                    <tbody>
                      {groups.map((g) => (
                        <tr
                          key={g.name}
                          className="border-t border-border first:border-t-0"
                        >
                          <td className="p-2 align-top">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedGroup(
                                  expandedGroup === g.name ? null : g.name,
                                )
                              }
                              className="flex items-center gap-1 text-left"
                            >
                              {expandedGroup === g.name ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                              <span className="font-medium">{g.name}</span>
                              {g.name.toLowerCase() === "op" && (
                                <span className="text-xs text-muted-foreground">
                                  (managed via Operators)
                                </span>
                              )}
                            </button>
                            {expandedGroup === g.name && (
                              <div className="pl-6 mt-2 space-y-2">
                                {editingGroup?.name === g.name ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={editingGroup.permissions.join(
                                        ", ",
                                      )}
                                      onChange={(e) =>
                                        setEditingGroup({
                                          ...editingGroup,
                                          permissions: e.target.value
                                            .split(",")
                                            .map((p) => p.trim())
                                            .filter(Boolean),
                                        })
                                      }
                                      placeholder="permissions (comma-separated)"
                                      className="font-mono text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleUpdateGroup}
                                        disabled={isUpdatingGroup}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingGroup(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-sm text-muted-foreground">
                                      {g.permissions.length === 0
                                        ? "No permissions"
                                        : g.permissions.join(", ")}
                                    </div>
                                    {g.name.toLowerCase() !== "op" && (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setEditingGroup({
                                              name: g.name,
                                              permissions: [...g.permissions],
                                            })
                                          }
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() =>
                                            handleDeleteGroup(g.name)
                                          }
                                          disabled={isDeletingGroup}
                                        >
                                          <Trash2 className="size-4" />
                                          Delete
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right text-sm text-muted-foreground w-24">
                            {g.permissions.length} perm
                            {g.permissions.length !== 1 ? "s" : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "users" && (
        <>
          <div className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
            Non-OP group changes require server restart to take effect.
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Users with permissions
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void mutate()}
                title="Refresh"
              >
                <RefreshCw className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-border">
                {users.length === 0 ? (
                  <div className="p-4 text-muted-foreground text-sm">
                    No users with assigned permissions. Use Commands page to add
                    a player to a group.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left text-sm font-medium">
                          UUID
                        </th>
                        <th className="p-3 text-left text-sm font-medium">
                          Groups
                        </th>
                        <th className="p-3 text-left text-sm font-medium">
                          Permissions
                        </th>
                        <th className="p-3 text-right text-sm font-medium">
                          OP
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isOp = u.groups.includes("op");
                        return (
                          <tr key={u.uuid} className="border-t border-border">
                            <td className="p-3 font-mono text-sm">{u.uuid}</td>
                            <td className="p-3 text-sm">
                              {u.groups.join(", ") || "—"}
                            </td>
                            <td className="p-3 text-sm font-mono text-muted-foreground">
                              {u.permissions.join(", ") || "—"}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant={isOp ? "destructive" : "outline"}
                                onClick={async () => {
                                  if (isOp) {
                                    await handleRemoveOp(u.uuid);
                                  } else {
                                    try {
                                      const res = await addOpTrigger({
                                        player: u.uuid,
                                      });
                                      showResult(
                                        res?.success ?? true,
                                        res?.output ?? "Operator added",
                                      );
                                      void mutate();
                                    } catch (e) {
                                      showResult(
                                        false,
                                        e instanceof Error
                                          ? e.message
                                          : "Failed to add operator",
                                      );
                                    }
                                  }
                                }}
                                disabled={isAddingOp || isRemovingOp}
                              >
                                {isOp ? "Remove OP" : "Make OP"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
