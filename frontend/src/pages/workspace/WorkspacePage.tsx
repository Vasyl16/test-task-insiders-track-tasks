import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Project } from '../../entities/project/model/project'
import { CreateProjectForm } from '../../features/project/components/CreateProjectForm'
import { EditProjectForm } from '../../features/project/components/EditProjectForm'
import { EditWorkspaceForm } from '../../features/workspace/components/EditWorkspaceForm'
import { InviteMemberForm } from '../../features/workspace/components/InviteMemberForm'
import { useAuth } from '../../shared/api/services/useAuth'
import { useDeleteProject, useProjectsPage } from '../../shared/api/services/useProjects'
import { useDeleteWorkspace, useWorkspace } from '../../shared/api/services/useWorkspaces'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'
import { getErrorMessage, isNotFoundOrForbidden } from '../../shared/lib/getErrorMessage'
import { sortValueToParams } from '../../shared/lib/sortValueToParams'
import { Button } from '../../shared/ui/Button'
import { ErrorState } from '../../shared/ui/ErrorState'
import { ListFilterBar, type ListSortValue, type OwnershipValue } from '../../shared/ui/ListFilterBar'
import { Modal } from '../../shared/ui/Modal'
import { Skeleton } from '../../shared/ui/Skeleton'
import { Spinner } from '../../shared/ui/Spinner'

const PROJECTS_PAGE_SIZE = 10

