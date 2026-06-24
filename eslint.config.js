import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // The viem read pattern (`result as bigint`) and wallet-error handling
      // (`err: any`) are deliberate idioms in this SDK; warn rather than error.
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow intentionally-unused args when prefixed with `_`.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["tests/**/*.ts", "src/**/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Test fixtures assert against escaped JSON/GraphQL strings.
      "no-useless-escape": "off",
    },
  },
);
