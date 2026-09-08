import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dialog from './Dialog'

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(<Dialog open={false} title="Confirm" onCancel={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('submits on Enter and on the primary button, which is the only submit control', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Dialog open title="Confirm" confirmLabel="Confirm" onConfirm={onConfirm} onCancel={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('type', 'button')
  })

  it('cancels on Escape', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<Dialog open title="Confirm" confirmLabel="Confirm" onCancel={onCancel} />)

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not confirm while the primary action is disabled', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <Dialog open title="Confirm" confirmLabel="Confirm" confirmDisabled onConfirm={onConfirm} onCancel={() => {}} />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('labels itself from the title and describes itself from the description', () => {
    render(<Dialog open title="Regenerate grid" description="This detaches existing zones." onCancel={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Regenerate grid')
    expect(dialog).toHaveAccessibleDescription('This detaches existing zones.')
  })
})