export function WorkspacePage() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const {
    data: workspace,
    isLoading: isWorkspaceLoading,
    isError: isWorkspaceError,
    error: workspaceError,
    refetch: refetchWorkspace,
  } = useWorkspace(workspaceId)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [sort, setSort] = useState<ListSortValue>('createdAt-desc')
  const [ownership, setOwnership] = useState<OwnershipValue>('all')
  // data (and with it, totalPages) goes undefined the moment a fetch
  // errors — even with placeholderData, which only bridges the *fetching*
  // gap, not a settled failure. Without remembering the last known page
  // count separately, the pager itself would vanish on error, trapping the
  // user on the broken page with no way to click back to one that works.
  const [lastKnownTotalPages, setLastKnownTotalPages] = useState<number | null>(null)
  // Route params change without remounting this component (same route
  // pattern, different :workspaceId), so page state would otherwise leak
  // across workspaces. Reset it during render (React's documented pattern
  // for this) rather than in an effect, which would cost an extra render.
  const [renderedForWorkspaceId, setRenderedForWorkspaceId] = useState(workspaceId)
  if (workspaceId !== renderedForWorkspaceId) {
    setRenderedForWorkspaceId(workspaceId)
    setPage(1)
    setLastKnownTotalPages(null)
    setSearch('')
    setSort('createdAt-desc')
    setOwnership('all')
  }

  // Same "reset page during render, not in an effect" pattern as above,
  // applied to filter changes — a new search/sort/ownership combination
  // makes the current page number meaningless against the new result set.
  const [appliedForFilters, setAppliedForFilters] = useState({ search: debouncedSearch, sort, ownership })
  if (
    appliedForFilters.search !== debouncedSearch ||
    appliedForFilters.sort !== sort ||
    appliedForFilters.ownership !== ownership
  ) {
    setAppliedForFilters({ search: debouncedSearch, sort, ownership })
    setPage(1)
  }

  const { sortBy, sortOrder } = sortValueToParams(sort)
  const {
    data: projectsPage,
    isLoading: isProjectsLoading,
    isFetching: isProjectsFetching,
    isError: isProjectsError,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjectsPage(workspaceId, {
    page,
    limit: PROJECTS_PAGE_SIZE,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    ownership,
  })
  const projects = projectsPage?.items
  if (projectsPage && projectsPage.totalPages !== lastKnownTotalPages) {
    setLastKnownTotalPages(projectsPage.totalPages)
  }

  const deleteWorkspace = useDeleteWorkspace()
  const deleteProject = useDeleteProject(workspaceId)

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const BackLink = (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-fog uppercase transition-colors hover:text-brass-light"
    >
      <span aria-hidden="true" className="-translate-y-px">
        ←
      </span>
      <span>All workspaces</span>
    </Link>
  )

  if (isWorkspaceLoading) {
    return (
      <div>
        {BackLink}
        <div className="mt-10 flex justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (isWorkspaceError && !isNotFoundOrForbidden(workspaceError)) {
    return (
      <div>
        {BackLink}
        <ErrorState
          message={getErrorMessage(workspaceError, 'Failed to load this workspace.')}
          onRetry={() => void refetchWorkspace()}
        />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div>
        {BackLink}
        <p className="mt-6 font-mono text-sm text-fog">
          This workspace doesn&apos;t exist, or you no longer have access to it.
        </p>
      </div>
    )
  }

  const isOwner = workspace.ownerId === user?.id

  const handleDeleteWorkspace = () => {
    if (!window.confirm(`Delete workspace "${workspace.name}"? This cannot be undone.`)) {
      return
    }
    // Navigate first, then fire the mutation: this page's own useWorkspace/
    // useProjectsPage queries must unmount before the mutation's onSuccess
    // invalidates/removes them, otherwise they'd refetch a workspace that's
    // already gone and log a pointless 404.
    void navigate('/dashboard')
    deleteWorkspace.mutate(workspace.id)
  }

  return (
    <div>
      {BackLink}

      <div className="mt-4 flex items-start justify-between gap-6 border-b border-brass/20 pb-8">
        <div>
          <h1 className="font-display text-3xl font-medium text-paper">
            {workspace.name}
          </h1>
          {workspace.description && (
            <p className="mt-1.5 text-sm text-fog">{workspace.description}</p>
          )}
        </div>
        {isOwner && (
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="nav" onClick={() => setIsInviteOpen(true)}>
              Invite member
            </Button>
            <Button variant="nav" onClick={() => setIsEditWorkspaceOpen(true)}>
              Edit workspace
            </Button>
            <Button variant="logout" onClick={handleDeleteWorkspace}>
              Delete workspace
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
          Projects logged
        </h2>
        <Button onClick={() => setIsCreateProjectOpen(true)}>New project</Button>
      </div>

      <ListFilterBar
        idPrefix="workspace-projects"
        searchLabel="Search projects"
        searchPlaceholder="Search by name…"
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        ownership={ownership}
        onOwnershipChange={setOwnership}
        ownershipOtherLabel="Created by others"
      />

      {(isProjectsLoading || isProjectsFetching) && (
        <ul className="mt-4 divide-y divide-brass/15 rounded-2xl bg-paper shadow-lg shadow-black/20">
          {Array.from({ length: PROJECTS_PAGE_SIZE }, (_, index) => (
            <li key={index} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-3.5 w-4 bg-ink/10" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-1/3 bg-ink/10" />
                <Skeleton className="mt-2 h-3 w-1/2 bg-ink/10" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {isProjectsError && !isProjectsFetching && (
        <ErrorState
          message={getErrorMessage(projectsError, 'Failed to load projects for this workspace.')}
          onRetry={() => void refetchProjects()}
        />
      )}

      {!isProjectsLoading && !isProjectsFetching && !isProjectsError && projects?.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-brass/30 p-10 text-center">
          <p className="font-display text-lg text-paper">
            {debouncedSearch || ownership !== 'all' ? 'No projects match' : 'No projects yet'}
          </p>
          <p className="mt-1 text-sm text-fog">
            {debouncedSearch || ownership !== 'all'
              ? 'Try a different search or filter.'
              : 'Log the first one for this workspace.'}
          </p>
        </div>
      )}

      {!isProjectsLoading && !isProjectsFetching && !isProjectsError && projects && projects.length > 0 && (
        <ul className="mt-4 divide-y divide-brass/15 rounded-2xl bg-paper shadow-lg shadow-black/20">
          {projects.map((project, index) => {
            const canManage = isOwner || project.createdBy === user?.id
            // Global ledger position, not just this page's row index — page
            // 2 of a 10-per-page list still starts numbering at 11.
            const ledgerNumber = (page - 1) * PROJECTS_PAGE_SIZE + index + 1
            return (
              <li key={project.id} className="flex items-center gap-4 px-6 py-4">
                <span className="font-mono text-sm text-ink/35 tabular-nums">
                  {String(ledgerNumber).padStart(2, '0')}
                </span>
                <Link
                  to={`/workspaces/${workspaceId}/projects/${project.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate font-display text-lg text-ink hover:text-brass-deep">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="truncate text-sm text-ink/60">
                      {project.description}
                    </p>
                  )}
                </Link>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingProject(project)}
                      className="font-mono text-xs tracking-wide text-brass-deep uppercase transition-colors hover:text-brass"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteProject.mutateAsync(project.id)}
                      className="font-mono text-xs tracking-wide text-oxblood/70 uppercase transition-colors hover:text-oxblood"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {lastKnownTotalPages !== null && lastKnownTotalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="nav"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="flex items-center gap-2 font-mono text-xs tracking-wide text-fog uppercase">
            Page {page} of {lastKnownTotalPages}
            {isProjectsFetching && <Spinner size="sm" />}
          </span>
          <Button
            variant="nav"
            onClick={() =>
              setPage((current) => Math.min(lastKnownTotalPages, current + 1))
            }
            disabled={page >= lastKnownTotalPages}
          >
            Next
          </Button>
        </div>
      )}

      {isCreateProjectOpen && (
        <Modal title="New project" onClose={() => setIsCreateProjectOpen(false)}>
          <CreateProjectForm
            workspaceId={workspace.id}
            onCreated={() => setIsCreateProjectOpen(false)}
          />
        </Modal>
      )}

      {isEditWorkspaceOpen && (
        <Modal title="Edit workspace" onClose={() => setIsEditWorkspaceOpen(false)}>
          <EditWorkspaceForm
            workspace={workspace}
            onSaved={() => setIsEditWorkspaceOpen(false)}
          />
        </Modal>
      )}

      {isInviteOpen && (
        <Modal title="Invite member" onClose={() => setIsInviteOpen(false)}>
          <InviteMemberForm
            workspaceId={workspace.id}
            onSent={() => setIsInviteOpen(false)}
          />
        </Modal>
      )}

      {editingProject && (
        <Modal title="Edit project" onClose={() => setEditingProject(null)}>
          <EditProjectForm
            workspaceId={workspaceId}
            project={editingProject}
            onSaved={() => setEditingProject(null)}
          />
        </Modal>
      )}
    </div>
  )
}
