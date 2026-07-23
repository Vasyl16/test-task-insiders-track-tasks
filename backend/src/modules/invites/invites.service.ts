import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { AppConfig } from '@config/config.types';
import { escapeHtml } from '@common/utils';
import { EmailService } from '@modules/email/email.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import { InvitesRepository } from './invites.repository';

const WORKSPACE_NOT_FOUND_MESSAGE = 'Workspace not found';
const OWNER_ONLY_MESSAGE = 'Only the workspace owner can perform this action';
const NOT_A_MEMBER_MESSAGE = 'You are not a member of this workspace';
const USER_NOT_FOUND_MESSAGE = 'No user with this email was found';
const ALREADY_A_MEMBER_MESSAGE =
  'This user is already a member of the workspace';
const ALREADY_INVITED_MESSAGE =
  'This user already has a pending invite to this workspace';
const CANNOT_INVITE_SELF_MESSAGE = 'You cannot invite yourself';
const INVITE_NOT_FOUND_MESSAGE = 'Invite not found';
const NOT_YOUR_INVITE_MESSAGE = 'This invite was not sent to you';
const INVITE_ALREADY_ACTIONED_MESSAGE =
  'This invite has already been accepted or declined';

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async create(
    workspaceId: string,
    ownerId: string,
    dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    const workspace =
      await this.invitesRepository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new NotFoundException(WORKSPACE_NOT_FOUND_MESSAGE);
    }
    await this.assertOwner(workspaceId, ownerId);

    const invitedUser = await this.invitesRepository.findUserByEmail(dto.email);
    if (!invitedUser) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }
    if (invitedUser.id === ownerId) {
      throw new BadRequestException(CANNOT_INVITE_SELF_MESSAGE);
    }

    const existingMembership =
      await this.invitesRepository.findWorkspaceMembership(
        workspaceId,
        invitedUser.id,
      );
    if (existingMembership) {
      throw new ConflictException(ALREADY_A_MEMBER_MESSAGE);
    }

    const existingInvite = await this.invitesRepository.findPendingInvite(
      workspaceId,
      invitedUser.id,
    );
    if (existingInvite) {
      throw new ConflictException(ALREADY_INVITED_MESSAGE);
    }

    // findPendingInvite above is a fast, clean 409 for the common
    // sequential case, but two concurrent create() calls can both pass it
    // before either insert commits. The partial unique index on
    // (workspaceId, invitedUserId) WHERE status = 'PENDING' (see
    // schema.prisma) is what actually prevents the duplicate row — this
    // just maps that race, if it happens, to the same message the
    // pre-check already gives for the non-race case.
    const invite = await this.runCatchingUniqueConstraint(
      () =>
        this.invitesRepository.createInvite({
          workspaceId,
          invitedUserId: invitedUser.id,
          invitedById: ownerId,
        }),
      ALREADY_INVITED_MESSAGE,
    );

    // Best-effort: a misconfigured/unreachable mail transport shouldn't fail
    // invite creation itself — the invite is already real and visible on the
    // recipient's own Invites page regardless of whether the email lands.
    try {
      const inviteUrl = `${this.configService.get('corsOrigin', { infer: true })}/invites`;
      // invitedBy.name and workspace.name are both user-supplied (set at
      // registration / workspace creation) — escaped here since they're
      // interpolated straight into an HTML email body, the one place in the
      // app that isn't a React render (which already escapes automatically).
      const inviterName = escapeHtml(invite.invitedBy.name);
      const workspaceName = escapeHtml(invite.workspace.name);
      await this.emailService.sendEmail(
        invitedUser.email,
        `You've been invited to "${invite.workspace.name}"`,
        `<p>${inviterName} invited you to join the workspace <strong>${workspaceName}</strong>.</p>
         <p><a href="${inviteUrl}">View your invites</a></p>`,
        `${invite.invitedBy.name} invited you to join the workspace "${invite.workspace.name}". View your invites: ${inviteUrl}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send invite email to ${invitedUser.email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return new InviteResponseDto(invite);
  }

  async findAllForUser(userId: string): Promise<InviteResponseDto[]> {
    const invites = await this.invitesRepository.findManyForUser(userId);
    return invites.map((invite) => new InviteResponseDto(invite));
  }

  async accept(id: string, userId: string): Promise<InviteResponseDto> {
    const invite = await this.getInviteOrThrow(id);
    this.assertRecipient(invite, userId);
    this.assertPending(invite); // fast, clean 409 for the common sequential case

    // The only insert inside accept()'s transaction is workspaceMember.create,
    // so a P2002 here can only mean the membership already exists — two
    // separate pending invites for the same person, both accepted at once
    // (see invites.repository.ts's accept() for the full account).
    const updated = await this.runCatchingUniqueConstraint(
      () => this.invitesRepository.accept(id, invite.workspaceId, userId),
      ALREADY_A_MEMBER_MESSAGE,
    );
    if (!updated) {
      // Lost the race between assertPending above and the DB transition —
      // someone else accepted/declined this exact invite in that window.
      throw new ConflictException(INVITE_ALREADY_ACTIONED_MESSAGE);
    }

    return new InviteResponseDto(updated);
  }

  async decline(id: string, userId: string): Promise<InviteResponseDto> {
    const invite = await this.getInviteOrThrow(id);
    this.assertRecipient(invite, userId);
    this.assertPending(invite);

    const updated = await this.invitesRepository.decline(id);
    if (!updated) {
      throw new ConflictException(INVITE_ALREADY_ACTIONED_MESSAGE);
    }

    return new InviteResponseDto(updated);
  }

  // Runs a Prisma call, translating a unique-constraint violation (P2002)
  // into a 409 with a caller-chosen, context-appropriate message instead of
  // letting it bubble up as a raw Prisma error. Any other error passes
  // through untouched. Used at every write that races against a DB-level
  // uniqueness invariant (the partial unique index on pending invites, and
  // WorkspaceMember's own @@unique) rather than duplicating the same
  // instanceof check at each call site.
  private async runCatchingUniqueConstraint<T>(
    operation: () => Promise<T>,
    conflictMessage: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(conflictMessage);
      }
      throw error;
    }
  }

  private async getInviteOrThrow(id: string) {
    const invite = await this.invitesRepository.findById(id);
    if (!invite) {
      throw new NotFoundException(INVITE_NOT_FOUND_MESSAGE);
    }
    return invite;
  }

  private assertRecipient(
    invite: { invitedUserId: string },
    userId: string,
  ): void {
    if (invite.invitedUserId !== userId) {
      throw new ForbiddenException(NOT_YOUR_INVITE_MESSAGE);
    }
  }

  private assertPending(invite: { status: string }): void {
    if (invite.status !== 'PENDING') {
      throw new ConflictException(INVITE_ALREADY_ACTIONED_MESSAGE);
    }
  }

  private async assertOwner(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.invitesRepository.findWorkspaceMembership(
      workspaceId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException(NOT_A_MEMBER_MESSAGE);
    }
    if (membership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException(OWNER_ONLY_MESSAGE);
    }
  }
}
