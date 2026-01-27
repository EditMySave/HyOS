import {
  type BackupCreateResponse,
  backupCreateResponseSchema,
  type BackupsResponse,
  backupsResponseSchema,
  type FilesResponse,
  filesResponseSchema,
  type UploadResponse,
  uploadResponseSchema,
  type SlotsResponse,
  slotsResponseSchema,
  type CreateSlotResponse,
  createSlotResponseSchema,
  type ActivateResponse,
  activateResponseSchema,
} from "./worlds.types";

/**
 * Get list of files in the universe folder
 */
export async function getUniverseFiles(): Promise<FilesResponse> {
  const response = await fetch("/api/worlds/files");
  if (!response.ok) {
    throw new Error(`Failed to fetch universe files: ${response.statusText}`);
  }
  const data = await response.json();
  return filesResponseSchema.parse(data);
}

/**
 * Upload a zip file to import into the universe folder
 */
export async function uploadUniverseZip(
  file: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/worlds/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to upload: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return uploadResponseSchema.parse(data);
}

/**
 * Get list of available backups
 */
export async function getBackups(): Promise<BackupsResponse> {
  const response = await fetch("/api/worlds/backup");
  if (!response.ok) {
    throw new Error(`Failed to fetch backups: ${response.statusText}`);
  }
  const data = await response.json();
  return backupsResponseSchema.parse(data);
}

/**
 * Create a backup of the current universe folder
 */
export async function createBackup(): Promise<BackupCreateResponse> {
  const response = await fetch("/api/worlds/backup", {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to create backup: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return backupCreateResponseSchema.parse(data);
}

/**
 * Get list of all slots
 */
export async function getSlots(): Promise<SlotsResponse> {
  const response = await fetch("/api/worlds/slots");
  if (!response.ok) {
    throw new Error(`Failed to fetch slots: ${response.statusText}`);
  }
  const data = await response.json();
  return slotsResponseSchema.parse(data);
}

/**
 * Create a new slot from an uploaded ZIP file
 */
export async function createSlot(file: File): Promise<CreateSlotResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/worlds/slots", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to create slot: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return createSlotResponseSchema.parse(data);
}

/**
 * Activate a slot (makes it the active universe)
 */
export async function activateSlot(slotId: string): Promise<ActivateResponse> {
  const response = await fetch(`/api/worlds/slots/${slotId}/activate`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to activate slot: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return activateResponseSchema.parse(data);
}

/**
 * Delete a slot
 */
export async function deleteSlot(slotId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/worlds/slots/${slotId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to delete slot: ${response.statusText}`,
    );
  }

  return await response.json();
}
