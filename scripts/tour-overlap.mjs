/**
 * Runs inside the page. A tour card or ring fails when it cuts through a
 * visible text line or button: the two boxes meet, and the cover does not
 * contain the whole item. Fully clear and fully covered both pass.
 */
export function collectOverlaps() {
  const slack = 2;
  function boxOf(rect) {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  function cuts(cover, item) {
    const coverRight = cover.x + cover.width;
    const coverBottom = cover.y + cover.height;
    const itemRight = item.x + item.width;
    const itemBottom = item.y + item.height;
    const misses =
      coverRight <= item.x + slack ||
      itemRight <= cover.x + slack ||
      coverBottom <= item.y + slack ||
      itemBottom <= cover.y + slack;
    if (misses) return false;
    const contains =
      cover.x <= item.x + slack &&
      cover.y <= item.y + slack &&
      coverRight >= itemRight - slack &&
      coverBottom >= itemBottom - slack;
    return !contains;
  }
  function visible(node) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return true;
  }
  const covers = [];
  const card = document.querySelector("[data-tour-card]");
  if (card instanceof HTMLElement) {
    const rect = card.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2) covers.push({ kind: "card", box: boxOf(rect) });
  }
  const ring = document.querySelector("[data-tour-ring]");
  if (ring instanceof HTMLElement) {
    const rect = ring.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2) covers.push({ kind: "ring", box: boxOf(rect) });
  }
  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const parent = node.parentElement;
    if (!(parent instanceof HTMLElement)) continue;
    if (parent.closest("[data-tour-card]")) continue;
    if (!visible(parent)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width < 2 || rect.height < 2) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;
      items.push({ kind: "text", label: text.slice(0, 80), box: boxOf(rect) });
    }
  }
  for (const button of document.querySelectorAll("button, a")) {
    if (!(button instanceof HTMLElement)) continue;
    if (button.closest("[data-tour-card]")) continue;
    if (!visible(button)) continue;
    const rect = button.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;
    const label = (button.getAttribute("aria-label") || button.textContent || button.tagName).replace(/\s+/g, " ").trim().slice(0, 80);
    items.push({ kind: "control", label, box: boxOf(rect) });
  }
  for (const tile of document.querySelectorAll("[data-tour='mood-grid'] > *, [data-tour-day]")) {
    if (!(tile instanceof HTMLElement)) continue;
    if (tile.closest("[data-tour-card]")) continue;
    if (!visible(tile)) continue;
    const rect = tile.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;
    const label = (tile.getAttribute("aria-label") || tile.textContent || "tile").replace(/\s+/g, " ").trim().slice(0, 80);
    items.push({ kind: "tile", label, box: boxOf(rect) });
  }
  const hits = [];
  for (const cover of covers) {
    for (const item of items) {
      if (!cuts(cover.box, item.box)) continue;
      hits.push({
        cover: cover.kind,
        item: item.kind,
        label: item.label,
        coverBox: {
          x: Math.round(cover.box.x),
          y: Math.round(cover.box.y),
          w: Math.round(cover.box.width),
          h: Math.round(cover.box.height),
        },
        itemBox: {
          x: Math.round(item.box.x),
          y: Math.round(item.box.y),
          w: Math.round(item.box.width),
          h: Math.round(item.box.height),
        },
      });
    }
  }
  if (card instanceof HTMLElement) {
    if (card.scrollHeight > card.clientHeight + 1) {
      const rect = card.getBoundingClientRect();
      hits.push({
        cover: "card",
        item: "clip",
        label: `card content clipped scroll ${card.scrollHeight} client ${card.clientHeight}`,
        coverBox: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        itemBox: { x: 0, y: 0, w: card.scrollHeight, h: card.clientHeight },
      });
    }
    for (const node of card.querySelectorAll("*")) {
      if (!(node instanceof HTMLElement)) continue;
      const box = node.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (style.overflowX !== "visible" || style.overflowY !== "visible") {
          const bounds = parent.getBoundingClientRect();
          const clipped =
            box.top < bounds.top - 1 ||
            box.bottom > bounds.bottom + 1 ||
            box.left < bounds.left - 1 ||
            box.right > bounds.right + 1;
          if (clipped) {
            const label = (node.textContent ?? node.tagName).replace(/\s+/g, " ").trim().slice(0, 80);
            hits.push({
              cover: "card",
              item: "clip",
              label: `clipped ${label || node.tagName}`,
              coverBox: {
                x: Math.round(bounds.x),
                y: Math.round(bounds.y),
                w: Math.round(bounds.width),
                h: Math.round(bounds.height),
              },
              itemBox: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) },
            });
            break;
          }
        }
        if (parent === card) break;
        parent = parent.parentElement;
      }
    }
  }
  return hits;
}
