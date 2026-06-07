import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = "Prompts/avatars/avatar-attribute-slugs.json";

const attributes = [
  {
    key: "gender",
    values: [
      { slug: "male", prompt: "a human male" },
      { slug: "female", prompt: "a human female" },
    ],
  },
  {
    key: "build",
    values: [
      { slug: "slim", prompt: "slim build" },
      { slug: "average", prompt: "average build" },
      { slug: "athletic", prompt: "athletic build" },
      { slug: "heavy", prompt: "heavy build" },
    ],
  },
  {
    key: "clothing",
    values: [
      { slug: "red", prompt: "red clothing" },
      { slug: "green", prompt: "green clothing" },
      { slug: "blue", prompt: "blue clothing" },
      { slug: "yellow", prompt: "yellow clothing" },
      { slug: "orange", prompt: "orange clothing" },
      { slug: "purple", prompt: "purple clothing" },
      { slug: "grey", prompt: "grey clothing" },
      { slug: "black", prompt: "black clothing" },
      { slug: "white", prompt: "white clothing" },
    ],
  },
  {
    key: "hairColor",
    values: [
      { slug: "black-hair", prompt: "black hair" },
      { slug: "brown-hair", prompt: "brown hair" },
      { slug: "blonde-hair", prompt: "blonde hair" },
      { slug: "red-hair", prompt: "red hair" },
      { slug: "gray-hair", prompt: "gray hair" },
    ],
  },
  {
    key: "eyeColor",
    values: [
      { slug: "brown-eyes", prompt: "brown eyes" },
      { slug: "blue-eyes", prompt: "blue eyes" },
      { slug: "green-eyes", prompt: "green eyes" },
      { slug: "hazel-eyes", prompt: "hazel eyes" },
    ],
  },
] as const;

type AttributeGroup = (typeof attributes)[number];
type AttributeKey = AttributeGroup["key"];
type AttributeValue = {
  slug: string;
  prompt: string;
};
type AvatarAttributeCombination = {
  slug: string;
  prompt: string;
  filepath: string;
};

const buildCombinations = (
  groups: readonly { key: AttributeKey; values: readonly AttributeValue[] }[],
): AvatarAttributeCombination[] => {
  const combinations = groups.reduce<
    Array<{
      sliceOrder: string[];
      promptOrder: string[];
    }>
  >(
    (prefixes, group) =>
      prefixes.flatMap((prefix) =>
        group.values.map((value) => ({
          sliceOrder: [...prefix.sliceOrder, value.slug],
          promptOrder: [...prefix.promptOrder, value.prompt],
        })),
      ),
    [{ sliceOrder: [], promptOrder: [] }],
  );

  return combinations.map((combination) => ({
    slug: combination.sliceOrder.join("-"),
    prompt: combination.promptOrder.join(", "),
    filepath: combination.sliceOrder.join("/"),
  }));
};

const main = async () => {
  const outputPath = path.resolve(
    process.cwd(),
    process.argv[2] ?? OUTPUT_PATH,
  );
  const items = buildCombinations(attributes);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");

  console.log(`Generated ${items.length} avatar attribute entries`);
  console.log(outputPath);
};

void main();
