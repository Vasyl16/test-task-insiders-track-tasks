import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../shared/testing/renderWithProviders'
import { LoginForm } from './LoginForm'
import { useLogin } from '../../../shared/api/services/useAuth'

vi.mock('../../../shared/api/services/useAuth')

describe('LoginForm', () => {
  const mutateAsync = vi.fn()

  beforeEach(() => {
    vi.mocked(useLogin).mockReturnValue({ mutateAsync } as unknown as ReturnType<typeof useLogin>)
    mutateAsync.mockReset()
  })

  it('renders email and password fields', () => {
    renderWithProviders(<LoginForm />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows validation errors and does not submit when fields are invalid', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('submits valid credentials', async () => {
    mutateAsync.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-password')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        email: 'jane@example.com',
        password: 'correct-password',
      }),
    )
  })

  it('shows the server error message when login fails', async () => {
    mutateAsync.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Invalid credentials' } },
    })
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })

  it('disables the submit button and shows a pending label while submitting', async () => {
    let resolveLogin: () => void = () => {}
    mutateAsync.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-password')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByRole('button', { name: /logging in/i })).toBeDisabled()

    resolveLogin()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /log in/i })).not.toBeDisabled(),
    )
  })
})
