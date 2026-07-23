import { CommentSection } from '../../../features/comment/components/CommentSection'
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, formatDueDate, isTaskOverdue } from '../../../entities/task/model/task'
import type { Task } from '../../../entities/task/model/task'
import { useTask } from '../../../shared/api/services/useTasks'
import { useTaskHistory } from '../../../shared/api/services/useTaskHistory'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { Modal } from '../../../shared/ui/Modal'
import { Skeleton } from '../../../shared/ui/Skeleton'
import { Spinner } from '../../../shared/ui/Spinner'

interface TaskDetailModalProps {
  workspaceId: string
  projectId: string
  taskId: string
  resolveAssigneeName: (task: Task) => string | null
  currentUserId: string | undefined
  isWorkspaceOwner: boolean
  onClose: () => void
}

// Read-only — for actually editing the task, use the separate Edit button
// on the card, which opens EditTaskForm in its own modal. This one is for
// viewing details plus the status history and comment thread alongside them.
//
// Reads the task via useTask (keyed off queryKeys.tasks.detail) rather than
// taking a Task snapshot as a prop — a snapshot captured at open time would
// go stale the moment a drag-and-drop move or another user's realtime edit
// updates that same cache entry, and this modal has no way to hear about it
// until closed and reopened. useTask stays live: useUpdateTask's onSuccess
// and useProjectRealtime's event handlers both write straight into this same
// cache entry, so this modal re-renders whenever either one does.
export function TaskDetailModal({
  workspaceId,
  projectId,
  taskId,
  resolveAssigneeName,
  currentUserId,
  isWorkspaceOwner,
  onClose,
}: TaskDetailModalProps) {
  const { data: task, isLoading, isError, error, refetch } = useTask(workspaceId, projectId, taskId)

  return (
    <Modal title={task?.title ?? 'Task'} onClose={onClose} size="lg">
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 bg-ink/10" />
          <Skeleton className="h-3.5 w-1/2 bg-ink/10" />
        </div>
      )}

      {isError && (
        <ErrorState
          message={getErrorMessage(error, 'Failed to load this task.')}
          onRetry={() => void refetch()}
        />
      )}

      {task && (
        <div className="space-y-6">
          <div>
            {task.description && (
              <p className="text-sm whitespace-pre-wrap text-ink/70">{task.description}</p>
            )}
            <p className="mt-2 font-mono text-xs tracking-wide text-ink/50 uppercase">
              {TASK_STATUS_LABELS[task.status]} · {TASK_PRIORITY_LABELS[task.priority]} ·{' '}
              {resolveAssigneeName(task) ?? 'Unassigned'}
              {task.dueDate && (
                <>
                  {' · '}
                  <span className={isTaskOverdue(task) ? 'text-oxblood' : undefined}>
                    Due {formatDueDate(task.dueDate)}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="border-t border-ink/10 pt-6">
            <StatusHistorySection workspaceId={workspaceId} projectId={projectId} taskId={task.id} />
          </div>

          <div className="border-t border-ink/10 pt-6">
            <CommentSection
              workspaceId={workspaceId}
              projectId={projectId}
              taskId={task.id}
              currentUserId={currentUserId}
              isWorkspaceOwner={isWorkspaceOwner}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}

interface StatusHistorySectionProps {
  workspaceId: string
  projectId: string
  taskId: string
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function StatusHistorySection({ workspaceId, projectId, taskId }: StatusHistorySectionProps) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
    isFetchNextPageError,
    refetch,
  } = useTaskHistory(workspaceId, projectId, taskId)
  const history = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div>
      <h3 className="font-mono text-xs tracking-[0.2em] text-brass-deep uppercase">
        Status history
      </h3>

      <div className="mt-3 space-y-2">
        {isLoading &&
          Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-3.5 w-3/4 bg-ink/10" />
          ))}

        {isError && !isLoading && history.length === 0 && (
          <ErrorState
            message={getErrorMessage(error, 'Failed to load status history.')}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && history.length === 0 && (
          <p className="font-mono text-xs text-ink/50">No status changes yet.</p>
        )}

        {!isLoading &&
          history.map((entry) => (
            <p key={entry.id} className="font-mono text-xs text-ink/50">
              <span className="text-brass-deep">{entry.changedBy.name}</span> changed status
              from <span className="text-ink">{TASK_STATUS_LABELS[entry.oldStatus]}</span> to{' '}
              <span className="text-ink">{TASK_STATUS_LABELS[entry.newStatus]}</span>
              {' — '}
              {formatTimestamp(entry.changedAt)}
            </p>
          ))}

        {hasNextPage && (
          <div className="flex justify-center pt-1">
            {isFetchingNextPage ? (
              <Spinner size="sm" />
            ) : (
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                className="cursor-pointer font-mono text-[11px] tracking-wide text-brass-deep uppercase transition-colors hover:text-brass"
              >
                Load more
              </button>
            )}
          </div>
        )}

        {isFetchNextPageError && !isFetchingNextPage && (
          <div className="flex flex-col items-center gap-1 pt-1">
            <p className="font-mono text-[11px] text-oxblood">Failed to load more.</p>
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              className="cursor-pointer font-mono text-[11px] tracking-wide text-brass-deep uppercase transition-colors hover:text-brass"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
