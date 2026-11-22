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
  function misses(a, b) {
    return a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1 || a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1;
  }
  function roundBox(box) {
    return { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) };
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
      items.push({ kind: "text", label: text.slice(0, 80), box: boxOf(rect), node: parent });
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
    items.push({ kind: "control", label, box: boxOf(rect), node: button });
  }
  for (const tile of document.querySelectorAll("[data-tour='mood-grid'] > *, [data-tour-day]")) {
    if (!(tile instanceof HTMLElement)) continue;
    if (tile.closest("[data-tour-card]")) continue;
    if (!visible(tile)) continue;
    const rect = tile.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;
    const label = (tile.getAttribute("aria-label") || tile.textContent || "tile").replace(/\s+/g, " ").trim().slice(0, 80);
    items.push({ kind: "tile", label, box: boxOf(rect), node: tile });
  }
  const hits = [];
  const nav = document.querySelector(".app-bottom-nav");
  const navBox =
    nav instanceof HTMLElement && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect() : null;
  const cardIsSheet =
    card instanceof HTMLElement &&
    navBox != null &&
    Math.abs(card.getBoundingClientRect().bottom - navBox.top) < 24;
  for (const cover of covers) {
    if (cover.kind === "card" && cardIsSheet) continue;
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
  if (ring instanceof HTMLElement) {
    const ringBox = ring.getBoundingClientRect();
    const tourRoot = ring.parentElement;
    const obstacles = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement)) continue;
      if (tourRoot && tourRoot.contains(el)) continue;
      if (el.closest("[data-tour-card]") || el.hasAttribute("data-tour-ring")) continue;
      const style = getComputedStyle(el);
      if (style.position !== "fixed" && style.position !== "sticky") continue;
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > window.innerWidth * 0.85 && rect.height > window.innerHeight * 0.6) continue;
      const z = Number(style.zIndex);
      if (Number.isFinite(z) && z < 0) continue;
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
      obstacles.push({ label: (el.getAttribute("aria-label") || el.className || el.tagName).toString().replace(/\s+/g, " ").trim().slice(0, 60), box: boxOf(rect) });
    }
    function clippedByScroll(node, box) {
      let parent = node instanceof HTMLElement ? node.parentElement : null;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        const oy = style.overflowY;
        const ox = style.overflowX;
        const scrollY = oy === "auto" || oy === "scroll" || (oy === "hidden" && parent.scrollHeight > parent.clientHeight + 1);
        const scrollX = ox === "auto" || ox === "scroll" || (ox === "hidden" && parent.scrollWidth > parent.clientWidth + 1);
        if (scrollY || scrollX) {
          const bounds = parent.getBoundingClientRect();
          const top = box.y;
          const bottom = box.y + box.height;
          const left = box.x;
          const right = box.x + box.width;
          if (top < bounds.top - 1 || bottom > bounds.bottom + 1 || left < bounds.left - 1 || right > bounds.right + 1) {
            return true;
          }
        }
        parent = parent.parentElement;
      }
      return false;
    }
    for (const obstacle of obstacles) {
      if (misses(boxOf(ringBox), obstacle.box)) continue;
      hits.push({
        cover: "ring",
        item: "sticky",
        label: `ring crosses ${obstacle.label}`,
        coverBox: roundBox(boxOf(ringBox)),
        itemBox: roundBox(obstacle.box),
      });
    }
    for (const item of items) {
      if (misses(boxOf(ringBox), item.box)) continue;
      const node = item.node;
      if (node instanceof HTMLElement && clippedByScroll(node, item.box)) {
        hits.push({
          cover: "ring",
          item: "clip",
          label: `ringed ${item.label} is clipped by scroll`,
          coverBox: roundBox(boxOf(ringBox)),
          itemBox: roundBox(item.box),
        });
      }
      for (const obstacle of obstacles) {
        if (misses(item.box, obstacle.box)) continue;
        hits.push({
          cover: "ring",
          item: "sticky",
          label: `${item.label} sits under ${obstacle.label}`,
          coverBox: roundBox(item.box),
          itemBox: roundBox(obstacle.box),
        });
      }
    }
  }
  if (card instanceof HTMLElement) {
    const style = getComputedStyle(card);
    const box = card.getBoundingClientRect();
    const pad =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0) +
      (Number.parseFloat(style.borderTopWidth) || 0) +
      (Number.parseFloat(style.borderBottomWidth) || 0);
    const measure = card.querySelector("[data-tour-measure]");
    const root = measure instanceof HTMLElement ? measure : card;
    let children = 0;
    for (const child of root.children) {
      if (!(child instanceof HTMLElement)) continue;
      const rect = child.getBoundingClientRect();
      const childStyle = getComputedStyle(child);
      children += rect.height + (Number.parseFloat(childStyle.marginTop) || 0) + (Number.parseFloat(childStyle.marginBottom) || 0);
    }
    const expected = children + pad;
    if (children > 0 && box.height > expected + 4) {
      hits.push({
        cover: "card",
        item: "stretch",
        label: `card is ${Math.round(box.height - expected)}px taller than its content`,
        coverBox: roundBox(boxOf(box)),
        itemBox: { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(expected) },
      });
    }
  }
  if (ring instanceof HTMLElement) {
    const ringBox = boxOf(ring.getBoundingClientRect());
    const tourRoot = ring.parentElement;
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement)) continue;
      if (tourRoot && tourRoot.contains(el)) continue;
      if (el.contains(ring)) continue;
      if (el.querySelector("[data-tour], [data-tour-day]")) continue;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) continue;
      if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.7) continue;
      const item = boxOf(rect);
      if (misses(ringBox, item)) continue;
      const containsRing =
        item.x <= ringBox.x + 2 &&
        item.y <= ringBox.y + 2 &&
        item.x + item.width >= ringBox.x + ringBox.width - 2 &&
        item.y + item.height >= ringBox.y + ringBox.height - 2;
      if (containsRing) continue;
      const ringContains =
        ringBox.x <= item.x + 2 &&
        ringBox.y <= item.y + 2 &&
        ringBox.x + ringBox.width >= item.x + item.width - 2 &&
        ringBox.y + ringBox.height >= item.y + item.height - 2;
      if (ringContains) continue;
      const label = (el.getAttribute("aria-label") || el.textContent || el.tagName).replace(/\s+/g, " ").trim().slice(0, 80);
      hits.push({
        cover: "ring",
        item: "cut",
        label: `ring cuts ${label || el.tagName}`,
        coverBox: roundBox(ringBox),
        itemBox: roundBox(item),
      });
    }
  }
  return hits;
}
