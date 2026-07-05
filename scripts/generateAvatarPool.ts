import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAvatarPromptSlug,
  DEFAULT_AVATAR_SLUG_FIELDS,
  type AvatarSlugFieldDefinition,
  type AvatarSlugValues,
} from "../src/lib/characters/avatar";
import {
  buildAvatarShortPrompt,
  DEFAULT_AVATAR_WORKFLOW_PATH,
  DEFAULT_COMFYUI_BASE_URL,
  generateComfyImage,
  randomComfySeed,
} from "../src/lib/comfyui/client";

interface AvatarPoolOptions {
  perCombo: number;
  maxCombos: number | null;
  genders: string[] | null;
  outputDir: string;
  manifestPath: string;
  workflowPath: string;
  resume: boolean;
}

interface AvatarPoolManifestItem {
  id: string;
  path: string;
  slugValues: AvatarSlugValues;
  promptSlug: string;
  variant: number;
  seed: number;
  promptId: string;
  createdAt: string;
}

interface AvatarPoolManifest {
  generatedAt: string;
  workflowPath: string;
  perCombo: number;
  items: AvatarPoolManifestItem[];
}

const DEFAULT_OUTPUT_DIR = "public/generated/avatars/pool";
const DEFAULT_MANIFEST_PATH = "public/generated/avatars/pool/manifest.json";

const slugPart = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const publicPathFromFilePath = (filePath: string) =>
  `/${filePath.replace(/^public\/?/, "").replace(/^\/+/, "")}`;

