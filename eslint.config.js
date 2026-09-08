import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config(
  globalIgnores(['dist', 'dev-dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Only the store layer may talk to SentinelClient. Every other layer
      // (components, hooks, screens) consumes the store, never the client
      // directly, so a real backend swaps in behind src/client without
      // touching a single view.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/client', '@/client/*'],
              message:
                'Only src/store may import src/client. Consume live and config data through the store.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests legitimately construct fakes against the SentinelClient
    // interface directly, without going through the store. `src/mock` is
    // the other side of the same contract: `MockSentinelClient` must
    // implement `SentinelClient`, so it necessarily imports the interface
    // it satisfies - this is the one non-store module allowed to.
    files: ['src/store/**/*.{ts,tsx}', 'src/mock/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
)
