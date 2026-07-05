import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ComfyWorkflow = Record<string, unknown>;

interface ComfyNode {
  inputs?: Record<string, unknown>;
}

interface ComfyPromptResponse {
  prompt_id?: string;
  number?: number;
  node_errors?: Record<string, unknown>;
  error?: unknown;
}

export interface ComfyImageOutput {
  filename: string;
  subfolder?: string;
  type?: string;
}

interface ComfyHistoryEntry {
  outputs?: Record<string, { images?: ComfyImageOutput[] }>;
  status?: {
    completed?: boolean;
    status_str?: string;
    messages?: Array<unknown>;
  };
}

type ComfyHistoryResponse = Record<string, ComfyHistoryEntry>;

export interface GenerateComfyImageOptions {
  baseUrl: string;
  workflowPath: string;
  outputPath: string;
  seed?: number;
  shortPrompt?: string;
  samplerNodeId?: string;
  promptNodeId?: string;
  promptInputKey?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface GenerateComfyImageResult {
  promptId: string;
  seed: number;
  image: ComfyImageOutput;
  outputPath: string;
}

export const DEFAULT_COMFYUI_BASE_URL = "http://10.0.0.209:8188";
export const DEFAULT_AVATAR_WORKFLOW_PATH = "workflows/comfyui/avatar-test.json";
export const DEFAULT_AVATAR_OUTPUT_PATH = "public/generated/avatars/test-avatar.png";
export const DEFAULT_AVATAR_SAMPLER_NODE_ID = "163";
export const DEFAULT_AVATAR_PROMPT_NODE_ID = "243";
export const DEFAULT_AVATAR_PROMPT_INPUT_KEY = "string_b";
export const DEFAULT_COMFY_POLL_INTERVAL_MS = 1_500;
export const DEFAULT_COMFY_TIMEOUT_MS = 5 * 60_000;

export const SHARED_AVATAR_PROMPT_SUFFIX = [
  "explorer in sci fi far future. on spaceship, simple background, Anime-style professional avatar portrait,",
  "confident and approachable professional adult posing for a business networking profile,",
  "facing the camera with direct eye contact, subtle friendly smile, composed and trustworthy expression,",
  "framed from mid-chest upward, full head and shoulders completely visible, entire face inside the frame,",
  "generous headroom above the hair, centered composition, modern professional attire, clean and polished appearance,",
  "elegant anime illustration, high-quality character design, detailed eyes, refined facial features, natural pose,",
  "soft studio lighting, subtle depth of field, simple uncluttered background with professional aesthetic,",
  "premium corporate branding feel, crisp line art, beautiful shading, vibrant but realistic color palette,",
  "high detail, professional social media profile picture, polished anime portrait, masterpiece quality",
].join(" ");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const normalizeComfyBaseUrl = (value: string) => value.replace(/\/+$/, "");

export const randomComfySeed = () => {
  const value = randomBytes(8).readBigUInt64BE();
  return Number(value & BigInt(Number.MAX_SAFE_INTEGER));
};

export const buildAvatarShortPrompt = (slug: string) =>
  `${slug},\n\n${SHARED_AVATAR_PROMPT_SUFFIX}`;

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? JSON.parse(text) as T : {} as T;
  if (!response.ok) {
    throw new Error(`ComfyUI request failed ${response.status}: ${text}`);
  }
  return body;
};

export const loadComfyWorkflow = async (workflowPath: string): Promise<ComfyWorkflow> => {
  const raw = await readFile(workflowPath, "utf8");
  return JSON.parse(raw) as ComfyWorkflow;
};

export const setComfyNodeInput = ({
  workflow,
  nodeId,
  inputKey,
  value,
}: {
  workflow: ComfyWorkflow;
  nodeId: string;
  inputKey: string;
  value: unknown;
}) => {
  const node = workflow[nodeId] as ComfyNode | undefined;
  if (!node?.inputs) {
    throw new Error(`Workflow is missing node ${nodeId} inputs`);
  }
  node.inputs[inputKey] = value;
};

export const submitComfyWorkflow = async ({
  baseUrl,
  workflow,
}: {
  baseUrl: string;
  workflow: ComfyWorkflow;
}) => {
  const response = await fetchJson<ComfyPromptResponse>(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: randomUUID(),
      prompt: workflow,
    }),
  });

  if (!response.prompt_id) {
    throw new Error(`ComfyUI did not return prompt_id: ${JSON.stringify(response)}`);
  }
  if (response.node_errors && Object.keys(response.node_errors).length > 0) {
    throw new Error(`ComfyUI node errors: ${JSON.stringify(response.node_errors)}`);
  }

  return response.prompt_id;
};

const firstImageFromHistory = (
  history: ComfyHistoryResponse,
  promptId: string,
) => {
  const entry = history[promptId];
  if (!entry?.outputs) return null;

  for (const output of Object.values(entry.outputs)) {
    const image = output.images?.[0];
    if (image) return image;
  }

  return null;
};

export const waitForComfyImage = async ({
  baseUrl,
  promptId,
  pollIntervalMs = DEFAULT_COMFY_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_COMFY_TIMEOUT_MS,
}: {
  baseUrl: string;
  promptId: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const history = await fetchJson<ComfyHistoryResponse>(`${baseUrl}/history/${promptId}`);
    const image = firstImageFromHistory(history, promptId);
    if (image) return image;

    const status = history[promptId]?.status;
    if (status?.completed && !image) {
      throw new Error(`ComfyUI completed without image output: ${JSON.stringify(status)}`);
    }
    if (status?.status_str === "error") {
      throw new Error(`ComfyUI execution error: ${JSON.stringify(status)}`);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}`);
};

export const downloadComfyImage = async ({
  baseUrl,
  image,
}: {
  baseUrl: string;
  image: ComfyImageOutput;
}) => {
  const params = new URLSearchParams();
  params.set("filename", image.filename);
  params.set("subfolder", image.subfolder ?? "");
  params.set("type", image.type ?? "output");

  const response = await fetch(`${baseUrl}/view?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to download image ${response.status}: ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

export const generateComfyImage = async ({
  baseUrl,
  workflowPath,
  outputPath,
  seed = randomComfySeed(),
  shortPrompt,
  samplerNodeId = DEFAULT_AVATAR_SAMPLER_NODE_ID,
  promptNodeId = DEFAULT_AVATAR_PROMPT_NODE_ID,
  promptInputKey = DEFAULT_AVATAR_PROMPT_INPUT_KEY,
  pollIntervalMs,
  timeoutMs,
}: GenerateComfyImageOptions): Promise<GenerateComfyImageResult> => {
  const normalizedBaseUrl = normalizeComfyBaseUrl(baseUrl);
  const workflow = await loadComfyWorkflow(workflowPath);

  setComfyNodeInput({
    workflow,
    nodeId: samplerNodeId,
    inputKey: "seed",
    value: seed,
  });

  if (shortPrompt) {
    setComfyNodeInput({
      workflow,
      nodeId: promptNodeId,
      inputKey: promptInputKey,
      value: shortPrompt,
    });
  }

  const promptId = await submitComfyWorkflow({
    baseUrl: normalizedBaseUrl,
    workflow,
  });
  const image = await waitForComfyImage({
    baseUrl: normalizedBaseUrl,
    promptId,
    pollIntervalMs,
    timeoutMs,
  });
  const imageBytes = await downloadComfyImage({
    baseUrl: normalizedBaseUrl,
    image,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, imageBytes);

  return {
    promptId,
    seed,
    image,
    outputPath,
  };
};
