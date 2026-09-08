/**
 * Proof-of-concept scaffolding for the login screen, in the same category
 * as the demo harness in srs.md Appendix B: it exists so the defence can
 * switch roles in one click and show that FR10's four roles really do see
 * four different products. Nothing here survives the arrival of a real
 * backend, and no requirement depends on it.
 *
 * These mirror the seeded users in `src/mock/seed.ts`. They are restated
 * rather than imported because a screen may never import `src/mock`
 * (CLAUDE.md), and this file is deleted in the same change that deletes
 * the mock layer.
 */

export const DEMO_PASSWORD = 'sentinel'

export interface DemoAccount {
  username: string
  role: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'a.rahman', role: 'Coordinator' },
  { username: 's.iqbal', role: 'Administrator' },
  { username: 'm.tariq', role: 'Drone operator' },
  { username: 'n.hassan', role: 'IT' },
]

/** Seeded deactivated account. A deactivated user cannot authenticate and
 * its audit history remains intact, which is FR10.5's acceptance criterion
 * made demonstrable rather than merely asserted. */
export const DEACTIVATED_ACCOUNT: DemoAccount = { username: 'k.javed', role: 'Coordinator' }
