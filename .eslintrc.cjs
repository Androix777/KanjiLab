/** @type { import("eslint").Linter.Config } */
module.exports = {
	root: true,
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/strict",
		"plugin:svelte/recommended",
	],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint", "@stylistic/ts", "@stylistic/js"],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2020,
		extraFileExtensions: [".svelte"]
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	overrides: [
		{
			files: ["*.svelte"],
			parser: "svelte-eslint-parser",

			extends: [
				"plugin:@typescript-eslint/strict-type-checked"
			],

			parserOptions: {
				parser: "@typescript-eslint/parser",
				project: ["./tsconfig.json"],
			}
		},
		{
			files: ["*.ts", "*.tsx"], 

			extends: [
				"plugin:@typescript-eslint/strict-type-checked"
			],

			parserOptions: {
				project: ["./tsconfig.json"],
			},
		}
	],
	rules: {
		"@stylistic/ts/brace-style": ["warn", "allman", { allowSingleLine: true }],
		"@stylistic/ts/indent": ["warn", "tab"],
		"@stylistic/ts/semi": ["warn"],
		"@stylistic/js/array-bracket-spacing": ["warn"],
		"@stylistic/js/quotes": ["warn", "double"],
	}
};
