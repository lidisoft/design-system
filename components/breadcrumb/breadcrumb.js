/* Behaviour for <lds-breadcrumb>.
 *
 * When the trail overflows, middle items get data-overflow and an ellipsis
 * control appears between the first and last items. expanded shows everything.
 */

const state = new WeakMap();

LDS.behavior("lds-breadcrumb", {
  connected(el) {
    const overflow = el.$(".overflow");

    syncLabel(el);
    syncOverflowA11y(el, overflow);

    const onOverflow = () => setExpanded(el, true);
    overflow.addEventListener("click", onOverflow);

    const slot = el.$("slot");
    const onSlot = () => scheduleMeasure(el);
    slot.addEventListener("slotchange", onSlot);

    const ro = new ResizeObserver(() => scheduleMeasure(el));
    ro.observe(el);

    state.set(el, { onOverflow, onSlot, ro, raf: 0 });
    scheduleMeasure(el);
  },

  disconnected(el) {
    const s = state.get(el);
    if (!s) return;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.ro.disconnect();
    state.delete(el);
  },

  attributeChanged(el, name) {
    const overflow = el.$(".overflow");
    if (!overflow) return;

    if (name === "label") syncLabel(el);
    if (name === "expanded") {
      syncOverflowA11y(el, overflow);
      scheduleMeasure(el);
    }
  },
});

function itemsOf(el) {
  const slot = el.$("slot");
  if (!slot) return [];
  return slot.assignedElements({ flatten: true }).filter(function (node) {
    return node.tagName === "LDS-BREADCRUMB-ITEM";
  });
}

function scheduleMeasure(el) {
  const s = state.get(el);
  if (!s) return;
  if (s.raf) cancelAnimationFrame(s.raf);
  s.raf = requestAnimationFrame(function () {
    s.raf = 0;
    measure(el);
  });
}

function measure(el) {
  const items = itemsOf(el);
  const overflow = el.$(".overflow");
  if (!overflow) return;

  /* Reset so we measure the full trail. */
  items.forEach(function (item) {
    item.removeAttribute("data-overflow");
  });
  el.removeAttribute("data-collapsed");

  if (el.boolAttr("expanded") || items.length <= 2) {
    overflow.hidden = true;
    syncOverflowA11y(el, overflow);
    return;
  }

  /* If everything fits, stay expanded visually with no overflow control. */
  if (el.scrollWidth <= el.clientWidth + 1) {
    overflow.hidden = true;
    syncOverflowA11y(el, overflow);
    return;
  }

  /* Collapse the middle: keep first + last (and last-1 if max-items allows). */
  const keepTail = Math.max(1, parseInt(el.getAttribute("max-items") || "1", 10) || 1);
  const lastKept = Math.max(1, items.length - keepTail);

  for (let i = 1; i < lastKept; i++) {
    items[i].setAttribute("data-overflow", "");
  }

  el.setAttribute("data-collapsed", "");
  overflow.hidden = false;
  syncOverflowA11y(el, overflow);

  /* If still overflowing with only ends visible, drop extra tail items. */
  if (el.scrollWidth > el.clientWidth + 1 && keepTail > 1) {
    for (let i = items.length - keepTail; i < items.length - 1; i++) {
      if (i > 0) items[i].setAttribute("data-overflow", "");
    }
  }
}

function setExpanded(el, expanded) {
  if (el.boolAttr("expanded") === expanded) return;

  const event = el.emit("lds-expand", { expanded: expanded });
  if (event.defaultPrevented) return;

  el.toggleAttribute("expanded", expanded);
}

function syncLabel(el) {
  el.setAttribute("aria-label", el.getAttribute("label") || "Breadcrumb");
}

function syncOverflowA11y(el, overflow) {
  overflow.setAttribute("aria-expanded", el.boolAttr("expanded") ? "true" : "false");
  overflow.setAttribute("aria-label", "Show more path");
}
