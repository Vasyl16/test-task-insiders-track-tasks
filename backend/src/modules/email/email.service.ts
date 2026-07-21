import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfig } from '@config/config.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly fromEmail: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    const { from, token } = configService.get('email', { infer: true });
    this.fromEmail = from;

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: from,
        pass: token,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
        text: text ?? '',
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
