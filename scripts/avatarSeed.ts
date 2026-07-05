import {
  buildAvatarShortPrompt,
  DEFAULT_AVATAR_OUTPUT_PATH,
  DEFAULT_AVATAR_WORKFLOW_PATH,
  DEFAULT_COMFYUI_BASE_URL,
  generateComfyImage,
  randomComfySeed,
} from "../src/lib/comfyui/client";

interface AvatarSeedOptions {
  workflowPath: string;
  outputPath: string;
  seed: number;
  slug: string | null;
}

const parseSeed = (value: string) => {
  const seed = Number(value);
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new Error(`Invalid --seed value: ${value}`);
  }
  return seed;
};

const parseArgs = (args: string[]): AvatarSeedOptions => {
  let seed: number | null = null;
  let slug: string | null = null;
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--seed") {
      const value = args[index + 1];
      if (!value) throw new Error("--seed requires a value");
      seed = parseSeed(value);
      index += 1;
      continue;
    }
    if (arg.startsWith("--seed=")) {
      seed = parseSeed(arg.slice("--seed=".length));
      continue;
    }
    if (arg === "--slug") {
      const value = args[index + 1];
      if (!value) throw new Error("--slug requires a value");
      slug = value.trim();
      index += 1;
      continue;
    }
    if (arg.startsWith("--slug=")) {
      slug = arg.slice("--slug=".length).trim();
      continue;
    }
    positional.push(arg);
  }

  if (slug === "") {
    throw new Error("--slug requires a non-empty value");
  }

  return {
    workflowPath: positional[0] ?? DEFAULT_AVATAR_WORKFLOW_PATH,
    outputPath: positional[1] ?? DEFAULT_AVATAR_OUTPUT_PATH,
    seed: seed ?? randomComfySeed(),
    slug,
  };
};

const main = async () => {
  const baseUrl = process.env.COMFYUI_BASE_URL ?? DEFAULT_COMFYUI_BASE_URL;
  const { workflowPath, outputPath, seed, slug } = parseArgs(process.argv.slice(2));
  const shortPrompt = slug ? buildAvatarShortPrompt(slug) : undefined;

  console.log(`[avatar-seed] loading workflow: ${workflowPath}`);
  console.log(`[avatar-seed] seed: ${seed}`);
  if (slug) console.log(`[avatar-seed] slug: ${slug}`);
  console.log(`[avatar-seed] submitting workflow to ${baseUrl}`);

  const result = await generateComfyImage({
    baseUrl,
    workflowPath,
    outputPath,
    seed,
    shortPrompt,
  });

  console.log(`[avatar-seed] prompt id: ${result.promptId}`);
  console.log(`[avatar-seed] generated image: ${result.image.filename}`);
  console.log(`[avatar-seed] saved: ${result.outputPath}`);
};

main().catch((error) => {
  console.error("[avatar-seed]", error);
  process.exitCode = 1;
});
