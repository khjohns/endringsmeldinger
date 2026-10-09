import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
  {
    // Frittstående node-verktøy, ikke del av appbundelen.
    files: ['scripts/**/*.{js,cjs,mjs}', 'src/contrast-check.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    files: ['src/lib/domain/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Kjernen (B-14): norske navn etter «Språk» i AGENTS.md, og ae/oe/aa for æ/ø/å.
    // Egenskaper er data over grensen (snake_case) og navn utenfra, så de sjekkes
    // ikke for format, men heller ikke de kan ha æ, ø eller å.
    files: ['kjerne/**/*.ts'],
    rules: {
      'id-match': [
        'error',
        '^[A-Za-z0-9_$]*$',
        {
          properties: true,
          classFields: true,
          onlyDeclarations: false,
          ignoreDestructuring: false,
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: ['property', 'method', 'accessor', 'enumMember'], format: null },
      ],
    },
  },
  {
    ignores: ['build/', '.svelte-kit/', 'dist/', '.worktrees/', '**/venv/', '**/.venv/'],
  }
);
