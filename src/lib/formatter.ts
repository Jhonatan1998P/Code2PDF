import type { BuiltInParserName, Plugin } from "prettier";

type PrettierModule = typeof import("prettier/standalone");

interface PrettierBundle {
  prettier: PrettierModule;
  plugins: Plugin[];
}

let prettierBundlePromise: Promise<PrettierBundle> | null = null;

function getParserFromExtension(extension: string): BuiltInParserName | null {
  const normalized = extension.toLowerCase();

  if (normalized === "js" || normalized === "jsx") {
    return "babel";
  }
  if (normalized === "ts" || normalized === "tsx") {
    return "typescript";
  }
  if (normalized === "json") {
    return "json";
  }
  if (normalized === "css") {
    return "css";
  }
  if (normalized === "html") {
    return "html";
  }
  if (normalized === "md" || normalized === "markdown") {
    return "markdown";
  }

  return null;
}

async function loadPrettierBundle(): Promise<PrettierBundle> {
  if (!prettierBundlePromise) {
    prettierBundlePromise = (async () => {
      const [prettier, pluginBabel, pluginEstree, pluginTypeScript, pluginPostCss, pluginHtml, pluginMarkdown] = await Promise.all([
        import("prettier/standalone"),
        import("prettier/plugins/babel"),
        import("prettier/plugins/estree"),
        import("prettier/plugins/typescript"),
        import("prettier/plugins/postcss"),
        import("prettier/plugins/html"),
        import("prettier/plugins/markdown"),
      ]);

      return {
        prettier,
        plugins: [
          pluginBabel.default,
          pluginEstree.default,
          pluginTypeScript.default,
          pluginPostCss.default,
          pluginHtml.default,
          pluginMarkdown.default,
        ],
      };
    })();
  }

  return prettierBundlePromise;
}

function normalizeUnknownContent(content: string): string {
  const normalizedLines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\t/g, "  ").replace(/[ \t]+$/g, ""));

  return normalizedLines.join("\n");
}

export async function formatContentByExtension(content: string, extension: string): Promise<string> {
  const parser = getParserFromExtension(extension);
  if (!parser) {
    return normalizeUnknownContent(content);
  }

  const { prettier, plugins } = await loadPrettierBundle();

  try {
    return await prettier.format(content, {
      parser,
      plugins,
      tabWidth: 2,
      useTabs: false,
      printWidth: 100,
      trailingComma: "all",
      proseWrap: "preserve",
    });
  } catch {
    return normalizeUnknownContent(content);
  }
}
