import { HttpException } from '@nestjs/common';

const DEFAULT_MESSAGE = 'Internal server error';

// Nest's built-in ValidationPipe responds to a multi-field validation
// failure with `{ message: string[] }`, while a hand-thrown exception
// (`throw new BadRequestException('...')`) responds with a plain string —
// every caller of this (AllExceptionsFilter, WsExceptionFilter) gets back a
// single string either way, instead of two different response shapes for
// the same `message` field depending on which kind of error it was.
export function extractExceptionMessage(
  exception: HttpException,
  fallback: string = DEFAULT_MESSAGE,
): string {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }

  const message = (response as { message?: unknown }).message;
  if (typeof message === 'string') {
    return message;
  }
  if (
    Array.isArray(message) &&
    message.every((entry) => typeof entry === 'string')
  ) {
    return message.join('; ');
  }

  return fallback;
}
