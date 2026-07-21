import { useEffect, useRef, useState } from "react";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { EditTaskForm } from "../../../features/task/components/EditTaskForm";
import { TaskDetailModal } from "../../task-detail/ui/TaskDetailModal";
import { TASK_PRIORITY_BORDER_CLASSES, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, formatDueDate, isTaskOverdue, taskStatusValues } from "../../../entities/task/model/task";
import type { Task, TaskStatus } from "../../../entities/task/model/task";
import type { WorkspaceMember } from "../../../entities/workspace/model/workspace-member";
import { useDeleteTask, useTasksByStatus, useUpdateTask } from "../../../shared/api/services/useTasks";
import { useProjectRealtime } from "../../../shared/api/services/useProjectRealtime";
import type { TaskListFilters } from "../../../shared/api/queryKeys";
import { getErrorMessage } from "../../../shared/lib/getErrorMessage";
import { Modal } from "../../../shared/ui/Modal";
import { Skeleton } from "../../../shared/ui/Skeleton";
import { Spinner } from "../../../shared/ui/Spinner";

interface TaskBoardProps {
  workspaceId: string;
  projectId: string;
  members: WorkspaceMember[] | undefined;
  currentUserId: string | undefined;
  isWorkspaceOwner: boolean;
  filters: TaskListFilters;
}

// Cards carry their own Task via useDraggable's `data`, so the drag handlers
// never need one flat list of every task across all (independently, lazily
// loaded) columns just to look one up by id.
interface DraggableData {
  task: Task;
}

export function TaskBoard({ workspaceId, projectId, members, currentUserId, isWorkspaceOwner, filters }: TaskBoardProps) {
  useProjectRealtime(workspaceId, projectId);
  const updateTask = useUpdateTask(workspaceId, projectId, filters);
  const deleteTask = useDeleteTask(workspaceId, projectId);
  // selectedTask: read-only detail (fields + status history + comments),
  // opened by clicking the card body. editingTask: the actual edit form, in
  // its own separate modal, opened only via the explicit Edit button.
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // The only state DnD Kit itself needs: which task is being dragged, so
  // <DragOverlay> knows what to render. Everything else (per-card "am I the
  // one being dragged" opacity, per-column "is something hovering over me"
  // highlight) comes straight from useDraggable/useDroppable's own return
  // values — no parallel state to keep in sync with the library's.
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const memberNameById = new Map(members?.map((member) => [member.user.id, member.user.name]));

  const sensors = useSensors(
    // A small movement threshold before a drag "activates" — without it, a
    // plain click on the card (e.g. to reach Edit/Remove) would immediately
    // register as a drag attempt on pointerdown.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const resolveAssigneeName = (task: Task) => (task.assigneeId ? (memberNameById.get(task.assigneeId) ?? "Unknown") : null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask((event.active.data.current as DraggableData | undefined)?.task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) {
      return;
    }
    const destinationStatus = over.id as TaskStatus;
    const task = (active.data.current as DraggableData | undefined)?.task;
    if (!task || task.status === destinationStatus) {
      return;
    }
    updateTask.mutate({ id: task.id, status: destinationStatus });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {taskStatusValues.map((status) => (
          <TaskColumn
            key={status}
            workspaceId={workspaceId}
            projectId={projectId}
            status={status}
            currentUserId={currentUserId}
            isWorkspaceOwner={isWorkspaceOwner}
            resolveAssigneeName={resolveAssigneeName}
            filters={filters}
            onOpen={setSelectedTask}
            onEdit={setEditingTask}
            onRemove={(id) => void deleteTask.mutateAsync(id)}
          />
        ))}
      </div>

      {/* Default DragOverlay behavior animates the clone back to its origin
          before removing it — now that the card itself moves instantly via
          the optimistic update, that boomerang-back read as a glitch, so it's
          disabled: the clone just disappears at the drop point. */}
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className={`rounded-xl border-t-4 bg-paper p-2.5 shadow-xl shadow-black/30 ${TASK_PRIORITY_BORDER_CLASSES[activeTask.priority]}`}>
            <TaskCardContent
              task={activeTask}
              assigneeName={resolveAssigneeName(activeTask)}
            />
          </div>
        )}
      </DragOverlay>

      {selectedTask && (
        <TaskDetailModal
          workspaceId={workspaceId}
          projectId={projectId}
          task={selectedTask}
          assigneeName={resolveAssigneeName(selectedTask)}
          currentUserId={currentUserId}
          isWorkspaceOwner={isWorkspaceOwner}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {editingTask && (
        <Modal title="Edit task" onClose={() => setEditingTask(null)}>
          <EditTaskForm
            workspaceId={workspaceId}
            projectId={projectId}
            task={editingTask}
            members={members}
            onSaved={() => setEditingTask(null)}
          />
        </Modal>
      )}
    </DndContext>
  );
}

interface TaskColumnProps {
  workspaceId: string;
  projectId: string;
  status: TaskStatus;
  currentUserId: string | undefined;
  isWorkspaceOwner: boolean;
  resolveAssigneeName: (task: Task) => string | null;
  filters: TaskListFilters;
  onOpen: (task: Task) => void;
  onEdit: (task: Task) => void;
  onRemove: (id: string) => void;
}

// Fixed height + its own scroll container is what makes "lazy loading" and
// "infinite scroll" a per-column thing rather than a per-board thing — each
// status only ever fetches (and re-fetches) its own pages. Height itself is
// just this one Tailwind arbitrary-value class — bump/shrink it here only.
const COLUMN_SCROLL_CLASS = "max-h-[60vh] overflow-y-auto";

