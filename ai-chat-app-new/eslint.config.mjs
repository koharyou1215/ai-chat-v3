import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 🔧 型安全性ルール（段階的に厳格化）
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",  // ✅ 有効化（警告レベル）

      // React関連
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react/display-name": "off",

      // コード品質
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "warn",
      "@next/next/no-assign-module-variable": "off",
    },
  },
  // 🧪 テストファイル用の緩和ルール
  {
    files: ["**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",  // テストでany型を許可
      "@typescript-eslint/no-unused-vars": "off",   // テストで未使用変数を許可
    },
  },
];

export default eslintConfig;
