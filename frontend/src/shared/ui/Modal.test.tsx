import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders the title and children as a dialog', () => {
    render(
      <Modal title="Edit task" onClose={vi.fn()}>
        <p>Body content</p>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Edit task' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal title="Edit task" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal title="Edit task" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    await user.click(screen.getAllByLabelText('Close')[0])

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the explicit close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal title="Edit task" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )

    await user.click(screen.getByText('✕'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll while mounted and restores it on unmount', () => {
    document.body.style.overflow = 'auto'

    const { unmount } = render(
      <Modal title="Edit task" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    )

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('auto')
  })
})
