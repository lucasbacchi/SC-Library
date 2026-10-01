import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import globals from "globals";
import tseslint from "typescript-eslint";

const sharedRules = {
    "linebreak-style": ["error", "unix"],
    "space-in-parens": "off",
    eqeqeq: "off",
    "computed-property-spacing": "off",
    "max-len": ["error", { code: 200 }],
    "lines-around-comment": "off",
    "no-multiple-empty-lines": ["error", { max: 8 }],
    "eol-last": "error",
    "no-loop-func": "off",
    "no-unused-vars": "warn",
    "array-bracket-spacing": "off",
    "no-undef": "warn",
    "no-debugger": "warn",
    semi: "error",
    "no-multi-spaces": "error",
    "no-trailing-spaces": ["warn", { ignoreComments: true }]
};

export default [
    {
        ignores: ["**/build/**", "**/.react-router/**", "**/node_modules/**", "public/**", "functions/**"]
    },
    {
        files: ["**/*.js", "**/*.jsx"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                $: "readonly"
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            ...sharedRules
        }
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ["**/*.ts", "**/*.tsx"]
    })),
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            ...sharedRules,
            "no-undef": "off",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "warn"
        }
    },
    eslintConfigPrettier
];
