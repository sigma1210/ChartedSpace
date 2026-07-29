import { randomUUID } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_TACTICAL_TEMPLATE_BYTES = 25 * 1024 * 1024;
export const tacticalTemplateDirectory = path.join(process.cwd(), "public", "generated", "tactical-templates");
export const TACTICAL_TEMPLATE_PUBLIC_PREFIX = "/generated/tactical-templates";

export interface TacticalTemplateAsset {
  id: string;
  label: string;
  imagePath: string;
  source: "built-in" | "uploaded";
}

export interface TacticalTemplateUpload {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export class TacticalTemplateFileError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "TacticalTemplateFileError";
  }
}

const builtInTemplates: TacticalTemplateAsset[] = [{
  id: "built-in:landing-pad",
  label: "Landing Pad",
  imagePath: "/images/tactical/landing-pad/map.jpg",
  source: "built-in",
}];

const supportedExtension = (filename: string) => {
  const extension = path.extname(filename).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp"].includes(extension) ? extension : null;
};

const detectedImageType = (bytes: Uint8Array) => {
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) return { extension: ".png", mimeType: "image/png" };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: ".jpg", mimeType: "image/jpeg" };
  }
  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return { extension: ".webp", mimeType: "image/webp" };
  return null;
};

const uploadLabel = (filename: string) => {
  const withoutExtension = filename.slice(0, filename.length - path.extname(filename).length);
  const normalized = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Tactical Template";
};

const uploadSlug = (filename: string) => uploadLabel(filename)
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  || "tactical-template";

export const listTacticalTemplateFiles = async (
  directory = tacticalTemplateDirectory,
  publicPrefix = TACTICAL_TEMPLATE_PUBLIC_PREFIX,
): Promise<TacticalTemplateAsset[]> => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return builtInTemplates.map((template) => ({ ...template }));
    throw error;
  }
  const uploaded = entries
    .filter((entry) => entry.isFile() && supportedExtension(entry.name))
    .map((entry): TacticalTemplateAsset => ({
      id: `uploaded:${entry.name}`,
      label: uploadLabel(entry.name.replace(/-[0-9a-f]{32}(?=\.[^.]+$)/, "")),
      imagePath: `${publicPrefix}/${encodeURIComponent(entry.name)}`,
      source: "uploaded",
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
  return [...builtInTemplates.map((template) => ({ ...template })), ...uploaded];
};

export const saveTacticalTemplateFile = async (
  upload: TacticalTemplateUpload,
  directory = tacticalTemplateDirectory,
  publicPrefix = TACTICAL_TEMPLATE_PUBLIC_PREFIX,
): Promise<TacticalTemplateAsset> => {
  const declaredExtension = supportedExtension(upload.name);
  if (!declaredExtension) {
    throw new TacticalTemplateFileError("Template images must be PNG, JPEG, or WebP files.", 400, "unsupported-template-type");
  }
  if (!Number.isSafeInteger(upload.size) || upload.size <= 0) {
    throw new TacticalTemplateFileError("The template image is empty.", 400, "empty-template");
  }
  if (upload.size > MAX_TACTICAL_TEMPLATE_BYTES) {
    throw new TacticalTemplateFileError("Template images must be 25 MB or smaller.", 413, "template-too-large");
  }

  const bytes = new Uint8Array(await upload.arrayBuffer());
  if (bytes.byteLength !== upload.size) {
    throw new TacticalTemplateFileError("The uploaded template size did not match its contents.", 400, "invalid-template-size");
  }
  const detected = detectedImageType(bytes);
  if (!detected) {
    throw new TacticalTemplateFileError("The uploaded file is not a valid PNG, JPEG, or WebP image.", 400, "invalid-template-image");
  }
  const declaredMimeType = upload.type.toLowerCase();
  if (declaredMimeType && declaredMimeType !== detected.mimeType) {
    throw new TacticalTemplateFileError("The template file type does not match its contents.", 400, "template-type-mismatch");
  }
  const extensionMatches = declaredExtension === detected.extension
    || (declaredExtension === ".jpeg" && detected.extension === ".jpg");
  if (!extensionMatches) {
    throw new TacticalTemplateFileError("The template filename extension does not match its contents.", 400, "template-type-mismatch");
  }

  await mkdir(directory, { recursive: true });
  const assetId = randomUUID().replaceAll("-", "");
  const filename = `${uploadSlug(upload.name)}-${assetId}${detected.extension}`;
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  return {
    id: `uploaded:${filename}`,
    label: uploadLabel(upload.name),
    imagePath: `${publicPrefix}/${encodeURIComponent(filename)}`,
    source: "uploaded",
  };
};
