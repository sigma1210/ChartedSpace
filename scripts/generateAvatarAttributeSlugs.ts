import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = "Prompts/avatars/avatar-attribute-slugs.txt";

const attributes = [
  {
    key: "gender",
    values: ["a human male", "a human female"],
  },
  {
    key: "build",
    values: ["slim build", "average build", "athletic build", "heavy build"],
  },
  {
    key: "clothing",
    values: [
      "red clothing",
      "green clothing",
      "blue clothing",
      "yellow clothing",
      "orange clothing",
      "purple clothing",
      "grey clothing",
      "black clothing",
      "white clothing",
    ],
  },
  {
    key: "hairColor",
    values: [
      "black hair",
      "brown hair",
      "blonde hair",
      "red hair",
      "gray hair",
    ],
  },
  {
    key: "eyeColor",
    values: ["brown eyes", "blue eyes", "green eyes", "hazel eyes"],
  },
] as const;

const buildCombinations = (
  groups: readonly { key: string; values: readonly string[] }[],
): string[] => {
  return groups.reduce<string[]>(
    (prefixes, group) =>
      prefixes.flatMap((prefix) =>
        group.values.map((value) => (prefix ? `${prefix}, ${value}` : value)),
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
