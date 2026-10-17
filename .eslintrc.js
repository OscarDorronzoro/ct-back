const TEST_FILES = ['**/*.test.js', '**/*.test.ts', 'src/shared/testing/**', 'vitest.config.mts'];

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  settings: {
    // Resolve imports of .js and .ts files (extensionless, as Babel does)
    'import/resolver': {
      typescript: true,
      node: { extensions: ['.js', '.ts'] },
    },
  },
  rules: { // 0:off, 1:warning, 2:error
    'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'never' }],
    'import/no-extraneous-dependencies': ['error', { devDependencies: TEST_FILES }],
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.mts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        // Replaced by their TypeScript-aware versions
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error'],
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': ['error'],
        'no-use-before-define': 'off',
        '@typescript-eslint/no-use-before-define': ['error'],
      },
    },
  ],
};
