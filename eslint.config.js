import js from "@eslint/js"
import {jsdoc} from "eslint-plugin-jsdoc"
import react from "eslint-plugin-react"
import globals from "globals"
import {defineConfig, globalIgnores} from "eslint/config"

export default defineConfig([
  globalIgnores(["build/**", "dist/**", "node_modules/**", "spec/dummy/**"]),
  {
    files: ["**/*.{js,jsx,mjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.jasmine,
        ...globals.node
      },
      parserOptions: {
        ecmaFeatures: {jsx: true}
      },
      sourceType: "module"
    },
    plugins: {react},
    rules: {
      "comma-dangle": ["error", "never"],
      "object-curly-spacing": ["error", "never"],
      "react/jsx-uses-vars": "error"
    },
    settings: {
      react: {version: "detect"}
    }
  },
  jsdoc({
    config: "flat/recommended",
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "jsdoc/reject-any-type": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns-description": "error"
    }
  })
])
