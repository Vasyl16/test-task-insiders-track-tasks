// Opaque, base64url-encoded JSON — shared serialization mechanics for every
// keyset-paginated list's cursor (Comments, TaskHistory). Each caller still
// defines and validates its own cursor shape locally (the fields differ:
// Comments key on createdAt, TaskHistory on changedAt), this only avoids
// duplicating the encode/decode plumbing itself across both.
export function encodeCursor(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor<T>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
}
