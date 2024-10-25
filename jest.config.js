/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  setupFiles: ['jest-date-mock'],
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/apps/web/.next/',
    '/apps/web/out/',
  ],
  watchPathIgnorePatterns: [
    '\\.gen\\.d\\.ts',
    '\\.gen\\.ts',
    '\\.gen\\.json',
    '\\.schema\\.json',
  ],
  testRegex: '\\.(spec|test)\\.[jt]sx?$',
  transform: {
    '^.+\\.(js|ts|tsx)$': [
      'esbuild-jest',
      {
        sourcemap: true,
        target: 'node14',
        format: 'cjs',
      },
    ],
  },
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
}
