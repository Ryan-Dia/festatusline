/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
    'import/resolver': {
      node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
    },
  },
  extends: [
    'airbnb',
    'airbnb/hooks',
    'airbnb-typescript',
    'prettier',
  ],
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
  ignorePatterns: ['dist/', 'node_modules/', '*.cjs'],
};
