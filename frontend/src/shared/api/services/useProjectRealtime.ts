import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Task } from "../../../entities/task/model/task";
import { socket } from "../socket/socketClient";
import { queryKeys } from "../queryKeys";

interface TaskEventPayload {
  actorUserId: string;
  task: Task;
}

interface TaskDeletedEventPayload {
  actorUserId: string;
  taskId: string;
}

// Ack payload for 'project:join', mirroring RealtimeGateway.handleJoin's
// return type on the backend — @nestjs/platform-socket.io sends a
// handler's return value through the client's ack callback automatically.
export type ProjectJoinAck = { status: "ok" } | { status: "error"; message: string };

// How long to wait for the server's ack before treating the join as failed
// anyway — without this, a dropped connection mid-request (or any ack that
// just never arrives) would leave the caller waiting forever with no signal.
const JOIN_ACK_TIMEOUT_MS = 8000;

interface UseProjectRealtimeResult {
  // Non-null whenever this project's room couldn't be joined — denied,
  // gone, or no ack arrived in time. TaskBoard renders this with the app's
  // existing ErrorState banner instead of failing silently.
  joinError: string | null;
  retryJoin: () => void;
}

// Joins this project's WebSocket room for the lifetime of the calling
// component (TaskBoard), and invalidates the same per-status list queries
// useUpdateTask's onSuccess already invalidates after a local edit — reused
// here for edits made by *other* users/tabs.
export function useProjectRealtime(workspaceId: string, projectId: string, currentUserId: string | undefined): UseProjectRealtimeResult {
  const queryClient = useQueryClient();
  const [joinError, setJoinError] = useState<string | null>(null);
  // Bumped on every new join attempt so a late ack/timeout from an attempt
  // this hook has since moved on from (project switched, unmounted) can't
  // overwrite joinError after the fact.
  const attemptIdRef = useRef(0);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const attemptJoin = useCallback(() => {
    if (!workspaceId || !projectId) {
      return;
    }
    if (!socket.connected) {
      // 'connect' re-triggers this once the socket is actually back —
      // surfaced rather than left silently unexplained in the meantime.
      setJoinError("Not connected to the server — waiting to reconnect…");
      return;
    }

    const attemptId = ++attemptIdRef.current;
    setJoinError(null);
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = setTimeout(() => {
      if (attemptIdRef.current === attemptId) {
        setJoinError("Could not confirm the connection to this project. Live updates may be delayed.");
      }
    }, JOIN_ACK_TIMEOUT_MS);

    socket.emit("project:join", { workspaceId, projectId }, (ack: ProjectJoinAck) => {
      if (attemptIdRef.current !== attemptId) {
        return;
      }
      clearTimeout(timeoutIdRef.current);
      setJoinError(ack.status === "error" ? ack.message : null);
    });
  }, [workspaceId, projectId]);

  useEffect(() => {
    if (!workspaceId || !projectId) {
      return;
    }

    // The local mutation that caused this event already invalidated the
    // list itself (see useUpdateTask/useCreateTask/useDeleteTask's own
    // onSuccess) and, for drag-and-drop, applied an optimistic update — a
    // second invalidation from this same action's own broadcast is at best
    // redundant and at worst a flicker racing the optimistic UI. Skip it
    // whenever the event's actorUserId is this tab's own user.
    const upsert = (payload: TaskEventPayload) => {
      if (payload.actorUserId === currentUserId) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists(workspaceId, projectId) });
      // Also refresh this task's own detail cache — TaskDetailModal reads
      // from it via useTask, so a task open in the modal on another tab/user
      // now updates live instead of only after the modal is closed/reopened.
      queryClient.setQueryData(queryKeys.tasks.detail(workspaceId, projectId, payload.task.id), payload.task);
    };
    const remove = (payload: TaskDeletedEventPayload) => {
      if (payload.actorUserId === currentUserId) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists(workspaceId, projectId) });
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(workspaceId, projectId, payload.taskId) });
    };

    // Socket.IO room membership does not survive a reconnect (a reconnect is
    // a brand-new server-side socket) — re-join every time 'connect' fires,
    // not just once on mount, or events silently stop after any blip.
    if (socket.connected) {
      // Deferred a tick rather than called synchronously in the effect body
      // — same eventual behavior (join happens right after mount), but
      // doesn't trigger a setState-during-effect render cascade.
      queueMicrotask(attemptJoin);
    }
    socket.on("connect", attemptJoin);
    socket.on("task:created", upsert);
    socket.on("task:updated", upsert);
    socket.on("task:deleted", remove);

    return () => {
      attemptIdRef.current += 1; // invalidate any in-flight attempt
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      if (socket.connected) {
        socket.emit("project:leave", { workspaceId, projectId });
      }
      socket.off("connect", attemptJoin);
      socket.off("task:created", upsert);
      socket.off("task:updated", upsert);
      socket.off("task:deleted", remove);
    };
  }, [workspaceId, projectId, currentUserId, queryClient, attemptJoin]);

  return { joinError, retryJoin: attemptJoin };
}
