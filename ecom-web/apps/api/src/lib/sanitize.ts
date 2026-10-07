/**
 * Strip dangerous HTML from rich-text descriptions.
 * Allows a small safe tag set used by simple editors.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  let out = String(input);
  // Remove script/style/iframe/object and event handlers
  out = out.replace(/<\/(?:script|style|iframe|object|embed)[^>]*>/gi, "");
  out = out.replace(/<(?:script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed)>/gi, "");
  out = out.replace(/<(?:script|style|iframe|object|embed)[^>]*\/?>/gi, "");
  out = out.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(/javascript:/gi, "");
  out = out.replace(/data:text\/html/gi, "");
  return out.trim();
}

/** Normalize attribute keys: "Neck Type" → "neckType" */
export function normalizeAttributeKey(key: string): string {
  const cleaned = String(key || "")
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .replace(/[-_\s]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}
