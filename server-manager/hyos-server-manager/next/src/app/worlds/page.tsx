"use client";

import { useState, useCallback, useRef } from "react";
import {
  useUniverseFiles,
  useSlots,
  useCreateSlot,
  useActivateSlot,
  useDeleteSlot,
  useRenameSlot,
} from "@/lib/services/worlds";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileInfo, SlotInfo } from "@/lib/services/worlds/worlds.types";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function FileTree({ files, level = 0 }: { files: FileInfo[]; level?: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div key={file.path}>
          <div
            className={cn(
              "flex items-center gap-2 py-1 px-2 hover:bg-accent/50 cursor-pointer",
              level > 0 && "pl-6",
            )}
            style={{ paddingLeft: `${level * 1.5}rem` }}
          >
            {file.type === "directory" ? (
              <button
                onClick={() => toggle(file.path)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                <span className="text-muted-foreground">
                  {expanded.has(file.path) ? "▼" : "▶"}
                </span>
                <span className="font-medium">{file.name}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-muted-foreground">•</span>
                <span className="flex-1">{file.name}</span>
                {file.size !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                )}
              </div>
            )}
          </div>
          {file.type === "directory" &&
            expanded.has(file.path) &&
            file.children &&
            file.children.length > 0 && (
              <FileTree files={file.children} level={level + 1} />
            )}
        </div>
      ))}
    </div>
  );
}

