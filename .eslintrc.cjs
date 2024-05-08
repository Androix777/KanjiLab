/** @type { import("eslint").Linter.Config } */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stylistic = require("@stylistic/eslint-plugin");

const customized = stylistic.configs.customize({
	indent: "tab",
	quotes: "double",
	semi: true,
	jsx: false,
	braceStyle: "allman",
});

module.exports = {
	root: true,
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/strict",
		"plugin:svelte/recommended",
	],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint", "@stylistic"],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2020,
		extraFileExtensions: [".svelte"],
	},
	env: {
		browser: true,
		es2017: true,
		node: true,
	},
	overrides: [
		{
			files: ["*.svelte"],
			parser: "svelte-eslint-parser",

			extends: [
				"plugin:@typescript-eslint/strict-type-checked",
			],

			parserOptions: {
				parser: "@typescript-eslint/parser",
				project: ["./tsconfig.json"],
			},
		},
		{
			files: ["*.ts", "*.tsx"],

			extends: [
				"plugin:@typescript-eslint/strict-type-checked",
			],

			parserOptions: {
				project: ["./tsconfig.json"],
			},
		},
	],
	rules: {
		...customized.rules,
	},
};
