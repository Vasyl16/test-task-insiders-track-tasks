import { createHash } from 'crypto';

// Turns a list endpoint's query params (page/limit/search/sort/...) into a
// short, stable cache-key segment - a plain JSON.stringify would work for
// exactness but can get arbitrarily long (e.g. a long `search` term), so
// this hashes it instead. Key order doesn't matter: callers pass params
// objects built the same way every time (spread from a DTO), so
// JSON.stringify's own insertion-order is already consistent per call site.
export function hashParams(params: Record<string, unknown>): string {
  return createHash('sha1').update(JSON.stringify(params)).digest('hex');
}
