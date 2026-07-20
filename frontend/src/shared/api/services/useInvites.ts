import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { acceptInvite, createInvite, declineInvite, getMyInvites } from '../queries/invite'
import { queryKeys } from '../queryKeys'

export function useMyInvites() {
  return useQuery({
    queryKey: queryKeys.invites.mine,
    queryFn: getMyInvites,
  })
}

export function useCreateInvite(workspaceId: string) {
  return useMutation({
    mutationFn: (email: string) => createInvite(workspaceId, email),
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => acceptInvite(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invites.mine })
      // Accepting creates a new membership, so the workspace list (and its
      // ownership filter) is now stale too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.lists })
    },
  })
}

export function useDeclineInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => declineInvite(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invites.mine })
    },
  })
}
