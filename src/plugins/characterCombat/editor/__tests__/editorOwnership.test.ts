import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const sourceFilePattern = /\.[jt]sx?$/;

const filesBelow = (
  directory: string,
  options: { includeTests?: boolean } = {},
): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) {
    return entry.name === "__tests__" && !options.includeTests
      ? []
      : filesBelow(path, options);
  }
  return sourceFilePattern.test(entry.name) ? [path] : [];
});

describe("Character Combat tactical ownership", () => {
  it("does not import production code from the Next app layer", () => {
    const pluginDirectory = resolve(__dirname, "../..");
    const appImports = filesBelow(pluginDirectory).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return /(?:from|import\()\s*["']@\/app\//.test(source)
        ? [relative(pluginDirectory, path)]
        : [];
    });

    expect(appImports).toEqual([]);
  });

  it("keeps only routable pages in app/system/tactical", () => {
    const routeDirectory = resolve(process.cwd(), "src/app/system/tactical");
    expect(filesBelow(routeDirectory).map((path) => relative(routeDirectory, path)).sort()).toEqual([
      "editor/page.tsx",
      "page.tsx",
    ]);
  });

  it("keeps editor production code out of the editor root", () => {
    const editorDirectory = resolve(__dirname, "..");
    const rootProductionFiles = readdirSync(editorDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && sourceFilePattern.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    expect(rootProductionFiles).toEqual([]);
  });

  it("organizes editor production code into the approved folders", () => {
    const editorDirectory = resolve(__dirname, "..");
    const productionFolders = [...new Set(filesBelow(editorDirectory).map(
      (path) => relative(editorDirectory, path).split("/")[0],
    ))].sort();

    expect(productionFolders).toEqual(["components", "hooks", "lib", "redux"]);
  });

  it("does not import the retired editor state path", () => {
    const sourceDirectory = resolve(process.cwd(), "src");
    const editorDirectory = resolve(__dirname, "..");
    const retiredAbsoluteImportPattern = /(?:from\s+|import\s+|import\(\s*|require\(\s*|jest\.(?:mock|requireActual)\(\s*)["'][^"']*characterCombat\/editor\/state(?:\/[^"']*)?["']/;
    const retiredAbsoluteImports = filesBelow(sourceDirectory, { includeTests: true }).flatMap((path) => (
      retiredAbsoluteImportPattern.test(readFileSync(path, "utf8"))
        ? [relative(sourceDirectory, path)]
        : []
    ));
    const retiredRelativeImports = filesBelow(editorDirectory, { includeTests: true }).flatMap((path) => (
      /["'](?:\.\.\/)+state(?:\/[^"']*)?["']/.test(readFileSync(path, "utf8"))
        ? [relative(editorDirectory, path)]
        : []
    ));

    expect({ retiredAbsoluteImports, retiredRelativeImports }).toEqual({
      retiredAbsoluteImports: [],
      retiredRelativeImports: [],
    });
  });
});
