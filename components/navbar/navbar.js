/* Behaviour for <lds-navbar>.
 *
 * Compact mode is either forced with the `compact` attribute or inferred from
 * host width vs --lds-navbar-compact-at. The toggle expands an inline links
 * panel under the bar — not a modal, so there is no focus trap.
 */

const state = new WeakMap();

LDS.behavior("lds-navbar", {
  connected(el) {
    const toggle = el.$(".toggle");

    syncLabel(el, toggle);
    syncExpanded(el, toggle);

    const onToggle = () => setOpen(el, !el.boolAttr("open"));
    toggle.addEventListener("click", onToggle);

    const onKeydown = (event) => {
      if (event.key === "Escape" && el.boolAttr("open") && isCompact(el)) {
        setOpen(el, false);
      }
    };

    const onPointerDown = (event) => {
      if (!el.boolAttr("open") || !isCompact(el)) return;
      if (event.composedPath().includes(el)) return;
      setOpen(el, false);
    };

    document.addEventListener("keydown", onKeydown);
    document.addEventListener("pointerdown", onPointerDown, true);

    const ro = new ResizeObserver(() => updateCompact(el));
    ro.observe(el);
    updateCompact(el);

    state.set(el, { onToggle, onKeydown, onPointerDown, ro });
  },

  disconnected(el) {
    const s = state.get(el);
    if (!s) return;

    document.removeEventListener("keydown", s.onKeydown);
    document.removeEventListener("pointerdown", s.onPointerDown, true);
    s.ro.disconnect();
    state.delete(el);
  },

  attributeChanged(el, name) {
    const toggle = el.$(".toggle");
    if (!toggle) return;

    if (name === "label") syncLabel(el, toggle);
    if (name === "open") syncExpanded(el, toggle);
    if (name === "compact") updateCompact(el);
  },
});

function isCompact(el) {
  return el.boolAttr("compact") || el.hasAttribute("data-compact");
}

function compactAt(el) {
  const raw = getComputedStyle(el).getPropertyValue("--lds-navbar-compact-at").trim();
  const px = parseFloat(raw);
  return Number.isFinite(px) ? px : 768;
}

function updateCompact(el) {
  if (el.boolAttr("compact")) {
    el.removeAttribute("data-compact");
    return;
  }

  const should = el.clientWidth > 0 && el.clientWidth < compactAt(el);
  const was = el.hasAttribute("data-compact");
  el.toggleAttribute("data-compact", should);

  if (was && !should && el.boolAttr("open")) {
    el.removeAttribute("open");
  }
}

function setOpen(el, open) {
  if (el.boolAttr("open") === open) return;

  const event = el.emit("lds-toggle", { open: open });
  if (event.defaultPrevented) return;

  el.toggleAttribute("open", open);
}

function syncLabel(el, toggle) {
  toggle.setAttribute("aria-label", el.getAttribute("label") || "Menu");
}

function syncExpanded(el, toggle) {
  toggle.setAttribute("aria-expanded", el.boolAttr("open") ? "true" : "false");
}
