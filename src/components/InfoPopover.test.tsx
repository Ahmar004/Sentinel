import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InfoPopover from './InfoPopover'

afterEach(cleanup)

describe('InfoPopover', () => {
  it('hides its content until the trigger is activated', () => {
    render(<InfoPopover label="Why gaps stay grey">A gap is never interpolated.</InfoPopover>)
    expect(screen.queryByText('A gap is never interpolated.')).toBeNull()
  })

  it('opens on click and labels the panel', async () => {
    const user = userEvent.setup()
    render(<InfoPopover label="Why gaps stay grey">A gap is never interpolated.</InfoPopover>)
    await user.click(screen.getByRole('button', { name: /why gaps stay grey/i }))
    expect(screen.getByText('A gap is never interpolated.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /why gaps stay grey/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<InfoPopover label="Why gaps stay grey">A gap is never interpolated.</InfoPopover>)
    const trigger = screen.getByRole('button', { name: /why gaps stay grey/i })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByText('A gap is never interpolated.')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('closes when focus moves to another control', async () => {
    const user = userEvent.setup()
    render(
      <>
        <InfoPopover label="Why gaps stay grey">A gap is never interpolated.</InfoPopover>
        <button type="button">outside</button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: /why gaps stay grey/i }))
    await user.click(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByText('A gap is never interpolated.')).toBeNull()
  })
})
