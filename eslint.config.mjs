import { configs as airbnb } from 'eslint-config-airbnb-extended/legacy';
import prettier from 'eslint-config-prettier/flat';

// Flat-config port of the former .eslintrc.cjs. The `legacy` configs of
// eslint-config-airbnb-extended reproduce the archived `airbnb`, `airbnb/hooks` and
// `airbnb-typescript` presets rule for rule, which neither supports ESLint 9.
export default [
  { ignores: ['dist/', 'node_modules/', '**/*.cjs'] },
  ...airbnb.react.recommended,
  ...airbnb.react.hooks,
  ...airbnb.react.typescript,
  prettier,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      // The airbnb TypeScript config turns on typescript-eslint's projectService, which finds
      // tsconfig.json by itself; `project` alongside it is an error.
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
      },
    },
    rules: {
      // ESM imports include .js extensions — allow them
      'import/extensions': ['error', 'ignorePackages', {
        js: 'always',
        ts: 'never',
        tsx: 'never',
      }],

      // Named exports preferred (already in CLAUDE.md convention)
      'import/prefer-default-export': 'off',

      // Allow process.exit in CLI tool
      'no-process-exit': 'off',

      // Console/stdout writes are intentional in a CLI tool
      'no-console': 'off',

      // Ink components don't need display names
      'react/display-name': 'off',

      // TSX files use React in scope via tsconfig jsx setting
      'react/react-in-jsx-scope': 'off',

      // Prop types handled by TypeScript
      'react/prop-types': 'off',

      // Default props handled by TypeScript default parameters
      'react/require-default-props': 'off',

      // Allow _prefixed unused parameters (common in interface implementations)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        // typescript-eslint 8 checks catch bindings too; keep `catch (_e)` allowed as before.
        caughtErrorsIgnorePattern: '^_',
      }],

      // Allow for...of in Node.js (not targeting browser bundle size)
      'no-restricted-syntax': [
        'error',
        { selector: 'LabeledStatement', message: 'Labels are bad.' },
        { selector: 'WithStatement', message: '`with` is disallowed.' },
      ],

      // continue is fine in data-processing loops in a CLI tool
      'no-continue': 'off',

      // ++ is fine in for-loop increments
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],

      // await-in-loop is intentional for sequential file access checks
      'no-await-in-loop': 'off',

      // Inline callbacks are acceptable in Ink TUI components
      'react/jsx-no-bind': 'off',

      // void is used to intentionally discard promises
      'no-void': 'off',
    },
  },
];
