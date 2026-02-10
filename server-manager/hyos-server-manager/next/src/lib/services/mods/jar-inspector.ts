import AdmZip from "adm-zip";
import {
  CONTENT_MOD_STUB_CLASS_BASE64,
  CONTENT_MOD_STUB_CLASS_PATH,
  CONTENT_MOD_STUB_MAIN,
} from "./content-mod-stub";

export interface ManifestInfo {
  hasManifest: boolean;
  main: string | null;
  group: string | null;
  name: string | null;
  version: string | null;
  dependencies: string[];
  serverVersion: string | null;
}

export interface JarInspectionResult {
  needsPatch: boolean;
  isPatched: boolean;
  manifestInfo: ManifestInfo | undefined;
}

/**
 * Check whether a manifest has all required content-mod fields.
 * A fully patched content mod needs Main, IncludesAssetPack, LoadBefore, and SubPlugins.
 */
function isFullyPatched(manifest: Record<string, unknown>): boolean {
  return (
    manifest.Main === CONTENT_MOD_STUB_MAIN &&
    "IncludesAssetPack" in manifest &&
    "LoadBefore" in manifest &&
    "SubPlugins" in manifest
  );
}

/**
 * Inspect a JAR's manifest.json for Main class presence and content-mod fields.
 */
export function inspectJar(jarPath: string): JarInspectionResult {
  const zip = new AdmZip(jarPath);
  const entry = zip.getEntry("manifest.json");

  if (!entry) {
    // No manifest — not a standard Hytale mod, nothing to patch
    return {
      needsPatch: false,
      isPatched: false,
      manifestInfo: undefined,
    };
  }

  const manifest = JSON.parse(zip.readAsText(entry));
  const main: string | undefined = manifest.Main;

  // Parse dependencies - can be array of strings or objects
  let dependencies: string[] = [];
  if (Array.isArray(manifest.Dependencies)) {
    dependencies = manifest.Dependencies.map((dep: unknown) => {
      if (typeof dep === "string") return dep;
      if (typeof dep === "object" && dep !== null && "Group" in dep) {
        return String((dep as { Group: unknown }).Group);
      }
      return String(dep);
    });
  }

  const manifestInfo: ManifestInfo = {
    hasManifest: true,
    main: main ?? null,
    group: manifest.Group ?? null,
    name: manifest.Name ?? null,
    version: manifest.Version ?? null,
    dependencies,
    serverVersion: manifest.ServerVersion ?? null,
  };

  // No Main class at all — needs patch
  if (!main || main.trim() === "") {
    return { needsPatch: true, isPatched: false, manifestInfo };
  }

  // Has stub Main — check if all content-mod fields are present
  if (main === CONTENT_MOD_STUB_MAIN) {
    const fullyPatched = isFullyPatched(manifest);
    return {
      needsPatch: !fullyPatched,
      isPatched: fullyPatched,
      manifestInfo,
    };
  }

  return { needsPatch: false, isPatched: false, manifestInfo };
}

/**
 * Patch a content-only mod JAR by injecting the stub class and updating manifest.json.
 */
export function patchJar(jarPath: string): void {
  const zip = new AdmZip(jarPath);

  // Inject stub class
  const stubBytes = Buffer.from(CONTENT_MOD_STUB_CLASS_BASE64, "base64");
  zip.addFile(CONTENT_MOD_STUB_CLASS_PATH, stubBytes);

  // Update manifest.json with Main field
  const manifestEntry = zip.getEntry("manifest.json");
  if (!manifestEntry) {
    throw new Error("No manifest.json found in JAR");
  }

  const manifest = JSON.parse(zip.readAsText(manifestEntry));

  // Set Main class
  manifest.Main = CONTENT_MOD_STUB_MAIN;

  // Ensure all content-mod fields are present
  if (!("IncludesAssetPack" in manifest)) {
    manifest.IncludesAssetPack = true;
  }
  if (!("LoadBefore" in manifest)) {
    manifest.LoadBefore = {};
  }
  if (!("SubPlugins" in manifest)) {
    manifest.SubPlugins = [];
  }
  if (!("ServerVersion" in manifest) || manifest.ServerVersion === "*") {
    manifest.ServerVersion = "";
  }

  const updatedManifest = Buffer.from(JSON.stringify(manifest, null, 2));

  zip.deleteFile("manifest.json");
  zip.addFile("manifest.json", updatedManifest);

  zip.writeZip(jarPath);
}
