import { describe, expect, it } from 'vitest'
import { ROLE } from '@/domain/constants'
import {
  CAPABILITY,
  PERMISSION_MATRIX,
  hasCapability,
  navEntriesForRole,
  landingRouteForRole,
} from './permissions'

describe('PERMISSION_MATRIX', () => {
  it('matches srs.md 2.4 for the Administrator - every capability', () => {
    for (const capability of Object.values(CAPABILITY)) {
      expect(hasCapability(ROLE.ADMINISTRATOR, capability)).toBe(true)
    }
  })

  it('matches srs.md 2.4 for IT - only roles reference, health and audit log', () => {
    const granted = Object.values(CAPABILITY).filter((c) => hasCapability(ROLE.IT, c))
    expect(new Set(granted)).toEqual(
      new Set([CAPABILITY.VIEW_ROLES_REFERENCE, CAPABILITY.VIEW_SYSTEM_HEALTH, CAPABILITY.VIEW_AUDIT_LOG]),
    )
  })

  it('gives the Drone Operator alerts and acknowledgement but not suggestions (decision D19)', () => {
    expect(hasCapability(ROLE.DRONE_OPERATOR, CAPABILITY.VIEW_ALERTS_AND_ATTRIBUTION)).toBe(true)
    expect(hasCapability(ROLE.DRONE_OPERATOR, CAPABILITY.ACKNOWLEDGE_ALERT)).toBe(true)
    expect(hasCapability(ROLE.DRONE_OPERATOR, CAPABILITY.VIEW_SUGGESTIONS)).toBe(false)
    expect(hasCapability(ROLE.DRONE_OPERATOR, CAPABILITY.CONFIRM_OR_DISMISS_SUGGESTION)).toBe(false)
  })

  it('withholds venue setup and threshold editing from the Coordinator', () => {
    expect(hasCapability(ROLE.COORDINATOR, CAPABILITY.VENUE_SETUP)).toBe(false)
    expect(hasCapability(ROLE.COORDINATOR, CAPABILITY.EDIT_THRESHOLDS)).toBe(false)
  })

  it('has an entry for every role, for every capability', () => {
    for (const capability of Object.values(CAPABILITY)) {
      expect(Object.keys(PERMISSION_MATRIX[capability]).sort()).toEqual(Object.values(ROLE).sort())
    }
  })
})

describe('navEntriesForRole', () => {
  it('never returns a nav entry the role lacks the capability for', () => {
    for (const role of Object.values(ROLE)) {
      for (const entry of navEntriesForRole(role)) {
        expect(hasCapability(role, entry.capability)).toBe(true)
      }
    }
  })

  it('gives IT only health, roles reference and audit - nothing operational', () => {
    const routes = navEntriesForRole(ROLE.IT).map((e) => e.route).sort()
    expect(routes).toEqual(['/audit', '/health', '/roles'])
  })

  it('gives the Coordinator and Administrator the suggestions and analytics entries', () => {
    for (const role of [ROLE.COORDINATOR, ROLE.ADMINISTRATOR]) {
      const routes = navEntriesForRole(role).map((e) => e.route)
      expect(routes).toContain('/suggestions')
      expect(routes).toContain('/analytics')
    }
  })

  it('never gives the Drone Operator suggestions, history, replay or analytics', () => {
    const routes = navEntriesForRole(ROLE.DRONE_OPERATOR).map((e) => e.route)
    for (const forbidden of ['/suggestions', '/analytics', '/history', '/replay', '/timeline']) {
      expect(routes).not.toContain(forbidden)
    }
  })
})

describe('landingRouteForRole', () => {
  it('sends Coordinator and Administrator to /live, Drone Operator to /fleet, IT to /health', () => {
    expect(landingRouteForRole(ROLE.COORDINATOR)).toBe('/live')
    expect(landingRouteForRole(ROLE.ADMINISTRATOR)).toBe('/live')
    expect(landingRouteForRole(ROLE.DRONE_OPERATOR)).toBe('/fleet')
    expect(landingRouteForRole(ROLE.IT)).toBe('/health')
  })
})