const parsePositiveInt = (flag: string, value: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer`);
  }
  return parsed;
};

const parseArgs = (args: string[]): AvatarPoolOptions => {
  let perCombo = 1;
  let maxCombos: number | null = null;
  let genders: string[] | null = null;
  let outputDir = DEFAULT_OUTPUT_DIR;
  let manifestPath = DEFAULT_MANIFEST_PATH;
  let workflowPath = DEFAULT_AVATAR_WORKFLOW_PATH;
  let resume = true;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = (flag: string) => {
      const value = args[index + 1];
      if (!value) throw new Error(`${flag} requires a value`);
      index += 1;
      return value;
    };

    if (arg === "--per-combo") {
      perCombo = parsePositiveInt(arg, nextValue(arg));
      continue;
    }
    if (arg.startsWith("--per-combo=")) {
      perCombo = parsePositiveInt("--per-combo", arg.slice("--per-combo=".length));
      continue;
    }
    if (arg === "--max-combos") {
      maxCombos = parsePositiveInt(arg, nextValue(arg));
      continue;
    }
    if (arg.startsWith("--max-combos=")) {
      maxCombos = parsePositiveInt("--max-combos", arg.slice("--max-combos=".length));
      continue;
    }
    if (arg === "--gender" || arg === "--genders") {
      genders = nextValue(arg).split(",").map((item) => item.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--gender=")) {
      genders = arg.slice("--gender=".length).split(",").map((item) => item.trim()).filter(Boolean);
      continue;
    }
    if (arg.startsWith("--genders=")) {
      genders = arg.slice("--genders=".length).split(",").map((item) => item.trim()).filter(Boolean);
      continue;
    }
    if (arg === "--output-dir") {
      outputDir = nextValue(arg);
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      outputDir = arg.slice("--output-dir=".length);
      continue;
    }
    if (arg === "--manifest") {
      manifestPath = nextValue(arg);
      continue;
    }
    if (arg.startsWith("--manifest=")) {
      manifestPath = arg.slice("--manifest=".length);
      continue;
    }
    if (arg === "--workflow") {
      workflowPath = nextValue(arg);
      continue;
    }
    if (arg.startsWith("--workflow=")) {
      workflowPath = arg.slice("--workflow=".length);
      continue;
    }
    if (arg === "--no-resume") {
      resume = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (genders && genders.length === 0) genders = null;

  return {
    perCombo,
    maxCombos,
    genders,
    outputDir,
    manifestPath,
    workflowPath,
    resume,
  };
};

const buildCombinations = (
  fields: readonly AvatarSlugFieldDefinition[],
): AvatarSlugValues[] =>
  fields.reduce<AvatarSlugValues[]>(
    (prefixes, field) =>
      prefixes.flatMap((prefix) =>
        field.options.map((option) => ({
          ...prefix,
          [field.key]: option.id,
        }))),
    [{}],
  );

const shuffle = <T,>(items: readonly T[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const comboId = (values: AvatarSlugValues) =>
  DEFAULT_AVATAR_SLUG_FIELDS
    .map((field) => slugPart(values[field.key] ?? "none"))
    .join("-");

const outputPathFor = ({
  outputDir,
  values,
  variant,
}: {
  outputDir: string;
  values: AvatarSlugValues;
  variant: number;
}) => {
  const gender = slugPart(values.gender ?? "unknown");
  return path.join(outputDir, gender, `${comboId(values)}-v${variant}.png`);
};

const loadExistingManifest = async (manifestPath: string): Promise<AvatarPoolManifest | null> => {
  try {
    const raw = await readFile(manifestPath, "utf8");
    return JSON.parse(raw) as AvatarPoolManifest;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? (error as { code?: string }).code
      : null;
    if (code === "ENOENT") return null;
    throw error;
  }
};

const writeManifest = async (manifestPath: string, manifest: AvatarPoolManifest) => {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const existingManifest = options.resume
    ? await loadExistingManifest(options.manifestPath)
    : null;
  const existingIds = new Set(existingManifest?.items.map((item) => item.id) ?? []);
  const manifest: AvatarPoolManifest = existingManifest ?? {
    generatedAt: new Date().toISOString(),
    workflowPath: options.workflowPath,
    perCombo: options.perCombo,
    items: [],
  };
  const genderFilter = options.genders ? new Set(options.genders) : null;
  const allCombos = buildCombinations(DEFAULT_AVATAR_SLUG_FIELDS)
    .filter((values) => !genderFilter || genderFilter.has(values.gender));
  const combos = options.maxCombos === null
    ? allCombos
    : shuffle(allCombos).slice(0, options.maxCombos);
  const totalRequested = combos.length * options.perCombo;
  let generated = 0;
  let skipped = 0;

  console.log(`[avatar-pool] combos: ${combos.length}`);
  console.log(`[avatar-pool] per combo: ${options.perCombo}`);
  console.log(`[avatar-pool] requested images: ${totalRequested}`);
  console.log(`[avatar-pool] output: ${options.outputDir}`);
  console.log(`[avatar-pool] manifest: ${options.manifestPath}`);

  for (const values of combos) {
    const promptSlug = buildAvatarPromptSlug(DEFAULT_AVATAR_SLUG_FIELDS, values);

    for (let variant = 1; variant <= options.perCombo; variant += 1) {
      const id = `${comboId(values)}-v${variant}`;
      const outputPath = outputPathFor({
        outputDir: options.outputDir,
        values,
        variant,
      });

      if (existingIds.has(id)) {
        skipped += 1;
        continue;
      }

      const seed = randomComfySeed();
      console.log(`[avatar-pool] generating ${id}`);
      const result = await generateComfyImage({
        baseUrl: process.env.COMFYUI_BASE_URL ?? DEFAULT_COMFYUI_BASE_URL,
        workflowPath: options.workflowPath,
        outputPath,
        seed,
        shortPrompt: buildAvatarShortPrompt(promptSlug),
      });
      manifest.items.push({
        id,
        path: publicPathFromFilePath(outputPath),
        slugValues: values,
        promptSlug,
        variant,
        seed: result.seed,
        promptId: result.promptId,
        createdAt: new Date().toISOString(),
      });
      existingIds.add(id);
      generated += 1;
      await writeManifest(options.manifestPath, manifest);
    }
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.workflowPath = options.workflowPath;
  manifest.perCombo = options.perCombo;
  await writeManifest(options.manifestPath, manifest);

  console.log(`[avatar-pool] generated: ${generated}`);
  console.log(`[avatar-pool] skipped existing: ${skipped}`);
  console.log(`[avatar-pool] manifest items: ${manifest.items.length}`);
};

void main().catch((error) => {
  console.error("[avatar-pool]", error);
  process.exitCode = 1;
});