export default function WorldsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: filesData,
    error: filesError,
    mutate: refreshFiles,
  } = useUniverseFiles();
  const {
    data: slotsData,
    error: slotsError,
    mutate: refreshSlots,
  } = useSlots();
  const { trigger: createSlot, isMutating: isCreatingSlot } = useCreateSlot();
  const { trigger: activateSlot, isMutating: isActivating } = useActivateSlot();
  const { trigger: deleteSlot, isMutating: isDeleting } = useDeleteSlot();
  const { trigger: renameSlot, isMutating: isRenaming } = useRenameSlot();

  const [activatingSlotId, setActivatingSlotId] = useState<string | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [renamingSlotId, setRenamingSlotId] = useState<string | null>(null);
  const [renamingSlotName, setRenamingSlotName] = useState<string>("");
  const [newSlotName, setNewSlotName] = useState<string>("");
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".zip")) {
        setSelectedFile(file);
        setShowConfirmDialog(true);
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.name.endsWith(".zip")) {
          setSelectedFile(file);
          setShowConfirmDialog(true);
        }
      }
    },
    [],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await createSlot(selectedFile);
      setShowConfirmDialog(false);
      setSelectedFile(null);
      await Promise.all([refreshFiles(), refreshSlots()]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setUploading(false);
    }
  }, [selectedFile, createSlot, refreshFiles, refreshSlots]);

  const handleActivateSlot = useCallback(
    async (slotId: string, slotName: string) => {
      if (
        !confirm(
          `Activate ${slotName}? The current universe will be auto-saved to a new slot before switching.`,
        )
      ) {
        return;
      }

      try {
        setActivatingSlotId(slotId);
        await activateSlot(slotId);
        await Promise.all([refreshFiles(), refreshSlots()]);
      } catch (error) {
        console.error("Activation failed:", error);
        alert(
          error instanceof Error ? error.message : "Failed to activate slot",
        );
      } finally {
        setActivatingSlotId(null);
      }
    },
    [activateSlot, refreshFiles, refreshSlots],
  );

  const handleDeleteSlot = useCallback(
    async (slotId: string, slotName: string) => {
      if (!confirm(`Delete ${slotName}? This action cannot be undone.`)) {
        return;
      }

      try {
        setDeletingSlotId(slotId);
        await deleteSlot(slotId);
        await refreshSlots();
      } catch (error) {
        console.error("Deletion failed:", error);
        alert(error instanceof Error ? error.message : "Failed to delete slot");
      } finally {
        setDeletingSlotId(null);
      }
    },
    [deleteSlot, refreshSlots],
  );

  const handleRenameClick = useCallback(
    (slotId: string, currentName: string) => {
      setRenamingSlotId(slotId);
      setRenamingSlotName(currentName);
      setNewSlotName(currentName);
      setShowRenameDialog(true);
    },
    [],
  );

  const handleRenameSlot = useCallback(async () => {
    if (!renamingSlotId || !newSlotName.trim()) {
      return;
    }

    if (newSlotName.trim().length > 100) {
      alert("Slot name must be 100 characters or less");
      return;
    }

    try {
      await renameSlot({ slotId: renamingSlotId, newName: newSlotName.trim() });
      setShowRenameDialog(false);
      setRenamingSlotId(null);
      setRenamingSlotName("");
      setNewSlotName("");
      await refreshSlots();
    } catch (error) {
      console.error("Rename failed:", error);
      alert(error instanceof Error ? error.message : "Failed to rename slot");
    }
  }, [renamingSlotId, newSlotName, renameSlot, refreshSlots]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 font-cablefied">
          World Manager
        </h1>
        <p className="text-muted-foreground">
          Upload world files to slots and switch between them
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload World Files</CardTitle>
          <CardDescription>
            Upload a zip file to create a new world slot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed border-border p-12 text-center",
              "transition-colors",
              dragActive
                ? "bg-accent border-primary"
                : "bg-background hover:bg-accent/50",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <svg
                className="size-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drag and drop a zip file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only .zip files are supported
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Current Files */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Universe Files</CardTitle>
              <CardDescription>
                Browse the current universe folder structure
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => refreshFiles()}
              disabled={filesError !== undefined}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filesError && (
            <div className="text-destructive text-sm">
              Error loading files: {filesError.message}
            </div>
          )}
          {!filesError && filesData && filesData.files.length === 0 && (
            <div className="text-muted-foreground text-sm">
              No files found in universe folder
            </div>
          )}
          {!filesError && filesData && filesData.files.length > 0 && (
            <div className="bg-background-secondary border border-border p-4 max-h-[400px] overflow-auto">
              <FileTree files={filesData.files} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slots */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>World Slots</CardTitle>
              <CardDescription>
                Manage world slots and switch between them
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => refreshSlots()}
              disabled={slotsError !== undefined}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {slotsError && (
            <div className="text-destructive text-sm">
              Error loading slots: {slotsError.message}
            </div>
          )}
          {!slotsError && slotsData && slotsData.slots.length === 0 && (
            <div className="text-muted-foreground text-sm">
              No slots available. Upload a world file to create your first slot.
            </div>
          )}
          {!slotsError && slotsData && slotsData.slots.length > 0 && (
            <div className="space-y-2">
              {slotsData.slots.map((slot: SlotInfo) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 bg-background-secondary border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {slot.name}
                      </span>
                      <button
                        onClick={() => handleRenameClick(slot.id, slot.name)}
                        disabled={isRenaming || renamingSlotId === slot.id}
                        className="p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Rename slot"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {slot.autoSaved && (
                        <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground">
                          Auto-saved
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {slot.size !== undefined &&
                        `${formatBytes(slot.size)} • `}
                      {formatDate(slot.created)}
                      {slot.sourceFile && ` • ${slot.sourceFile}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleActivateSlot(slot.id, slot.name)}
                      disabled={isActivating || activatingSlotId === slot.id}
                    >
                      {isActivating && activatingSlotId === slot.id
                        ? "Activating..."
                        : "Activate"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSlot(slot.id, slot.name)}
                      disabled={isDeleting || deletingSlotId === slot.id}
                    >
                      {isDeleting && deletingSlotId === slot.id
                        ? "Deleting..."
                        : "Delete"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Upload</DialogTitle>
            <DialogDescription>
              This will create a new world slot from the uploaded file. You can
              activate it later to make it the active universe.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground">
              File: <span className="font-medium">{selectedFile?.name}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Size: {selectedFile ? formatBytes(selectedFile.size) : "N/A"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setSelectedFile(null);
              }}
              disabled={uploading || isCreatingSlot}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleUpload}
              disabled={uploading || isCreatingSlot}
            >
              {uploading || isCreatingSlot ? "Uploading..." : "Create Slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Slot</DialogTitle>
            <DialogDescription>
              Enter a new name for this slot (1-100 characters)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              value={newSlotName}
              onChange={(e) => setNewSlotName(e.target.value)}
              placeholder="Slot name"
              maxLength={100}
              disabled={isRenaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSlotName.trim()) {
                  handleRenameSlot();
                }
              }}
            />
            {newSlotName.trim().length > 100 && (
              <p className="text-xs text-destructive mt-2">
                Name must be 100 characters or less
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRenameDialog(false);
                setRenamingSlotId(null);
                setRenamingSlotName("");
                setNewSlotName("");
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleRenameSlot}
              disabled={
                isRenaming ||
                !newSlotName.trim() ||
                newSlotName.trim().length > 100
              }
            >
              {isRenaming ? "Renaming..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
