import { CommentSection } from '../../../features/comment/components/CommentSection'
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, formatDueDate, isTaskOverdue } from '../../../entities/task/model/task'
import type { Task } from '../../../entities/task/model/task'
import { useTaskHistory } from '../../../shared/api/services/useTaskHistory'
import { getErrorMessage } from '../../../shared/lib/getErrorMessage'
import { ErrorState } from '../../../shared/ui/ErrorState'
import { Modal } from '../../../shared/ui/Modal'
import { Skeleton } from '../../../shared/ui/Skeleton'

interface TaskDetailModalProps {
  workspaceId: string
  projectId: string
  task: Task
  assigneeName: string | null
  currentUserId: string | undefined
  isWorkspaceOwner: boolean
  onClose: () => void
}

// Read-only — for actually editing the task, use the separate Edit button
// on the card, which opens EditTaskForm in its own modal. This one is for
// viewing details plus the status history and comment thread alongside them.
export function TaskDetailModal({
  workspaceId,
  projectId,
  task,
  assigneeName,
  currentUserId,
  isWorkspaceOwner,
  onClose,
}: TaskDetailModalProps) {
  return (
    <Modal title={task.title} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div>
          {task.description && (
            <p className="text-sm whitespace-pre-wrap text-ink/70">{task.description}</p>
          )}
          <p className="mt-2 font-mono text-xs tracking-wide text-ink/50 uppercase">
            {TASK_STATUS_LABELS[task.status]} · {TASK_PRIORITY_LABELS[task.priority]} ·{' '}
            {assigneeName ?? 'Unassigned'}
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
  const { data: history, isLoading, isError, error, refetch } = useTaskHistory(
    workspaceId,
    projectId,
    taskId,
  )

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

        {isError && (
          <ErrorState
            message={getErrorMessage(error, 'Failed to load status history.')}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && history?.length === 0 && (
          <p className="font-mono text-xs text-ink/50">No status changes yet.</p>
        )}

        {!isLoading &&
          !isError &&
          history?.map((entry) => (
            <p key={entry.id} className="font-mono text-xs text-ink/50">
              <span className="text-brass-deep">{entry.changedBy.name}</span> changed status
              from <span className="text-ink">{TASK_STATUS_LABELS[entry.oldStatus]}</span> to{' '}
              <span className="text-ink">{TASK_STATUS_LABELS[entry.newStatus]}</span>
              {' — '}
              {formatTimestamp(entry.changedAt)}
            </p>
          ))}
      </div>
    </div>
  )
}
