// =====================================================================
// ESLINT · СТРОГИЙ КОНФИГ
// =====================================================================
// Философия: всё, что включено, — error. Warning'и игнорируют и люди,
// и агенты, поэтому их здесь нет (см. strict() ниже).
//
// Сверх общих правил здесь закодированы правила проекта
// (см. CLAUDE.md и docs/ARCHITECTURE.md): чистота doc/*, токены в
// inline-стилях, строки только через t(), доступ к storage только в state/.

import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unicorn from "eslint-plugin-unicorn";

// Переводит все "warn" из готовых пресетов в "error".
function strict(config) {
	const rules = Object.fromEntries(
		Object.entries(config.rules ?? {}).map(([name, value]) => {
			if (value === "warn" || value === 1) {return [name, "error"];}
			if (Array.isArray(value) && (value[0] === "warn" || value[0] === 1)) {
				return [name, ["error", ...value.slice(1)]];
			}
			return [name, value];
		}),
	);
	return { ...config, rules };
}

// Сырые значения в style={{}}: числа (= px), "12px", hex, rgb().
// Значения должны идти через var(--token), см. docs/TOKENS.md.
const RAW_STYLE_VALUE = [
	"JSXAttribute[name.name='style'] Property > Literal[raw=/^-?[1-9]/]",
	String.raw`JSXAttribute[name.name='style'] Property > Literal[value=/\d(px|rem|em)\b|#[0-9a-f]{3,8}\b|rgba?\(/i]`,
].join(", ");

// Кириллица в строках = непереведённый текст. Ловит то, что пропускает
// react/jsx-no-literals: пропсы (aria-label, placeholder), тернарники, тосты в .js.
const CYRILLIC_LITERAL = "Literal[value=/[а-яё]/i]:not([regex]), TemplateElement[value.raw=/[а-яё]/i]";

const RESTRICTED_SYNTAX = [
	{ selector: RAW_STYLE_VALUE, message: "Raw value in style={{}}: use var(--token) from src/styles/tokens.css." },
	{ selector: CYRILLIC_LITERAL, message: "Hardcoded UI text: add a key to src/i18n/dict.js and use t()." },
];

