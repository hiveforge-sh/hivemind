import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["main.ts"],
  plugins: {
    obsidianmd,
    "@typescript-eslint": tseslint.plugin,
  },
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      project: "./tsconfig.json",
      sourceType: "module",
    },
  },
  rules: {
    ...obsidianmd.configs.recommended,
    "obsidianmd/ui/sentence-case": ["error", {
      acronyms: ["MCP", "API", "ID", "JSON", "YAML", "URL"],
      brands: ["ComfyUI", "Hivemind", "Obsidian", "Node.js"],
    }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "no-console": ["error", { allow: ["error", "debug", "warn"] }],
  },
});
