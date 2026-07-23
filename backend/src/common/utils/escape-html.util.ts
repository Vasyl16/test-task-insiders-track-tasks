const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Any value interpolated into an HTML email body must go through this first
// if it can originate from a user (a display name, a workspace name, ...) —
// nothing upstream sanitizes those fields, since they're perfectly valid
// plain text everywhere else they're shown (React already escapes on render).
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
