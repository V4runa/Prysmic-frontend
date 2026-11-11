/**
 * Turn a note body into Markdown or plain text.
 *
 * Notes are stored as TipTap HTML (or, for older notes, plain text). The
 * walker covers the nodes the editor actually emits: h1–h3, paragraphs,
 * bold, italic, strike, underline (kept as plain text), inline code, code
 * blocks, bullet and numbered lists, task lists, quotes, links, and rules.
 */

import { isHtmlContent } from "./noteContent";

export type NoteTextFormat = "markdown" | "text";

interface ElNode {
  type: "el";
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
}

interface TextNode {
  type: "text";
  text: string;
}

type HtmlNode = ElNode | TextNode;

interface Block {
  kind: "p" | "el";
  el?: ElNode;
  children?: HtmlNode[];
}

const VOID_TAGS = new Set([
  "br",
  "hr",
  "img",
  "input",
  "meta",
  "link",
  "source",
  "wbr",
  "col",
]);

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "blockquote",
  "pre",
  "hr",
  "section",
  "article",
]);

const ATTR_RE = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
const NAMED_ENTITY_RE = /&(?:nbsp|amp|lt|gt|quot|apos|#39);/gi;
const DEC_ENTITY_RE = /&#(\d+);/g;
const HEX_ENTITY_RE = /&#x([0-9a-f]+);/gi;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

function decodeEntities(value: string): string {
  const withNumeric = value
    .replace(HEX_ENTITY_RE, (_, hex: string) =>
      safeCodePoint(Number.parseInt(hex, 16))
    )
    .replace(DEC_ENTITY_RE, (_, dec: string) =>
      safeCodePoint(Number.parseInt(dec, 10))
    );
  return withNumeric.replace(NAMED_ENTITY_RE, (entity) => {
    const name = entity.slice(1, -1).toLowerCase();
    return NAMED_ENTITIES[name] ?? entity;
  });
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(source))) {
    const name = match[1].toLowerCase();
    if (name.startsWith("/") || name === "") continue;
    const raw = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = decodeEntities(raw);
  }
  return attrs;
}

function parseHtml(html: string): HtmlNode[] {
  const roots: HtmlNode[] = [];
  const stack: ElNode[] = [];
  let index = 0;

  const current = (): HtmlNode[] =>
    stack.length > 0 ? stack[stack.length - 1].children : roots;

  while (index < html.length) {
    if (html[index] !== "<") {
      const next = html.indexOf("<", index);
      const raw = html.slice(index, next === -1 ? html.length : next);
      if (raw) current().push({ type: "text", text: decodeEntities(raw) });
      index = next === -1 ? html.length : next;
      continue;
    }

    if (html.startsWith("<!--", index)) {
      const end = html.indexOf("-->", index + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }

    if (html.startsWith("</", index)) {
      const end = html.indexOf(">", index + 2);
      if (end === -1) break;
      const tag = html
        .slice(index + 2, end)
        .trim()
        .toLowerCase()
        .split(/\s/)[0];
      index = end + 1;
      for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
        const popped = stack.pop();
        if (popped?.tag === tag) break;
      }
      continue;
    }

    const end = html.indexOf(">", index + 1);
    if (end === -1) {
      current().push({ type: "text", text: decodeEntities(html.slice(index)) });
      break;
    }

    let rawTag = html.slice(index + 1, end).trim();
    const selfClosing = rawTag.endsWith("/");
    if (selfClosing) rawTag = rawTag.slice(0, -1).trim();
    const splitAt = rawTag.search(/\s/);
    const tag = (splitAt === -1 ? rawTag : rawTag.slice(0, splitAt)).toLowerCase();
    if (!/^[a-z][\w:-]*$/.test(tag)) {
      current().push({ type: "text", text: "<" });
      index += 1;
      continue;
    }

    const el: ElNode = {
      type: "el",
      tag,
      attrs: parseAttrs(splitAt === -1 ? "" : rawTag.slice(splitAt)),
      children: [],
    };
    current().push(el);
    index = end + 1;
    if (!selfClosing && !VOID_TAGS.has(tag)) stack.push(el);
  }

  return roots;
}

