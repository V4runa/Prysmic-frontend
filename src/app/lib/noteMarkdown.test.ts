import assert from "node:assert/strict";
import test from "node:test";
import {
  contractDescriptionFromNote,
  htmlToMarkdown,
  htmlToPlainText,
  noteClipboardMarkdown,
  noteClipboardText,
} from "./noteMarkdown";

const SAMPLE = [
  "<h1>Day</h1>",
  "<p>Hello <strong>bold</strong> <em>italic</em> <s>gone</s> <u>plain</u> <code>x</code></p>",
  "<ul><li><p>One</p></li><li><p>Two</p></li></ul>",
  "<ol><li><p>First</p></li></ol>",
  '<ul data-type="taskList">',
  '<li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Todo</p></div></li>',
  '<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Done</p></div></li>',
  "</ul>",
  "<blockquote><p>Quoted</p></blockquote>",
  '<p>See <a href="https://example.com">the site</a></p>',
  "<hr>",
  "<pre><code>const a = 1;</code></pre>",
].join("");

test("the walker turns TipTap HTML into Markdown", () => {
  assert.equal(
    htmlToMarkdown(SAMPLE),
    [
      "# Day",
      "",
      "Hello **bold** *italic* ~~gone~~ plain `x`",
      "",
      "- One",
      "- Two",
      "",
      "1. First",
      "",
      "- [ ] Todo",
      "- [x] Done",
      "",
      "> Quoted",
      "",
      "See [the site](https://example.com)",
      "",
      "---",
      "",
      "```",
      "const a = 1;",
      "```",
    ].join("\n")
  );
});

test("plain text keeps the same structure without Markdown markers", () => {
  assert.equal(
    htmlToPlainText(SAMPLE),
    [
      "Day",
      "",
      "Hello bold italic gone plain x",
      "",
      "• One",
      "• Two",
      "",
      "1. First",
      "",
      "[ ] Todo",
      "[x] Done",
      "",
      "Quoted",
      "",
      "See the site (https://example.com)",
      "",
      "---",
      "",
      "const a = 1;",
    ].join("\n")
  );
});

test("nested lists, hard breaks, entities, and underline-wrapped bold survive", () => {
  assert.equal(
    htmlToMarkdown(
      "<ul><li><p>Parent</p><ul><li><p>Child</p></li></ul></li></ul>"
    ),
    "- Parent\n  - Child"
  );
  assert.equal(htmlToMarkdown("<p>Line<br>Next</p>"), "Line  \nNext");
  assert.equal(htmlToPlainText("<p>Line<br>Next</p>"), "Line\nNext");
  assert.equal(htmlToMarkdown("<p>A &amp; B &lt;tag&gt;</p>"), "A & B \\<tag\\>");
  assert.equal(htmlToPlainText("<p>A &amp; B &lt;tag&gt;</p>"), "A & B <tag>");
  assert.equal(htmlToMarkdown("<p><u><strong>x</strong></u></p>"), "**x**");
  assert.equal(htmlToMarkdown("<p><s><em>z</em></s></p>"), "~~*z*~~");
  assert.equal(htmlToMarkdown("<p><code>a`b</code></p>"), "``a`b``");
  assert.equal(
    htmlToMarkdown('<ol start="3"><li><p>C</p></li></ol>'),
    "3. C"
  );
  assert.equal(
    htmlToMarkdown(
      '<ul data-type="taskList"><li data-type="taskItem"><label><input type="checkbox" checked><span></span></label><div><p>Yes</p></div></li></ul>'
    ),
    "- [x] Yes"
  );
});

test("quotes with two paragraphs and fenced code keep their shape", () => {
  assert.equal(
    htmlToMarkdown("<blockquote><p>One</p><p>Two</p></blockquote>"),
    "> One\n>\n> Two"
  );
  assert.equal(
    htmlToMarkdown('<pre><code class="language-ts">let n = 1;\n</code></pre>'),
    "```ts\nlet n = 1;\n```"
  );
});

test("legacy plain text is copied through unchanged", () => {
  const plain = "hello\n\nworld";
  assert.equal(htmlToMarkdown(plain), plain);
  assert.equal(htmlToPlainText(plain), plain);
  assert.equal(htmlToMarkdown(""), "");
  assert.equal(htmlToMarkdown(null), "");
  assert.equal(htmlToPlainText("<"), "<");
});

test("clipboard copies include the title", () => {
  assert.equal(
    noteClipboardMarkdown("Garden", "<p>Rows</p>"),
    "# Garden\n\nRows"
  );
  assert.equal(noteClipboardText("Garden", "<p>Rows</p>"), "Garden\n\nRows");
  assert.equal(noteClipboardMarkdown("  ", "<p>Rows</p>"), "Rows");
  assert.equal(
    noteClipboardMarkdown("A *b*", "<p>Hi</p>"),
    "# A \\*b\\*\n\nHi"
  );
});

test("a contract description is trimmed and cut on a word when it is long", () => {
  assert.equal(contractDescriptionFromNote("<p>  Keep this.  </p>"), "Keep this.");
  assert.equal(
    contractDescriptionFromNote("<p>One</p><p></p><p></p><p>Two</p>"),
    "One\n\nTwo"
  );
  const long = `<p>${"word ".repeat(400)}</p>`;
  const description = contractDescriptionFromNote(long);
  assert.equal(description.endsWith("…"), true);
  assert.equal(description.length < 1100, true);
  assert.equal(description.includes("word"), true);
});
