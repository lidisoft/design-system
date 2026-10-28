/* Behaviour for <lds-popover>.
 *
 * Opens a non-modal panel anchored to a slotted trigger. Uses LDS.overlay for
 * Escape and outside-click dismissal and LDS.position for layout. Unlike
 * lds-menu it does not trap focus: Tab leaves the panel and the page stays
 * usable, which is what property pickers and display options need.
 */

const popoverState = new WeakMap();

LDS.behavior("lds-popover", {
  connected(el) {
    const triggerSlot = el.$('slot[name="trigger"]');

    const onTriggerClick = (event) => {
      event.preventDefault();
      if (el.boolAttr("open")) closePopover(el, "toggle");
      else openPopover(el);
    };

    popoverState.set(el, {
      onTriggerClick,
      overlay: null,
      reposition: null,
      trigger: null,
      restore: false,
    });

    triggerSlot.addEventListener("slotchange", () => wireTrigger(el));
    wireTrigger(el);
    syncOpen(el);
  },

  disconnected(el) {
    teardownOpen(el);
    const s = popoverState.get(el);
    if (s && s.trigger) s.trigger.removeEventListener("click", s.onTriggerClick);
    popoverState.delete(el);
  },

  attributeChanged(el, name) {
    if (!el._lds.ready || !popoverState.has(el)) return;
    if (name === "open") syncOpen(el);
    if (name === "placement" && el.boolAttr("open")) positionPanel(el);
    if (name === "label") syncLabel(el);
  },
});

function triggerOf(el) {
  const slot = el.$('slot[name="trigger"]');
  if (!slot) return null;
  return slot.assignedElements({ flatten: true })[0] || null;
}

function wireTrigger(el) {
  const s = popoverState.get(el);
  if (!s) return;
  if (s.trigger) s.trigger.removeEventListener("click", s.onTriggerClick);
  s.trigger = triggerOf(el);
  if (!s.trigger) return;
  s.trigger.addEventListener("click", s.onTriggerClick);
  syncTriggerA11y(el);
}

function syncTriggerA11y(el) {
  const trigger = triggerOf(el);
  if (!trigger) return;
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", el.boolAttr("open") ? "true" : "false");
}

function syncLabel(el) {
  const panel = el.$(".panel");
  const label = el.getAttribute("label");
  if (label) panel.setAttribute("aria-label", label);
  else panel.removeAttribute("aria-label");
}

function openPopover(el) {
  if (el.boolAttr("open")) return;
  if (el.emit("lds-open").defaultPrevented) return;
  el.setAttribute("open", "");
}

/* Focus returns to the trigger after Escape or a programmatic close, but not
 * after an outside click — the user has just put focus somewhere else. */
function closePopover(el, reason) {
  if (!el.boolAttr("open")) return;
  if (el.emit("lds-close", { reason: reason }).defaultPrevented) return;
  const s = popoverState.get(el);
  if (s) s.restore = reason !== "outside";
  el.removeAttribute("open");
}

function syncOpen(el) {
  const panel = el.$(".panel");
  const open = el.boolAttr("open");
  panel.hidden = !open;
  syncTriggerA11y(el);
  syncLabel(el);
  if (open) setupOpen(el);
  else teardownOpen(el);
}

function setupOpen(el) {
  const s = popoverState.get(el);
  const panel = el.$(".panel");
  if (!s) return;
  teardownOpen(el);

  positionPanel(el);
  s.reposition = () => positionPanel(el);
  window.addEventListener("resize", s.reposition);
  window.addEventListener("scroll", s.reposition, true);

  const trigger = triggerOf(el);
  s.restore = true;
  s.overlay = LDS.overlay.bind(panel, {
    trapFocus: false,
    ignoreOutside: trigger ? [trigger] : [],
    onDismiss: (reason) => closePopover(el, reason),
  });

  requestAnimationFrame(() => {
    if (!el.boolAttr("open")) return;
    const first = firstFocusable(el);
    (first || panel).focus();
  });
}

function teardownOpen(el) {
  const s = popoverState.get(el);
  if (!s) return;
  if (s.reposition) {
    window.removeEventListener("resize", s.reposition);
    window.removeEventListener("scroll", s.reposition, true);
    s.reposition = null;
  }
  if (!s.overlay) return;
  s.overlay.disconnect();
  s.overlay = null;
  if (s.restore) focusTrigger(el);
}

function positionPanel(el) {
  const trigger = triggerOf(el);
  if (!trigger) return;
  LDS.position(el.$(".panel"), trigger, {
    placement: el.getAttribute("placement") || "bottom-start",
  });
}

function focusTrigger(el) {
  const trigger = triggerOf(el);
  if (!trigger) return;
  const inner = trigger.shadowRoot
    ? trigger.shadowRoot.querySelector('button:not([disabled]),a[href],input,[tabindex]:not([tabindex="-1"])')
    : null;
  (inner || trigger).focus();
}

/* First focusable slotted element. Custom elements with delegatesFocus or an
 * inner control focus through their host. */
function firstFocusable(el) {
  const selector =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),lds-button:not([disabled]),lds-input,lds-select,lds-textarea,lds-checkbox,lds-switch,lds-radio-group,lds-menu-item,lds-command-item';
  const slot = el.$(".panel slot");
  for (const node of slot.assignedElements({ flatten: true })) {
    if (node.matches(selector)) return focusTarget(node);
    const inner = node.querySelector(selector);
    if (inner) return focusTarget(inner);
  }
  return null;
}

function focusTarget(node) {
  if (node.shadowRoot) {
    const inner = node.shadowRoot.querySelector('button:not([disabled]),a[href],input,select,textarea');
    if (inner) return inner;
  }
  return node;
}
