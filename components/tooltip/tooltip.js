/* Behaviour for <lds-tooltip>.
 *
 * Shows a hint for the slotted trigger after a hover delay, or at once when the
 * trigger takes keyboard focus. Meets WCAG 1.4.13: the bubble can be hovered
 * without disappearing, and Escape dismisses it without moving focus.
 */

/* Grace period for the pointer to cross from trigger to bubble, and the window
 * in which the next tooltip skips its delay (moving along a toolbar). */
const HIDE_GRACE_MS = 100;
const WARM_MS = 300;

const tooltipState = new WeakMap();
let lastHiddenAt = 0;

LDS.behavior("lds-tooltip", {
  connected(el) {
    const s = { showTimer: 0, hideTimer: 0, reposition: null, onKeydown: null };
    tooltipState.set(el, s);

    el.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      clearTimeout(s.hideTimer);
      if (isShown(el)) return;
      const warm = Date.now() - lastHiddenAt < WARM_MS;
      s.showTimer = setTimeout(() => show(el), warm ? 0 : delayOf(el));
    });

    el.addEventListener("pointerleave", () => {
      clearTimeout(s.showTimer);
      s.hideTimer = setTimeout(() => hide(el), HIDE_GRACE_MS);
    });

    el.addEventListener("focusin", () => {
      if (focusIsVisible()) show(el);
    });

    el.addEventListener("focusout", () => hide(el));

    /* A click is an action, not a request for the hint. */
    el.addEventListener("pointerdown", () => {
      clearTimeout(s.showTimer);
      hide(el);
    });

    syncText(el);
  },

  disconnected(el) {
    hide(el);
    tooltipState.delete(el);
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "content") syncText(el);
    if (name === "disabled" && el.boolAttr("disabled")) hide(el);
    if (name === "placement" && isShown(el)) position(el);
  },
});

function delayOf(el) {
  const n = parseInt(el.getAttribute("delay"), 10);
  return Number.isNaN(n) ? 500 : Math.max(0, n);
}

function syncText(el) {
  const text = el.$(".text");
  if (text) text.textContent = el.getAttribute("content") || "";
}

function hasContent(el) {
  if (el.getAttribute("content")) return true;
  return !!el.querySelector(':scope > [slot="content"]');
}

function triggerOf(el) {
  const slot = el.$(".anchor slot");
  return (slot && slot.assignedElements({ flatten: true })[0]) || el;
}

function isShown(el) {
  const bubble = el.$(".bubble");
  return !!bubble && !bubble.hidden;
}

function focusIsVisible() {
  let active = document.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  try {
    return !!active && active.matches(":focus-visible");
  } catch (_) {
    return true;
  }
}

function show(el) {
  const s = tooltipState.get(el);
  if (!s || isShown(el)) return;
  if (el.boolAttr("disabled") || !hasContent(el)) return;

  el.$(".bubble").hidden = false;
  position(el);

  s.reposition = () => position(el);
  window.addEventListener("resize", s.reposition);
  window.addEventListener("scroll", s.reposition, true);

  s.onKeydown = (event) => {
    if (event.key === "Escape") hide(el);
  };
  document.addEventListener("keydown", s.onKeydown, true);
}

function hide(el) {
  const s = tooltipState.get(el);
  if (!s) return;
  clearTimeout(s.showTimer);
  clearTimeout(s.hideTimer);
  if (!isShown(el)) return;

  el.$(".bubble").hidden = true;
  lastHiddenAt = Date.now();

  window.removeEventListener("resize", s.reposition);
  window.removeEventListener("scroll", s.reposition, true);
  document.removeEventListener("keydown", s.onKeydown, true);
  s.reposition = null;
  s.onKeydown = null;
}

function position(el) {
  const raw = LDS.token("space.1", el);
  const offset = raw ? parseFloat(raw) * parseFloat(getComputedStyle(document.documentElement).fontSize) : 4;
  LDS.position(el.$(".bubble"), triggerOf(el), {
    placement: el.getAttribute("placement") || "top",
    offset: Number.isNaN(offset) ? 4 : offset,
  });
}
