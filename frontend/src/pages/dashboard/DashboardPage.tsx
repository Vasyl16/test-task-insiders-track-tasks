import { useState } from "react";
import { Link } from "react-router";
import { CreateWorkspaceForm } from "../../features/workspace/components/CreateWorkspaceForm";
import { useWorkspacesPage } from "../../shared/api/services/useWorkspaces";
import { getErrorMessage } from "../../shared/lib/getErrorMessage";
import { Button } from "../../shared/ui/Button";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Modal } from "../../shared/ui/Modal";
import { Skeleton } from "../../shared/ui/Skeleton";
import { Spinner } from "../../shared/ui/Spinner";

const WORKSPACES_PAGE_SIZE = 6;

export function DashboardPage() {
  const [page, setPage] = useState(1);
  const {
    data: workspacesPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useWorkspacesPage(page, WORKSPACES_PAGE_SIZE);
  const workspaces = workspacesPage?.items;
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // data (and with it, totalPages) goes undefined the moment a fetch
  // errors — even with placeholderData, which only bridges the *fetching*
  // gap, not a settled failure. Without remembering the last known page
  // count separately, the pager itself would vanish on error, trapping the
  // user on the broken page with no way to click back to one that works.
  const [lastKnownTotalPages, setLastKnownTotalPages] = useState<number | null>(null);
  if (workspacesPage && workspacesPage.totalPages !== lastKnownTotalPages) {
    setLastKnownTotalPages(workspacesPage.totalPages);
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-brass uppercase">Ledger</p>
          <h1 className="mt-1 font-display text-3xl font-medium text-paper">Your workspaces</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>New workspace</Button>
      </div>

      {(isLoading || isFetching) && (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: WORKSPACES_PAGE_SIZE }, (_, index) => (
            <li
              key={index}
              className="rounded-2xl bg-paper p-6 shadow-lg shadow-black/20"
            >
              <Skeleton className="h-5 w-2/3 bg-ink/10" />
              <Skeleton className="mt-3 h-3.5 w-4/5 bg-ink/10" />
            </li>
          ))}
        </ul>
      )}

      {isError && !isFetching && (
        <ErrorState
          message={getErrorMessage(error, "Failed to load your workspaces.")}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isFetching && !isError && workspaces?.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-brass/30 p-10 text-center">
          <p className="font-display text-lg text-paper">No workspaces yet</p>
          <p className="mt-1 text-sm text-fog">Open one to start logging projects against it.</p>
        </div>
      )}

      {!isLoading && !isFetching && !isError && workspaces && workspaces.length > 0 && (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Link
                to={`/workspaces/${workspace.id}`}
                className="group relative block rounded-2xl bg-paper p-6 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-2 left-6 h-4 w-8 rounded-b-sm bg-brass shadow-sm transition-colors group-hover:bg-brass-light"
                />
                <p className="font-display text-xl font-medium text-ink">{workspace.name}</p>
                {workspace.description && <p className="mt-1.5 text-sm text-ink/60">{workspace.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {lastKnownTotalPages !== null && lastKnownTotalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="nav"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </Button>
          <span className="flex items-center gap-2 font-mono text-xs tracking-wide text-fog uppercase">
            Page {page} of {lastKnownTotalPages}
            {isFetching && <Spinner size="sm" />}
          </span>
          <Button
            variant="nav"
            onClick={() => setPage((current) => Math.min(lastKnownTotalPages, current + 1))}
            disabled={page >= lastKnownTotalPages}
          >
            Next
          </Button>
        </div>
      )}

      {isCreateOpen && (
        <Modal
          title="New workspace"
          onClose={() => setIsCreateOpen(false)}
        >
          <CreateWorkspaceForm onCreated={() => setIsCreateOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