function TaskColumn({ workspaceId, projectId, status, currentUserId, isWorkspaceOwner, resolveAssigneeName, filters, onOpen, onEdit, onRemove }: TaskColumnProps) {
  // The droppable id *is* the destination status — handleDragEnd reads
  // `over.id` straight back as a TaskStatus, no separate lookup table.
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: status });
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
  } = useTasksByStatus(workspaceId, projectId, status, filters);

  const tasks = data?.pages.flatMap((page) => page.items) ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load the next page when the sentinel at the bottom of *this column's own
  // scroll container* comes into view — root is the column, not the
  // viewport, so scrolling the page itself never triggers a fetch.
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasNextPage) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: "100px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  return (
    <div
      ref={setDroppableRef}
      className={`rounded-2xl bg-desk-raised p-3 transition-shadow ${isOver ? "ring-2 ring-brass" : ""}`}
    >
      <div className="flex items-center justify-between px-2 pb-3">
        <h3 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">{TASK_STATUS_LABELS[status]}</h3>
        <span className="font-mono text-xs text-fog">
          {tasks.length}
          {hasNextPage ? "+" : ""}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={`space-y-1.5 ${COLUMN_SCROLL_CLASS}`}
      >
        {isLoading &&
          Array.from({ length: 3 }, (_, index) => <TaskCardSkeleton key={index} />)}

        {isError && !isLoading && tasks.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="font-mono text-xs text-oxblood">
              {getErrorMessage(error, "Failed to load tasks.")}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 cursor-pointer font-mono text-[11px] tracking-wide text-brass-deep uppercase transition-colors hover:text-brass"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && tasks.length === 0 && (
          <p className="px-2 py-6 text-center font-mono text-xs text-fog">
            {filters.search || filters.priority || filters.assigneeId ? "No matches" : "Drop tasks here"}
          </p>
        )}

        {tasks.map((task) => {
          const canManage = isWorkspaceOwner || task.createdBy === currentUserId;

          return (
            <TaskCard
              key={task.id}
              task={task}
              assigneeName={resolveAssigneeName(task)}
              canManage={canManage}
              onOpen={() => onOpen(task)}
              onEdit={() => onEdit(task)}
              onRemove={() => onRemove(task.id)}
            />
          );
        })}

        {tasks.length > 0 && (
          <div
            ref={sentinelRef}
            className="h-px"
          />
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}

        {isFetchNextPageError && !isFetchingNextPage && (
          <div className="flex flex-col items-center gap-1 py-2">
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
  );
}

// Same rounded-xl/p-2.5 shape as a real TaskCard (minus the priority border,
// since there's no priority to show yet) — placeholder bars stand in for the
// title and the priority-· assignee line.
function TaskCardSkeleton() {
  return (
    <div className="space-y-1 rounded-xl bg-paper p-2.5 shadow-md shadow-black/20">
      <Skeleton className="h-4 w-3/4 bg-ink/10" />
      <Skeleton className="h-3 w-1/2 bg-ink/10" />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  assigneeName: string | null;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function TaskCard({ task, assigneeName, canManage, onOpen, onEdit, onRemove }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task } as DraggableData,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      // touch-none: without it, a touchscreen drag also tries to scroll the
      // page underneath it — PointerSensor needs the browser to hand touch
      // gestures over to it instead.
      className={`cursor-pointer touch-none space-y-1 rounded-xl border-t-4 bg-paper p-2.5 shadow-md shadow-black/20 transition-opacity active:cursor-grabbing ${TASK_PRIORITY_BORDER_CLASSES[task.priority]} ${isDragging ? "opacity-40" : ""}`}
    >
      <TaskCardContent
        task={task}
        assigneeName={assigneeName}
      />

      <div className="flex items-center justify-end gap-3 pt-0.5">
        <button
          type="button"
          onClick={(event) => {
            // Without these, the click would also bubble up to the card's
            // own onClick and open the read-only detail view on top of
            // editing/removing it.
            event.stopPropagation();
            onEdit();
          }}
          className="cursor-pointer font-mono text-[11px] tracking-wide text-brass-deep uppercase transition-colors hover:text-brass"
        >
          Edit
        </button>

        {canManage && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="cursor-pointer font-mono text-[11px] tracking-wide text-oxblood/70 uppercase transition-colors hover:text-oxblood"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

interface TaskCardContentProps {
  task: Task;
  assigneeName: string | null;
}

// Shared between the in-column TaskCard and the DragOverlay's floating clone
// so the two visuals can't drift apart.
function TaskCardContent({ task, assigneeName }: TaskCardContentProps) {
  return (
    <>
      <p className={`font-display text-base leading-snug text-ink ${task.status === "DONE" ? "line-through opacity-50" : ""}`}>{task.title}</p>

      {task.description && <p className="truncate text-xs text-ink/60">{task.description}</p>}

      <p className="font-mono text-[11px] text-ink/40">
        {TASK_PRIORITY_LABELS[task.priority]} · {assigneeName ?? "Unassigned"}
        {task.dueDate && (
          <>
            {" · "}
            <span className={isTaskOverdue(task) ? "text-oxblood" : undefined}>
              Due {formatDueDate(task.dueDate)}
            </span>
          </>
        )}
      </p>
    </>
  );
}
