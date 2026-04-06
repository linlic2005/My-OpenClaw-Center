module.exports = {
  root: true,
  env: {
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-constant-condition': 'off',
  },
  ignorePatterns: [
    'dist/',
    'server/dist/',
    'node_modules/',
    'public/',
    '*.d.ts',
    '*.tsbuildinfo',
  ],
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      env: {
        browser: true,
      },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'off',
        'react-refresh/only-export-components': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['server/**/*.ts'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
  ],
};
