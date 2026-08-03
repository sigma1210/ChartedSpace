import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const filesBelow = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return entry.name === "__tests__" ? [] : filesBelow(path);
  return /\.[jt]sx?$/.test(entry.name) ? [path] : [];
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
});
