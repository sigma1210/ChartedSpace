import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = "Prompts/avatars/avatar-attribute-slugs.txt";

const attributes = [
  {
    key: "gender",
    values: ["male", "female"],
  },
  {
    key: "build",
    values: ["slim", "average", "athletic", "heavy"],
  },
  {
    key: "clothing",
    values: ["civilian", "scout", "naval", "marine", "merchant"],
  },
  {
    key: "hairColor",
    values: ["black", "brown", "blonde", "red", "gray"],
  },
  {
    key: "eyeColor",
    values: ["brown", "blue", "green", "hazel"],
  },
] as const;

const buildCombinations = (
  groups: readonly { key: string; values: readonly string[] }[],
): string[] => {
  return groups.reduce<string[]>(
    (prefixes, group) =>
      prefixes.flatMap((prefix) =>
        group.values.map((value) => (prefix ? `${prefix} ${value}` : value)),
      ),
    [""],
  );
};

const main = async () => {
  const outputPath = path.resolve(
    process.cwd(),
    process.argv[2] ?? OUTPUT_PATH,
  );
  const slugs = buildCombinations(attributes);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${slugs.join("\r\n")}\r\n`, "utf8");

  console.log(`Generated ${slugs.length} avatar attribute slugs`);
  console.log(outputPath);
};

void main();
