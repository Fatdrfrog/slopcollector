import pluginQuery from '@tanstack/eslint-plugin-query';
import * as pluginImport from 'eslint-plugin-import';
import nextConfig from 'eslint-config-next/core-web-vitals.js';

export default [
  ...nextConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@tanstack/query': pluginQuery,
      'import': pluginImport,
    },
    rules: {
      // React Query best practices
      '@tanstack/query/exhaustive-deps': 'error',
      '@tanstack/query/no-rest-destructuring': 'warn',
      '@tanstack/query/stable-query-client': 'error',

      // Import organization
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
