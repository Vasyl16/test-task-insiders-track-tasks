import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Listbox } from './Listbox'
import type { ListboxOption } from './Listbox'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

const options: ListboxOption<Priority>[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

describe('Listbox', () => {
  it('shows the selected option and no options list when closed', () => {
    render(
      <Listbox id="priority" label="Priority" value="MEDIUM" options={options} onChange={vi.fn()} />,
    )

    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens the options list on click and toggles aria-expanded', async () => {
    const user = userEvent.setup()
    render(
      <Listbox id="priority" label="Priority" value="MEDIUM" options={options} onChange={vi.fn()} />,
    )

    const button = screen.getByRole('button', { name: /priority/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('calls onChange with the picked value and closes the list', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Listbox id="priority" label="Priority" value="MEDIUM" options={options} onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: /priority/i }))
    // The clickable element is the <button> nested inside the <li
    // role="option">, not the option itself — clicking the li wouldn't
    // bubble down into it.
    await user.click(screen.getByRole('button', { name: 'High' }))

    expect(onChange).toHaveBeenCalledWith('HIGH')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes when clicking outside the component', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Listbox id="priority" label="Priority" value="MEDIUM" options={options} onChange={vi.fn()} />
        <button type="button">Outside</button>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: /priority/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(screen.getByText('Outside'))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Escape and stops it from reaching a parent listener (e.g. a wrapping Modal)', async () => {
    const user = userEvent.setup()
    const parentKeyDownSpy = vi.fn()
    document.addEventListener('keydown', parentKeyDownSpy)

    try {
      render(
        <Listbox id="priority" label="Priority" value="MEDIUM" options={options} onChange={vi.fn()} />,
      )

      await user.click(screen.getByRole('button', { name: /priority/i }))
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(parentKeyDownSpy).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('keydown', parentKeyDownSpy)
    }
  })

  it('renders an error message when provided', () => {
    render(
      <Listbox
        id="priority"
        label="Priority"
        value="MEDIUM"
        options={options}
        onChange={vi.fn()}
        error="Priority is required"
      />,
    )

    expect(screen.getByText('Priority is required')).toBeInTheDocument()
  })
})
