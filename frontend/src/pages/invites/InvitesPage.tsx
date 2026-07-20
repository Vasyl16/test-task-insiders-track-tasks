import { INVITE_STATUS_LABELS, inviteStatusValues, type Invite, type InviteStatus } from '../../entities/invite/model/invite'
import { useAcceptInvite, useDeclineInvite, useMyInvites } from '../../shared/api/services/useInvites'
import { getErrorMessage } from '../../shared/lib/getErrorMessage'
import { ErrorState } from '../../shared/ui/ErrorState'
import { Skeleton } from '../../shared/ui/Skeleton'
import { Spinner } from '../../shared/ui/Spinner'

const STATUS_BADGE_CLASSES: Record<InviteStatus, string> = {
  PENDING: 'bg-brass/15 text-brass-deep',
  ACCEPTED: 'bg-moss/15 text-moss',
  DECLINED: 'bg-oxblood/15 text-oxblood',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function InvitesPage() {
  const { data: invites, isLoading, isError, error, refetch } = useMyInvites()
  const acceptInvite = useAcceptInvite()
  const declineInvite = useDeclineInvite()

  const grouped: Record<InviteStatus, Invite[]> = {
    PENDING: [],
    ACCEPTED: [],
    DECLINED: [],
  }
  invites?.forEach((invite) => grouped[invite.status].push(invite))

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.2em] text-brass uppercase">Ledger</p>
      <h1 className="mt-1 font-display text-3xl font-medium text-paper">Your invites</h1>

      {isLoading && (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-2xl bg-paper p-5 shadow-lg shadow-black/20">
              <Skeleton className="h-4 w-1/3 bg-ink/10" />
              <Skeleton className="mt-2 h-3.5 w-1/2 bg-ink/10" />
            </div>
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <ErrorState
          message={getErrorMessage(error, 'Failed to load your invites.')}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && invites?.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-brass/30 p-10 text-center">
          <p className="font-display text-lg text-paper">No invites yet</p>
          <p className="mt-1 text-sm text-fog">Invitations to join a workspace will show up here.</p>
        </div>
      )}

      {!isLoading && !isError && invites && invites.length > 0 && (
        <div className="mt-8 space-y-8">
          {inviteStatusValues.map((status) =>
            grouped[status].length > 0 ? (
              <section key={status}>
                <h2 className="font-mono text-xs tracking-[0.2em] text-brass uppercase">
                  {INVITE_STATUS_LABELS[status]}
                </h2>
                <ul className="mt-3 divide-y divide-brass/15 rounded-2xl bg-paper shadow-lg shadow-black/20">
                  {grouped[status].map((invite) => (
                    <li key={invite.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg text-ink">{invite.workspace.name}</p>
                        <p className="truncate text-sm text-ink/60">
                          Invited by {invite.invitedBy.name} · {formatDate(invite.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 font-mono text-[11px] tracking-wide uppercase ${STATUS_BADGE_CLASSES[invite.status]}`}
                      >
                        {INVITE_STATUS_LABELS[invite.status]}
                      </span>
                      {invite.status === 'PENDING' && (
                        <div className="flex shrink-0 items-center gap-3 font-mono text-xs tracking-wide uppercase">
                          <button
                            type="button"
                            disabled={acceptInvite.isPending}
                            onClick={() => void acceptInvite.mutateAsync(invite.id)}
                            className="text-brass-deep transition-colors hover:text-brass disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {acceptInvite.isPending && acceptInvite.variables === invite.id ? (
                              <Spinner size="sm" />
                            ) : (
                              'Accept'
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={declineInvite.isPending}
                            onClick={() => void declineInvite.mutateAsync(invite.id)}
                            className="text-oxblood/70 transition-colors hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {declineInvite.isPending && declineInvite.variables === invite.id ? (
                              <Spinner size="sm" />
                            ) : (
                              'Decline'
                            )}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
