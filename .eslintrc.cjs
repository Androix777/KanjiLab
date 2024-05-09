/** @type { import("eslint").Linter.Config } */

const stylistic = require("@stylistic/eslint-plugin");

const customized = stylistic.configs.customize({
	indent: "tab",
	quotes: "backtick",
	semi: true,
	jsx: false,
	braceStyle: "allman",
});

module.exports = {
	root: true,
	ignorePatterns: [".eslintrc.cjs", "svelte.config.js"],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/strict-type-checked",
		"plugin:svelte/recommended",
	],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint", "@stylistic"],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2020,
		extraFileExtensions: [".svelte"],
		project: ["./tsconfig.json"],
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

			parserOptions: {
				parser: "@typescript-eslint/parser",
			},
		},
	],
	rules: {
		...customized.rules,
	},
};
