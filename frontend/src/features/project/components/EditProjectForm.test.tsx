import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../shared/testing/renderWithProviders'
import { EditProjectForm } from './EditProjectForm'
import { useUpdateProject } from '../../../shared/api/services/useProjects'
import type { Project } from '../../../entities/project/model/project'

vi.mock('../../../shared/api/services/useProjects')

const project: Project = {
  id: 'project-1',
  workspaceId: 'workspace-1',
  name: 'Original name',
  description: 'Original description',
  createdBy: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('EditProjectForm', () => {
  const mutateAsync = vi.fn()

  beforeEach(() => {
    vi.mocked(useUpdateProject).mockReturnValue({
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateProject>)
    mutateAsync.mockReset()
  })

  it('pre-fills the fields from the given project', () => {
    renderWithProviders(<EditProjectForm workspaceId="workspace-1" project={project} />)

    expect(screen.getByLabelText('Project name')).toHaveValue('Original name')
    expect(screen.getByLabelText('Description (optional)')).toHaveValue('Original description')
  })

  it('disables the submit button until the form is dirty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditProjectForm workspaceId="workspace-1" project={project} />)

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    await user.type(screen.getByLabelText('Project name'), ' updated')

    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled()
  })

  it('submits only after a real change and calls onSaved on success', async () => {
    mutateAsync.mockResolvedValue({ ...project, name: 'Renamed project' })
    const onSaved = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <EditProjectForm workspaceId="workspace-1" project={project} onSaved={onSaved} />,
    )

    await user.clear(screen.getByLabelText('Project name'))
    await user.type(screen.getByLabelText('Project name'), 'Renamed project')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        name: 'Renamed project',
        description: 'Original description',
      }),
    )
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })

  it('shows a root error and does not call onSaved when the update fails', async () => {
    mutateAsync.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Only the creator or workspace owner can do this.' } },
    })
    const onSaved = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <EditProjectForm workspaceId="workspace-1" project={project} onSaved={onSaved} />,
    )

    await user.type(screen.getByLabelText('Project name'), ' updated')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText('Only the creator or workspace owner can do this.'),
    ).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
