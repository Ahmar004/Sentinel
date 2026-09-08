import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import S01Login from './S01Login'
import { resetSentinelClientForTests, setSentinelClient, useSessionStore } from '@/store'
import { ROLE } from '@/domain/constants'
import type { SentinelClient } from '@/client/SentinelClient'
import type { Credentials, Session } from '@/domain/types'

function fakeClient(login: (credentials: Credentials) => Promise<Session>): SentinelClient {
  // A full SentinelClient stub would be dozens of methods this screen never
  // calls; the Proxy answers every other property with a no-op spy so the
  // fake still satisfies the interface's shape at runtime.
  return new Proxy({} as SentinelClient, {
    get(_target, prop) {
      if (prop === 'login') return login
      return vi.fn()
    },
  })
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<S01Login />} />
        <Route path="/live" element={<p>Live site map</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useSessionStore.setState({ user: null, role: null, status: 'idle', error: null })
  resetSentinelClientForTests()
})

describe('S01 Login', () => {
  it('renders a real form with Enter-submits wiring: submit is type="submit", other actions are type="button"', () => {
    renderLogin()
    const submit = screen.getByRole('button', { name: /sign in/i })
    const clear = screen.getByRole('button', { name: /clear/i })
    expect(submit).toHaveAttribute('type', 'submit')
    expect(clear).toHaveAttribute('type', 'button')
  })

  it('signs in with valid credentials and lands on the role landing route', async () => {
    setSentinelClient(
      fakeClient(async () => ({
        user: {
          userId: 'u1',
          username: 'a.rahman',
          role: ROLE.COORDINATOR,
          active: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          lastLoginAt: null,
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: '2026-01-01T01:00:00.000Z',
      })),
    )
    renderLogin()

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'a.rahman' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('Live site map')).toBeInTheDocument())
    expect(useSessionStore.getState().role).toBe(ROLE.COORDINATOR)
  })

  it('shows one error that does not disclose which field was wrong, on failure', async () => {
    setSentinelClient(
      fakeClient(async () => {
        throw new Error('invalid_credentials')
      }),
    )
    renderLogin()

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'nobody' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    // FR10.1: invalid credentials return one error that does not say which
    // field was wrong - never "unknown username" or "wrong password" alone.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Incorrect username or password.')
  })

  it('clears the fields on Escape', () => {
    renderLogin()
    const username = screen.getByLabelText(/username/i) as HTMLInputElement
    const password = screen.getByLabelText(/password/i) as HTMLInputElement

    fireEvent.change(username, { target: { value: 'a.rahman' } })
    fireEvent.change(password, { target: { value: 'secret' } })
    expect(username.value).toBe('a.rahman')

    fireEvent.keyDown(username.closest('form')!, { key: 'Escape' })

    expect(username.value).toBe('')
    expect(password.value).toBe('')
  })
})
