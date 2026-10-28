// Flat config: JS + TypeScript recommended everywhere, React hooks rules in the web app.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  // packages/engine/test/fixtures holds a frozen copy of the prototype: never lint or "fix" it.
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "packages/engine/test/fixtures/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["apps/web/public/sw.js"],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    // Smoke scenarios run code inside the page via page.evaluate().
    files: ["scripts/smoke/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
