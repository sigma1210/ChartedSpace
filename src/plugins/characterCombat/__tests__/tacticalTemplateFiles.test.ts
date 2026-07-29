import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  listTacticalTemplateFiles,
  MAX_TACTICAL_TEMPLATE_BYTES,
  saveTacticalTemplateFile,
  type TacticalTemplateUpload,
} from "../server/tacticalTemplateFiles";

const upload = (name: string, type: string, content: number[]): TacticalTemplateUpload => {
  const bytes = Uint8Array.from(content);
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  };
};

describe("tactical template files", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "charted-space-templates-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("lists the built-in template and uploaded raster images", async () => {
    await writeFile(path.join(directory, "cargo-deck-a1b2c3d4e5f60718293a4b5c6d7e8f90.png"), Uint8Array.from([0x89]));
    await writeFile(path.join(directory, "ignore.txt"), "not an image");

    const templates = await listTacticalTemplateFiles(directory, "/test/templates");

    expect(templates).toContainEqual({
      id: "built-in:landing-pad",
      label: "Landing Pad",
      imagePath: "/images/tactical/landing-pad/map.jpg",
      source: "built-in",
    });
    expect(templates).toContainEqual({
      id: "uploaded:cargo-deck-a1b2c3d4e5f60718293a4b5c6d7e8f90.png",
      label: "cargo deck",
      imagePath: "/test/templates/cargo-deck-a1b2c3d4e5f60718293a4b5c6d7e8f90.png",
      source: "uploaded",
    });
    expect(templates).toHaveLength(2);
  });

  it("stores a signature-validated image under a collision-safe name", async () => {
    const png = upload("My Deck Plan.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const saved = await saveTacticalTemplateFile(png, directory, "/test/templates");
    const filename = decodeURIComponent(saved.imagePath.split("/").at(-1) ?? "");

    expect(saved).toMatchObject({
      label: "My Deck Plan",
      source: "uploaded",
    });
    expect(filename).toMatch(/^my-deck-plan-[0-9a-f]{32}\.png$/);
    expect([...await readFile(path.join(directory, filename))]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("rejects disguised images and mismatched MIME types", async () => {
    await expect(saveTacticalTemplateFile(
      upload("fake.png", "image/png", [0x6e, 0x6f, 0x70, 0x65]),
      directory,
    )).rejects.toMatchObject({ code: "invalid-template-image", status: 400 });

    await expect(saveTacticalTemplateFile(
      upload("deck.png", "image/jpeg", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      directory,
    )).rejects.toMatchObject({ code: "template-type-mismatch", status: 400 });
  });

  it("rejects oversized uploads before reading their contents", async () => {
    const oversized: TacticalTemplateUpload = {
      name: "huge.webp",
      type: "image/webp",
      size: MAX_TACTICAL_TEMPLATE_BYTES + 1,
      arrayBuffer: async () => {
        throw new Error("should not read oversized content");
      },
    };

    await expect(saveTacticalTemplateFile(oversized, directory)).rejects.toMatchObject({
      code: "template-too-large",
      status: 413,
    });
  });
});