function isEl(node: HtmlNode): node is ElNode {
  return node.type === "el";
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}[\]<>])/g, "\\$1");
}

function escapeLeadingMarker(text: string): string {
  return text.replace(/^(#{1,6}\s|[-+>]\s|\d+\.\s)/, "\\$1");
}

function inlineText(text: string, format: NoteTextFormat): string {
  return format === "markdown" ? escapeMarkdown(text) : text;
}

function wrapMarker(marker: string, value: string): string {
  const core = value.trim();
  if (!core) return value;
  const lead = value.slice(0, value.indexOf(core));
  const trail = value.slice(lead.length + core.length);
  return `${lead}${marker}${core}${marker}${trail}`;
}

function textOf(node: HtmlNode): string {
  if (node.type === "text") return node.text;
  if (node.tag === "br") return "\n";
  return node.children.map(textOf).join("");
}

function isTaskList(el: ElNode): boolean {
  return el.attrs["data-type"] === "taskList";
}

function isChecked(li: ElNode): boolean {
  const flag = (li.attrs["data-checked"] ?? "").toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return hasCheckedInput(li);
}

function hasCheckedInput(node: HtmlNode): boolean {
  if (!isEl(node)) return false;
  if (node.tag === "input") {
    return "checked" in node.attrs && node.attrs.checked !== "false";
  }
  return node.children.some(hasCheckedInput);
}

function itemNodes(li: ElNode, task: boolean): HtmlNode[] {
  const visible = li.children.filter(
    (node) => !(isEl(node) && (node.tag === "label" || node.tag === "input"))
  );
  if (!task) return visible;
  const content = visible.find((node) => isEl(node) && node.tag === "div");
  if (content && isEl(content)) {
    const rest = visible.filter((node) => node !== content);
    return [...content.children, ...rest];
  }
  return visible;
}

function renderInline(nodes: HtmlNode[], format: NoteTextFormat): string {
  return nodes.map((node) => renderInlineNode(node, format)).join("");
}

function renderInlineNode(node: HtmlNode, format: NoteTextFormat): string {
  if (node.type === "text") return inlineText(node.text, format);
  if (node.tag === "br") return format === "markdown" ? "  \n" : "\n";
  if (node.tag === "label" || node.tag === "input" || node.tag === "img") return "";

  if (node.tag === "strong" || node.tag === "b") {
    const inner = renderInline(node.children, format);
    return format === "markdown" ? wrapMarker("**", inner) : inner;
  }
  if (node.tag === "em" || node.tag === "i") {
    const inner = renderInline(node.children, format);
    return format === "markdown" ? wrapMarker("*", inner) : inner;
  }
  if (node.tag === "s" || node.tag === "strike" || node.tag === "del") {
    const inner = renderInline(node.children, format);
    return format === "markdown" ? wrapMarker("~~", inner) : inner;
  }
  if (node.tag === "u") return renderInline(node.children, format);
  if (node.tag === "code") return renderInlineCode(textOf(node), format);
  if (node.tag === "a") return renderLink(node, format);
  if (BLOCK_TAGS.has(node.tag)) return renderBlock(node, format);

  return renderInline(node.children, format);
}

function renderInlineCode(code: string, format: NoteTextFormat): string {
  if (!code) return "";
  if (format === "text") return code;
  const fence = "`".repeat(Math.max(1, longestRun(code, "`") + 1));
  const spaced = code.startsWith("`") || code.endsWith("`") ? ` ${code} ` : code;
  return `${fence}${spaced}${fence}`;
}

function longestRun(value: string, char: string): number {
  let best = 0;
  let run = 0;
  for (const unit of value) {
    if (unit === char) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function renderLink(node: ElNode, format: NoteTextFormat): string {
  const href = (node.attrs.href ?? "").trim();
  const label = renderInline(node.children, format).trim() || href;
  if (!href) return label;
  if (format === "text") {
    return label === href ? href : `${label} (${href})`;
  }
  const safeHref = href.replace(/[()]/g, (char) =>
    char === "(" ? "%28" : "%29"
  );
  return `[${label}](${safeHref})`;
}

function groupBlocks(nodes: HtmlNode[]): Block[] {
  const blocks: Block[] = [];
  let inline: HtmlNode[] = [];

  const flush = () => {
    if (inline.length === 0) return;
    if (inline.some((node) => node.type === "text" ? node.text.trim() : true)) {
      blocks.push({ kind: "p", children: inline });
    }
    inline = [];
  };

  for (const node of nodes) {
    if (isEl(node) && BLOCK_TAGS.has(node.tag)) {
      flush();
      blocks.push({ kind: "el", el: node });
      continue;
    }
    inline.push(node);
  }
  flush();
  return blocks;
}

function renderBlock(node: ElNode | Block, format: NoteTextFormat): string {
  if (!("type" in node) && node.kind === "p") {
    const text = renderInline(node.children ?? [], format).trim();
    return format === "markdown" ? escapeLeadingMarker(text) : text;
  }
  const el = "type" in node ? node : node.el;
  if (!el) return "";
  return renderElement(el, format);
}

function renderElement(el: ElNode, format: NoteTextFormat): string {
  if (/^h[1-6]$/.test(el.tag)) {
    const text = renderInline(el.children, format).trim();
    if (!text) return "";
    if (format === "text") return text;
    const level = Number(el.tag[1]);
    return `${"#".repeat(level)} ${escapeLeadingMarker(text)}`;
  }
  if (el.tag === "p") {
    const text = renderInline(el.children, format).trim();
    return format === "markdown" ? escapeLeadingMarker(text) : text;
  }
  if (el.tag === "ul" || el.tag === "ol") return renderList(el, format, 0);
  if (el.tag === "blockquote") return renderQuote(el, format);
  if (el.tag === "pre") return renderPre(el, format);
  if (el.tag === "hr") return "---";
  if (el.tag === "div" || el.tag === "section" || el.tag === "article") {
    return renderNodes(el.children, format);
  }
  return renderInline(el.children, format).trim();
}

function renderQuote(el: ElNode, format: NoteTextFormat): string {
  const inner = renderNodes(el.children, format);
  if (!inner) return "";
  if (format === "text") return inner;
  return inner
    .split("\n")
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");
}

function renderPre(el: ElNode, format: NoteTextFormat): string {
  const code = el.children.find((node) => isEl(node) && node.tag === "code");
  const source = (code ? textOf(code) : textOf(el)).replace(/\n$/, "");
  if (format === "text") return source;
  const className = code && isEl(code) ? code.attrs.class ?? "" : "";
  const language = /language-([\w+-]+)/.exec(className)?.[1] ?? "";
  const fence = source.includes("```") ? "~~~~" : "```";
  return `${fence}${language}\n${source}\n${fence}`;
}

function renderList(el: ElNode, format: NoteTextFormat, depth: number): string {
  const task = isTaskList(el);
  const ordered = el.tag === "ol" && !task;
  const start = positiveInt(el.attrs.start) ?? 1;
  const items = el.children.filter(
    (node): node is ElNode => isEl(node) && node.tag === "li"
  );
  return items
    .map((item, index) =>
      renderListItem(item, {
        format,
        depth,
        task,
        ordered,
        number: start + index,
      })
    )
    .filter(Boolean)
    .join("\n");
}

function positiveInt(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

function renderListItem(
  li: ElNode,
  options: {
    format: NoteTextFormat;
    depth: number;
    task: boolean;
    ordered: boolean;
    number: number;
  }
): string {
  const { format, depth, task, ordered, number } = options;
  const checked = task && isChecked(li);
  const marker = task
    ? format === "markdown"
      ? `- [${checked ? "x" : " "}] `
      : `[${checked ? "x" : " "}] `
    : ordered
      ? `${number}. `
      : format === "markdown"
        ? "- "
        : "• ";
  const pad = " ".repeat(depth * 2);
  const blocks = groupBlocks(itemNodes(li, task));
  if (blocks.length === 0) return `${pad}${marker.trimEnd()}`;

  const firstIsList =
    blocks[0].kind === "el" &&
    (blocks[0].el?.tag === "ul" || blocks[0].el?.tag === "ol");
  const first = blocks[0].kind === "el" && blocks[0].el
    ? blocks[0].el.tag === "ul" || blocks[0].el.tag === "ol"
      ? renderList(blocks[0].el, format, 0)
      : renderElement(blocks[0].el, format)
    : renderBlock(blocks[0], format);

  const lines = (first || "").split("\n");
  const head = firstIsList
    ? `${pad}${marker.trimEnd()}\n${indent(first, depth * 2 + 2)}`
    : `${pad}${marker}${lines[0] ?? ""}`;
  const continuation = firstIsList
    ? []
    : lines.slice(1).map((line) =>
        line ? `${pad}${" ".repeat(marker.length)}${line}` : line
      );

  const tail: string[] = [];
  for (const block of blocks.slice(1)) {
    const el = block.kind === "el" ? block.el : undefined;
    const chunk = el
      ? el.tag === "ul" || el.tag === "ol"
        ? renderList(el, format, 0)
        : renderElement(el, format)
      : renderBlock(block, format);
    if (!chunk) continue;
    const gap = el && (el.tag === "ul" || el.tag === "ol") ? "\n" : "\n\n";
    tail.push(`${gap}${indent(chunk, depth * 2 + 2)}`);
  }

  return [head, ...continuation].join("\n") + tail.join("");
}

function indent(value: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
}

function renderNodes(nodes: HtmlNode[], format: NoteTextFormat): string {
  const parts = groupBlocks(nodes)
    .map((block) => {
      if (block.kind === "el" && block.el) {
        if (block.el.tag === "ul" || block.el.tag === "ol") {
          return renderList(block.el, format, 0);
        }
        return renderElement(block.el, format);
      }
      return renderBlock(block, format);
    })
    .filter((part) => part.trim().length > 0);
  return parts.join("\n\n").trim();
}

function plainDocument(content: string): string {
  return content.replace(/\r\n/g, "\n").trim();
}

/** Markdown for a TipTap (or legacy plain-text) note body. */
export function htmlToMarkdown(content: string | null | undefined): string {
  if (!content) return "";
  if (!isHtmlContent(content)) return plainDocument(content);
  return renderNodes(parseHtml(content), "markdown");
}

/** Readable plain text, with paragraphs and list lines kept apart. */
export function htmlToPlainText(content: string | null | undefined): string {
  if (!content) return "";
  if (!isHtmlContent(content)) return plainDocument(content);
  return renderNodes(parseHtml(content), "text");
}

/** Clipboard text: the title, then the body. */
export function noteClipboardText(
  title: string | null | undefined,
  content: string | null | undefined
): string {
  return joinTitle(title, htmlToPlainText(content));
}

/** Clipboard Markdown: the title as a heading, then the body. */
export function noteClipboardMarkdown(
  title: string | null | undefined,
  content: string | null | undefined
): string {
  const body = htmlToMarkdown(content);
  const name = collapseTitle(title);
  if (!name) return body;
  const heading = `# ${escapeMarkdown(name)}`;
  return body ? `${heading}\n\n${body}` : heading;
}

function collapseTitle(title: string | null | undefined): string {
  return (title ?? "").replace(/\s+/g, " ").trim();
}

function joinTitle(title: string | null | undefined, body: string): string {
  const name = collapseTitle(title);
  if (!name) return body;
  return body ? `${name}\n\n${body}` : name;
}

const CONTRACT_DESCRIPTION_LIMIT = 1000;

/**
 * Plain text for a contract's description field. Ends are trimmed, extra blank
 * lines collapse, and a very long note is cut on a space or line break.
 */
export function contractDescriptionFromNote(
  content: string | null | undefined
): string {
  const text = htmlToPlainText(content).replace(/\n{3,}/g, "\n\n").trim();
  if (text.length <= CONTRACT_DESCRIPTION_LIMIT) return text;
  const slice = text.slice(0, CONTRACT_DESCRIPTION_LIMIT);
  const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
  const cut = (breakAt > CONTRACT_DESCRIPTION_LIMIT * 0.6
    ? slice.slice(0, breakAt)
    : slice
  ).trimEnd();
  return `${cut}…`;
}
