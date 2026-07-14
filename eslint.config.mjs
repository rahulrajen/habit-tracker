import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import plugin from '@typescript-eslint/eslint-plugin';
import boundary from 'eslint-plugin-boundaries';

export default [
  { ignores: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        browser: true,
        node: true,
        require: true,
        module: true,
        __dirname: true,
        __filename: true,
        process: true,
        console: true,
        fetch: true,
        FormData: true,
        Headers: true,
        Request: true,
        Response: true,
        RequestInit: true,
        URL: true,
        URLSearchParams: true,
        // Browser globals
        localStorage: true,
        sessionStorage: true,
        document: true,
        window: true,
        navigator: true,
        requestAnimationFrame: true,
        setTimeout: true,
        setInterval: true,
        clearTimeout: true,
        clearInterval: true,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser,
    },
    plugins: {
      '@typescript-eslint': plugin,
      boundaries: boundary,
    },
    rules: {
      ...plugin.configs.recommended.rules,
      'no-console': ['warn', { allow: ['console.warn', 'console.error'] }],
    },
  },
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    languageOptions: {
      globals: {
        describe: true,
        it: true,
        test: true,
        beforeEach: true,
        beforeAll: true,
        afterAll: true,
        expect: true,
        vi: true,
        vitest: true,
        React: true,
      },
    },
  },
  {
    plugins: {
      boundaries: boundary,
    },
    rules: {
      'boundaries/element-types': 'error',
    },
    settings: {
      'boundaries/elements': [
        { name: '@core', match: 'src/core/**' },
        { name: '@modules/profiles', match: 'src/modules/profiles/**' },
        { name: '@modules/habits', match: 'src/modules/habits/**' },
      ],
    },
  },
];