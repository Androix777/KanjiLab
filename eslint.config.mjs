import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import parser from "svelte-eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
});

export default [{
	ignores: [
		"kanji_lab_loader",
		"**/.DS_Store",
		"**/node_modules",
		"build",
		"src-tauri",
		".svelte-kit",
		"package",
		"**/.env",
		"**/.env.*",
		"!**/.env.example",
		"**/eslint.config.mjs",
		"**/svelte.config.js",
		"**/tailwind.config.cjs",
		"**/postcss.config.js",
		"**/pnpm-lock.yaml",
		"**/package-lock.json",
		"**/yarn.lock",
	],
}, ...compat.extends(
	"eslint:recommended",
	"plugin:@typescript-eslint/strict-type-checked",
	"plugin:svelte/recommended",
), {
	plugins: {
		"@typescript-eslint": typescriptEslint,
	},

	languageOptions: {
		globals: {
			...globals.browser,
			...globals.node,
		},

		parser: tsParser,
		ecmaVersion: 2020,
		sourceType: "module",

		parserOptions: {
			extraFileExtensions: [".svelte"],
			project: ["./tsconfig.json"],
		},
	},

	rules: {
		"@typescript-eslint/restrict-template-expressions": "off",
		"@typescript-eslint/no-unused-expressions": "off",
		"svelte/no-at-html-tags": "off",
		"no-irregular-whitespace": "off",
		"@typescript-eslint/no-misused-promises": ["error", {
			checksVoidReturn: false,
		}],
	},
}, {
	files: ["**/*.svelte"],

	languageOptions: {
		parser: parser,
		ecmaVersion: 5,
		sourceType: "script",

		parserOptions: {
			parser: "@typescript-eslint/parser",
		},
	},
}];