export default [
	{ ignores: ["dist/**", "node_modules/**", "coverage/**"] },

	js.configs.recommended,
	strict(react.configs.flat.recommended),
	strict(react.configs.flat["jsx-runtime"]),
	strict(reactHooks.configs.flat.recommended),
	strict(jsxA11y.flatConfigs.strict),
	strict(unicorn.configs.recommended),

	{
		files: ["**/*.{js,jsx}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: { ...globals.browser },
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		settings: { react: { version: "detect" } },
		linterOptions: { reportUnusedDisableDirectives: "error" },
		rules: {
			// ---- correctness ----
			"array-callback-return": "error",
			"consistent-return": "error",
			"default-case-last": "error",
			eqeqeq: ["error", "always"],
			"no-await-in-loop": "error",
			"no-constructor-return": "error",
			"no-promise-executor-return": "error",
			"no-self-compare": "error",
			"no-template-curly-in-string": "error",
			"no-unmodified-loop-condition": "error",
			"no-unreachable-loop": "error",
			"no-use-before-define": ["error", { functions: false }],
			"require-atomic-updates": "error",
			"no-unused-vars": ["error", { args: "after-used", caughtErrors: "all", ignoreRestSiblings: false }],

			// ---- safety ----
			"no-alert": "error",
			"no-console": ["error", { allow: ["warn", "error"] }],
			"no-eval": "error",
			"no-implied-eval": "error",
			"no-new-func": "error",
			"no-param-reassign": ["error", { props: true }],
			"no-return-assign": ["error", "always"],
			"no-script-url": "error",
			"no-throw-literal": "error",
			"prefer-promise-reject-errors": "error",
			radix: "error",

			// ---- clarity ----
			curly: ["error", "all"],
			"dot-notation": "error",
			"no-else-return": ["error", { allowElseIf: false }],
			"no-implicit-coercion": "error",
			"no-lonely-if": "error",
			"no-shadow": ["error", { builtinGlobals: false, hoist: "all" }],
			"no-unneeded-ternary": "error",
			"no-useless-concat": "error",
			"no-useless-return": "error",
			"no-var": "error",
			"object-shorthand": "error",
			"prefer-arrow-callback": ["error", { allowNamedFunctions: true }], // forwardRef(function Name…) — имя видно в DevTools
			"prefer-const": "error",
			"prefer-template": "error",
			yoda: "error",

			// ---- size limits (агенту и человеку проще читать маленькие функции) ----
			complexity: ["error", 12],
			"max-depth": ["error", 3],
			"max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
			"max-nested-callbacks": ["error", 3],
			"max-params": ["error", 4],

			// ---- react ----
			"react/prop-types": "off", // нет TypeScript/PropTypes в проекте; заменит JSDoc позже
			"react/button-has-type": "error",
			"react/hook-use-state": "error",
			"react/jsx-boolean-value": ["error", "never"],
			"react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],
			"react/jsx-fragments": ["error", "syntax"],
			"react/jsx-key": ["error", { checkFragmentShorthand: true, warnOnDuplicates: true }],
			"react/jsx-no-constructed-context-values": "error",
			"react/jsx-no-leaked-render": "error",
			"react/jsx-no-script-url": "error",
			"react/jsx-no-useless-fragment": "error",
			"react/jsx-pascal-case": "error",
			"react/no-array-index-key": "error",
			"react/no-danger": "error",
			"react/no-unstable-nested-components": "error",
			"react/self-closing-comp": "error",
			"react/void-dom-elements-no-children": "error",

			// Проектное правило: весь текст — через t(). Разрешены только знаки-разделители.
			"react/jsx-no-literals": [
				"error",
				{ noStrings: true, ignoreProps: true, allowedStrings: [
					// знаки-разделители
					"·", "—", "«", "»", "/", "×", "+", "−", "#", ":",
					// иконки-глифы (у кнопки с глифом должен быть aria-label через t())
					"✕", "↑", "↓", "‹", "›", "●", "•", "↗", "”", "🖨",
				],
			},
			],

			// Проектное правило: в inline-стилях только токены.
			"no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX],

			// Проектное правило: хранилища браузера — только в state/ (и настройки UI: локаль в I18nProvider, тема и шрифт в utils/appearance.js).
			"no-restricted-globals": [
				"error",
				{ name: "localStorage", message: "Only src/state/storage.js may touch localStorage." },
				{ name: "indexedDB", message: "Only src/state/idb.js may touch IndexedDB." },
			],

			// ---- unicorn: что не подходит проекту ----
			"unicorn/no-null": "off", // null — обычное «пусто» в React и в модели данных
			"unicorn/filename-case": ["error", { cases: { camelCase: true, pascalCase: true } }],
			"unicorn/prevent-abbreviations": [
				"error",
				{
					allowList: { t: true, tn: true, props: true, ref: true, Ref: true, ctx: true },
					ignore: [/^Doc/], // Doc* — имена секций документа, не сокращение
				},
			],
		},
	},

	// state/, I18nProvider и appearance.js владеют хранилищами браузера
	{
		files: ["src/state/storage.js", "src/state/idb.js", "src/i18n/I18nProvider.jsx", "src/utils/appearance.js"],
		rules: { "no-restricted-globals": "off" },
	},

	// словарь — единственное место для текста
	{
		files: ["src/i18n/dict.js"],
		rules: { "no-restricted-syntax": ["error", RESTRICTED_SYNTAX[0]] },
	},

	// doc/* — чистая функция от project: рендерится в preview, export и print
	{
		files: ["src/doc/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{ group: ["**/state/*", "**/editor/*"], message: "doc/* must stay pure: render only from the project prop." },
						{ group: ["**/utils/toast*", "**/utils/export*", "**/utils/use*"], message: "doc/* must not have side effects." },
					],
				},
			],
		},
	},

	// components/* — UI-кит без знания о проекте
	{
		files: ["src/components/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{ patterns: [{ group: ["**/state/*", "**/editor/*", "**/doc/*"], message: "components/* is a UI kit: pass data in through props." }] },
			],
		},
	},

	// Node-скрипты и конфиги
	{
		files: ["*.config.js", "scripts/**"],
		languageOptions: { globals: { ...globals.node } },
		rules: { "no-console": "off", "no-restricted-syntax": "off" }, // правила про UI-текст и стили — только для src/
	},

	// Тесты (Vitest в браузере): они намеренно лезут туда, куда коду приложения нельзя
	{
		files: ["tests/**"],
		rules: {
			"no-restricted-globals": "off", // готовят localStorage/IndexedDB старых версий
			"no-restricted-syntax": "off", // ожидаемые строки на русском — данные теста, не UI
			"no-param-reassign": "off", // patch() подменяет методы браузерных прототипов
			"unicorn/no-this-outside-of-class": "off", // подмены IDBObjectStore.prototype.* используют this
			"unicorn/no-await-expression-member": "off", // (await dumpDB()).blobs читается проще в проверках
			"unicorn/consistent-function-scoping": "off", // помощники рядом с тестами, которые их используют
			"unicorn/no-useless-undefined": "off", // undefined здесь — проверяемое значение
			"require-atomic-updates": "off", // возврат подмены прототипа после await — так и задумано
			"max-lines": "off",
		},
	},
];
