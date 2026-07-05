import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assignAvatarFromPool } from "../avatarPool";

const writeManifest = (items: unknown[]) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "charted-avatar-pool-"));
  const manifestPath = path.join(dir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ items }), "utf8");
  return manifestPath;
};

describe("avatar pool assignment", () => {
  it("assigns a stable portrait object from the best matching pool entry", () => {
    const manifestPath = writeManifest([
      {
        id: "male-average-blue-brown-brown-v1",
        path: "/generated/avatars/pool/male/male-average-blue-brown-brown-v1.png",
        slugValues: {
          gender: "male",
          build: "average",
          clothing: "blue",
          hairColor: "brown",
          eyeColor: "brown",
        },
        promptSlug: "male, average build, blue clothing, brown hair, brown eyes",
        variant: 1,
        createdAt: "2026-07-05T00:00:00.000Z",
      },
      {
        id: "female-average-blue-brown-brown-v1",
        path: "/generated/avatars/pool/female/female-average-blue-brown-brown-v1.png",
        slugValues: {
          gender: "female",
          build: "average",
          clothing: "blue",
          hairColor: "brown",
          eyeColor: "brown",
        },
        promptSlug: "female, average build, blue clothing, brown hair, brown eyes",
        variant: 1,
      },
    ]);

    const avatar = assignAvatarFromPool({
      manifestPath,
      age: 34,
      slugValues: {
        gender: "male",
        build: "average",
        clothing: "blue",
        hairColor: "brown",
        eyeColor: "brown",
      },
      promptSlug: "male, average build, blue clothing, brown hair, brown eyes",
    });

    expect(avatar).toMatchObject({
      currentPortraitPath: "/generated/avatars/pool/male/male-average-blue-brown-brown-v1.png",
      images: [
        {
          id: "male-average-blue-brown-brown-v1",
          type: "portrait",
          version: 1,
          age: 34,
        },
      ],
    });
  });

  it("returns null when the generated manifest is unavailable", () => {
    expect(assignAvatarFromPool({
      manifestPath: path.join(os.tmpdir(), "missing-avatar-pool-manifest.json"),
      slugValues: { gender: "female" },
      promptSlug: "female",
    })).toBeNull();
  });
});
