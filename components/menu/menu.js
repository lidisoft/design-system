/* Behaviour for <lds-menu>.
 *
 * Opens a positioned action list from a slotted trigger. Uses LDS.overlay for
 * dismiss / focus restore and LDS.position for anchored layout. Not a menubar
 * and not a submenu host.
 */

const menuState = new WeakMap();

LDS.behavior("lds-menu", {
  connected(el) {
    const panel = el.$(".panel");
    const triggerSlot = el.$('.trigger slot[name="trigger"]');

    const onTriggerClick = (event) => {
      event.preventDefault();
      toggle(el);
    };

    const onTriggerKeydown = (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        if (el.boolAttr("open")) return;
        event.preventDefault();
        openMenu(el, { focus: "first" });
      } else if (event.key === "ArrowUp") {
        if (el.boolAttr("open")) return;
        event.preventDefault();
        openMenu(el, { focus: "last" });
      }
    };

    const onPanelKeydown = (event) => {
      if (!el.boolAttr("open")) return;
      const items = enabledItems(el);
      if (!items.length) return;

      const current = focusedItemIndex(items);
      let next = current;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        next = current < 0 ? 0 : (current + 1) % items.length;
        focusItem(items[next]);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
        focusItem(items[next]);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusItem(items[0]);
      } else if (event.key === "End") {
        event.preventDefault();
        focusItem(items[items.length - 1]);
      }
    };

    const onSelect = () => {
      closeMenu(el, "select");
    };

    el.addEventListener("lds-select", onSelect);
    panel.addEventListener("keydown", onPanelKeydown);

    menuState.set(el, {
      onTriggerClick,
      onTriggerKeydown,
      onPanelKeydown,
      onSelect,
      overlay: null,
      reposition: null,
      trigger: null,
    });

    if (triggerSlot) {
      triggerSlot.addEventListener("slotchange", () => wireTrigger(el, onTriggerClick, onTriggerKeydown));
    }
    wireTrigger(el, onTriggerClick, onTriggerKeydown);

    syncOpen(el);
  },

  disconnected(el) {
    teardownOpen(el);
    const s = menuState.get(el);
    if (!s) return;
    el.removeEventListener("lds-select", s.onSelect);
    const panel = el.$(".panel");
    if (panel) panel.removeEventListener("keydown", s.onPanelKeydown);
    unwireTrigger(el, s.onTriggerClick, s.onTriggerKeydown);
    menuState.delete(el);
  },

  attributeChanged(el, name) {
    if (name === "open") syncOpen(el);
    if (name === "placement" && el.boolAttr("open")) positionPanel(el);
  },
});

function wireTrigger(el, onClick, onKeydown) {
  const trigger = triggerOf(el);
  const s = menuState.get(el);
  if (s && s.trigger) {
    s.trigger.removeEventListener("click", s.onTriggerClick);
    s.trigger.removeEventListener("keydown", s.onTriggerKeydown);
  }
  if (!trigger) return;
  trigger.addEventListener("click", onClick);
  trigger.addEventListener("keydown", onKeydown);
  if (s) s.trigger = trigger;
  syncTriggerA11y(el, trigger);
}

function unwireTrigger(el, onClick, onKeydown) {
  const trigger = triggerOf(el);
  if (!trigger) return;
  trigger.removeEventListener("click", onClick);
  trigger.removeEventListener("keydown", onKeydown);
}

function triggerOf(el) {
  const slot = el.$('.trigger slot[name="trigger"]');
  if (!slot) return null;
  const assigned = slot.assignedElements({ flatten: true });
  return assigned[0] || null;
}

function syncTriggerA11y(el, trigger) {
  if (!trigger) trigger = triggerOf(el);
  if (!trigger) return;
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", el.boolAttr("open") ? "true" : "false");
  const panel = el.$(".panel");
  if (panel.id) trigger.setAttribute("aria-controls", panel.id);
}

function toggle(el) {
  if (el.boolAttr("open")) closeMenu(el, "toggle");
  else openMenu(el, { focus: "first" });
}

function openMenu(el, opts) {
  opts = opts || {};
  if (el.boolAttr("open")) return;
  const ev = el.emit("lds-open");
  if (ev.defaultPrevented) return;
  el.setAttribute("open", "");
  if (opts.focus) {
    requestAnimationFrame(() => {
      const items = enabledItems(el);
      if (!items.length) return;
      focusItem(opts.focus === "last" ? items[items.length - 1] : items[0]);
    });
  }
}

function closeMenu(el, reason) {
  if (!el.boolAttr("open")) return;
  const ev = el.emit("lds-close", { reason: reason || "dismiss" });
  if (ev.defaultPrevented) return;
  el.removeAttribute("open");
}

function syncOpen(el) {
  const panel = el.$(".panel");
  const open = el.boolAttr("open");
  panel.hidden = !open;
  syncTriggerA11y(el);

  if (open) {
    setupOpen(el);
  } else {
    teardownOpen(el);
  }
}

function setupOpen(el) {
  const s = menuState.get(el);
  const panel = el.$(".panel");
  const trigger = triggerOf(el);
  if (!s || !panel) return;

  teardownOpen(el);

  positionPanel(el);

  const reposition = () => positionPanel(el);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  s.reposition = reposition;

  const focusTarget = focusableIn(trigger) || trigger;
  s.overlay = LDS.overlay.bind(panel, {
    restoreFocus: focusTarget,
    ignoreOutside: trigger ? [trigger, el] : [el],
    onDismiss: (reason) => closeMenu(el, reason),
  });
}

function teardownOpen(el) {
  const s = menuState.get(el);
  if (!s) return;
  if (s.overlay) {
    s.overlay.disconnect();
    s.overlay = null;
  }
  if (s.reposition) {
    window.removeEventListener("resize", s.reposition);
    window.removeEventListener("scroll", s.reposition, true);
    s.reposition = null;
  }
}

function positionPanel(el) {
  const panel = el.$(".panel");
  const trigger = triggerOf(el);
  if (!panel || !trigger) return;
  const placement = el.getAttribute("placement") || "bottom-end";
  LDS.position(panel, trigger, { placement: placement, matchWidth: true });
}

function itemsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll(":scope > lds-menu-item"));
}

function enabledItems(el) {
  return itemsOf(el).filter((item) => !item.boolAttr("disabled") && !item.hidden);
}

function focusableIn(host) {
  if (!host) return null;
  if (host.shadowRoot) {
    const inner = host.shadowRoot.querySelector(
      'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
    );
    if (inner) return inner;
  }
  return host;
}

function focusItem(item) {
  if (!item) return;
  const control = item.$ ? item.$(".item") : null;
  if (control && typeof control.focus === "function") control.focus();
  else if (typeof item.focus === "function") item.focus();
}

function focusedItemIndex(items) {
  let active = document.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  for (let i = 0; i < items.length; i++) {
    const control = items[i].$ ? items[i].$(".item") : null;
    if (items[i] === active || control === active) return i;
    if (control && control.contains && control.contains(active)) return i;
  }
  return -1;
}
