/**
 * Note content helpers.
 *
 * Notes are authored in a WYSIWYG editor and stored as HTML. Older notes were
 * saved as plain text; these helpers keep both working:
 *  - `normalizeNoteHtml` feeds either format into the editor (plain text is
 *    converted to paragraphs so line breaks survive).
 *  - `noteHtmlToText` strips markup for plain-text surfaces (card previews).
 */

const HTML_TAG_RE =
  /<(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|br|hr|strong|em|b|i|u|a|code|span|table)\b[^>]*>/i;

export function isHtmlContent(value: string): boolean {
  return HTML_TAG_RE.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Returns HTML suitable for the editor, converting legacy plain text. */
export function normalizeNoteHtml(content: string | null | undefined): string {
  if (!content) return "";
  if (isHtmlContent(content)) return content;

  const blocks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Best-effort plain-text extraction for previews. Works on HTML or plain text. */
export function noteHtmlToText(content: string | null | undefined): string {
  if (!content) return "";
  if (!isHtmlContent(content)) return content.trim();

  return content
    .replace(/<(?:style|script)[\s\S]*?<\/(?:style|script)>/gi, "")
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|tr)>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the editor content has no meaningful text or media. */
export function isNoteContentEmpty(content: string | null | undefined): boolean {
  if (!content) return true;
  const stripped = content.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, "").trim();
  if (stripped.length > 0) return false;
  // Keep notes that contain embedded media even without text.
  return !/<(img|table|hr|input)\b/i.test(content);
}
