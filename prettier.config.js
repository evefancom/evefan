/**
 * @type {import('prettier').Config}
 */
module.exports = {
  arrowParens: 'always',
  bracketSameLine: true,
  bracketSpacing: false,
  importOrder: [
    '^node:(.+)$',
    '<THIRD_PARTY_MODULES>',
    '^@openint/(.+)$',
    '^@/(.+)$',
    '^[./]',
  ],
  jsxSingleQuote: false,
  plugins: [
    // This plugin breaks on makeSyncEngine.ts... So commenting out for now.
    require.resolve('@ianvs/prettier-plugin-sort-imports'),
    require.resolve('prettier-plugin-packagejson'),
    require.resolve('prettier-plugin-tailwindcss'), // needs to come last
  ],
  printWidth: 80,
  quoteProps: 'as-needed',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  tailwindConfig: './apps/web/tailwind.config.ts',
  trailingComma: 'all',
  useTabs: false,
}
