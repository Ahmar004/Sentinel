import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SuggestionList from './SuggestionList'
import { SAFEGUARD_CHECK, SUGGESTION_ACTION, SUGGESTION_STATUS, TEXT_SOURCE } from '@/domain/constants'
import type { SuggestionOption } from '@/domain/types'

function makeOption(overrides: Partial<SuggestionOption>): SuggestionOption {
  return {
    suggestionId: 's1',
    alertId: 'a1',
    rank: 1,
    status: SUGGESTION_STATUS.PROPOSED,
    action: SUGGESTION_ACTION.DIVERT,
    targetExitId: 'E2',
    routeCells: [],
    text: 'Divert to exit E2.',
    textSource: TEXT_SOURCE.MODEL,
    rationale: 'E2 has capacity to spare.',
    safeguards: [{ check: SAFEGUARD_CHECK.OVER_THRESHOLD_CELL, passed: true }],
    confirmedBy: null,
    confirmedAt: null,
    dismissedBy: null,
    dismissedAt: null,
    ...overrides,
  }
}

describe('SuggestionList', () => {
  it('shows the honest empty state when nothing was issued', () => {
    render(<SuggestionList suggestions={[]} onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/no suggestions issued/i)).toBeInTheDocument()
  })

  it('names the failing safeguard on a rejected option', () => {
    const rejected = makeOption({
      suggestionId: 's3',
      rank: 3,
      status: SUGGESTION_STATUS.REJECTED,
      safeguards: [
        { check: SAFEGUARD_CHECK.STALE_CELL_ON_ROUTE, passed: false, reason: 'Cell C-031-022 is stale' },
      ],
    })
    render(<SuggestionList suggestions={[rejected]} onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getAllByText(/a cell on the route is stale/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/C-031-022 is stale/).length).toBeGreaterThan(0)
  })

  it('states in words when no safe option was found', () => {
    const rejected = makeOption({ status: SUGGESTION_STATUS.REJECTED, safeguards: [{ check: SAFEGUARD_CHECK.EXIT_OVER_CAPACITY, passed: false, reason: 'Exit E1 over capacity' }] })
    render(<SuggestionList suggestions={[rejected]} onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText(/no safe option was found/i)).toBeInTheDocument()
  })

  it('never shows confirm or dismiss for a non-proposed suggestion', () => {
    const confirmed = makeOption({ status: SUGGESTION_STATUS.CONFIRMED })
    render(<SuggestionList suggestions={[confirmed]} onConfirm={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
  })

  it('calls onConfirm with the suggestion id and actuates nothing else itself', () => {
    const onConfirm = vi.fn()
    render(<SuggestionList suggestions={[makeOption({})]} onConfirm={onConfirm} onDismiss={vi.fn()} />)
    screen.getByRole('button', { name: /confirm/i }).click()
    expect(onConfirm).toHaveBeenCalledWith('s1')
  })
})
