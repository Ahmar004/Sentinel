import type { SentinelClient } from '@/client/SentinelClient'

/**
 * One provider at the application root selects which SentinelClient
 * implementation is in use - srs.md 3.5. No component knows which it
 * received; only the store layer is allowed to hold a reference at all
 * (enforced by the ESLint rule restricting `@/client` imports to
 * `src/store`), and it reaches the client through this registry rather
 * than each slice importing a concrete implementation itself.
 */
let client: SentinelClient | null = null

export function setSentinelClient(next: SentinelClient): void {
  client = next
}

export function getSentinelClient(): SentinelClient {
  if (!client) {
    throw new Error(
      'No SentinelClient has been registered. Call setSentinelClient() at the application root before using the store.',
    )
  }
  return client
}

/** Test-only escape hatch: clears the registered client between tests. */
export function resetSentinelClientForTests(): void {
  client = null
}
