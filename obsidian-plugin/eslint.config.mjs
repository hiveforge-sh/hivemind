import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    files: ["main.ts"],
    plugins: {
      obsidianmd,
      "@typescript-eslint": tseslint,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    rules: {
      ...obsidianmd.configs.recommended,
      "obsidianmd/ui/sentence-case": ["error", {
        enforceCamelCaseLower: false,
        acronyms: ["MCP", "API", "ID", "JSON", "YAML", "URL"],
        brands: ["ComfyUI", "Hivemind", "Obsidian", "Node.js"],
        ignoreWords: ["frontmatter", "npx"],
        ignoreRegex: ["^@\\w+/", "^my-"],
      }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "no-console": ["error", { allow: ["error", "debug", "warn"] }],
    },
  },
];
