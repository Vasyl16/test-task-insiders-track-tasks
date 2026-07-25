import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({
    description:
      'Email of the user to invite. Must belong to an already-registered ' +
      'account — invites are resolved to a User by this email, so a ' +
      'non-existent email returns 404 rather than creating a pending, ' +
      'not-yet-claimable invite (see InvitesService.create for why).',
  })
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
