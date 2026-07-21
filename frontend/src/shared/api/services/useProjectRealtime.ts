import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { socket } from '../socket/socketClient'
import { queryKeys } from '../queryKeys'

// Joins this project's WebSocket room for the lifetime of the calling
// component (TaskBoard), and invalidates the same per-status list queries
// useUpdateTask's onSuccess already invalidates after a local edit — reused
// here for edits made by *other* users/tabs.
export function useProjectRealtime(workspaceId: string, projectId: string): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!workspaceId || !projectId) {
      return
    }

    const join = () => socket.emit('project:join', { workspaceId, projectId })
    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists(workspaceId, projectId) })

    // Socket.IO room membership does not survive a reconnect (a reconnect is
    // a brand-new server-side socket) — re-join every time 'connect' fires,
    // not just once on mount, or events silently stop after any blip.
    if (socket.connected) {
      join()
    }
    socket.on('connect', join)
    socket.on('task:created', invalidate)
    socket.on('task:updated', invalidate)
    socket.on('task:deleted', invalidate)

    return () => {
      if (socket.connected) {
        socket.emit('project:leave', { workspaceId, projectId })
      }
      socket.off('connect', join)
      socket.off('task:created', invalidate)
      socket.off('task:updated', invalidate)
      socket.off('task:deleted', invalidate)
    }
  }, [workspaceId, projectId, queryClient])
}
