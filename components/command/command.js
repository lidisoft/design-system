/* Behaviour for <lds-command> — global search / command palette.
 *
 * Filterable listbox over light-DOM lds-command-item (and optional
 * lds-command-group) children. open shows a modal dialog; hotkey registers
 * Meta/Ctrl+K. Selection emits lds-select from the item; the palette closes.
 */

const state = new WeakMap();
let itemSeq = 0;
const hotkeyHosts = new Set();

LDS.behavior("lds-command", {
  connected(el) {
    const dialog = el.$(".dialog");
    const input = el.$(".input");
    const list = el.$(".list");

    input.id = input.id || nextId("lds-command-input");
    list.id = list.id || nextId("lds-command-list");
    input.setAttribute("aria-controls", list.id);

    input.addEventListener("input", () => {
      filter(el);
      activateFirst(el);
    });

    input.addEventListener("keydown", (event) => onInputKeydown(el, event));

    el.addEventListener("lds-select", (event) => {
      if (!el.contains(event.target)) return;
      closeCommand(el, "select");
    });

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeCommand(el, "escape");
    });

    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      closeCommand(el, "outside");
    });

    const slot = el.$("slot");
    if (slot) {
      slot.addEventListener("slotchange", () => {
        syncItems(el);
        filter(el);
      });
    }

    const mo = new MutationObserver(() => {
      syncItems(el);
      filter(el);
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    state.set(el, { mo: mo, overlay: null });

    syncPlaceholder(el);
    syncHotkey(el);
    syncOpen(el);
  },

  disconnected(el) {
    teardown(el);
    hotkeyHosts.delete(el);
    const s = state.get(el);
    if (s && s.mo) s.mo.disconnect();
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "open") syncOpen(el);
    if (name === "placeholder") syncPlaceholder(el);
    if (name === "hotkey") syncHotkey(el);
  },
});

function nextId(prefix) {
  itemSeq += 1;
  return prefix + "-" + itemSeq;
}

function syncPlaceholder(el) {
  const input = el.$(".input");
  if (!input) return;
  input.placeholder = el.getAttribute("placeholder") || "Search…";
}

function syncHotkey(el) {
  if (el.boolAttr("hotkey")) hotkeyHosts.add(el);
  else hotkeyHosts.delete(el);
}

function syncOpen(el) {
  const dialog = el.$(".dialog");
  const input = el.$(".input");
  const open = el.boolAttr("open");

  if (open) {
    const ev = el.emit("lds-open");
    if (ev.defaultPrevented) {
      el.removeAttribute("open");
      return;
    }
    if (!dialog.open) dialog.showModal();
    setupOverlay(el);
    syncItems(el);
    input.value = "";
    filter(el);
    activateFirst(el);
    requestAnimationFrame(() => input.focus());
  } else {
    teardown(el);
    if (dialog.open) dialog.close();
  }
}

function setupOverlay(el) {
  const s = state.get(el) || {};
  if (s.overlay) return;
  const dialog = el.$(".dialog");
  s.overlay = LDS.overlay.bind(dialog, {
    trapFocus: false,
    scrollLock: true,
    restoreFocus: null,
    onDismiss: function () {
      /* Escape / outside handled on the dialog itself. */
    },
  });
  state.set(el, s);
}

function teardown(el) {
  const s = state.get(el);
  if (!s) return;
  if (s.overlay) {
    s.overlay.disconnect();
    s.overlay = null;
  }
}

function closeCommand(el, reason) {
  if (!el.boolAttr("open")) return;
  const ev = el.emit("lds-close", { reason: reason });
  if (ev.defaultPrevented) return;
  el.removeAttribute("open");
}

function itemsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll("lds-command-item"));
}

function groupsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll(":scope > lds-command-group"));
}

function syncItems(el) {
  itemsOf(el).forEach((item) => {
    if (!item.id) item.id = nextId("lds-command-option");
    item.setAttribute("role", "option");
  });
}

function filter(el) {
  const input = el.$(".input");
  const empty = el.$(".empty");
  const query = (input.value || "").trim().toLowerCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
  let visible = 0;

  itemsOf(el).forEach((item) => {
    const match = tokens.length === 0 || tokens.every((token) => itemMatches(item, token));
    item.hidden = !match;
    if (match) visible += 1;
    item.removeAttribute("aria-selected");
    item.removeAttribute("data-active");
  });

  groupsOf(el).forEach((group) => {
    const any = Array.prototype.some.call(
      group.querySelectorAll("lds-command-item"),
      (item) => !item.hidden
    );
    group.hidden = !any;
  });

  const noResults = visible === 0;
  el.toggleAttribute("data-empty", noResults);
  empty.hidden = !noResults;
  empty.textContent = el.getAttribute("empty") || "No results";
}

function itemMatches(item, token) {
  const label = (item.textContent || "").toLowerCase();
  const keywords = (item.getAttribute("keywords") || "").toLowerCase();
  const value = (item.getAttribute("value") || "").toLowerCase();
  return label.indexOf(token) >= 0 || keywords.indexOf(token) >= 0 || value.indexOf(token) >= 0;
}

function visibleItems(el) {
  return itemsOf(el).filter((item) => !item.hidden && !item.boolAttr("disabled"));
}

function activeItem(el) {
  return visibleItems(el).find((item) => item.hasAttribute("data-active")) || null;
}

function setActive(el, item) {
  const input = el.$(".input");
  visibleItems(el).forEach((node) => {
    const on = node === item;
    node.toggleAttribute("data-active", on);
    node.setAttribute("aria-selected", on ? "true" : "false");
  });
  if (item) {
    input.setAttribute("aria-activedescendant", item.id);
    if (typeof item.scrollIntoView === "function") {
      item.scrollIntoView({ block: "nearest" });
    }
  } else {
    input.removeAttribute("aria-activedescendant");
  }
}

function activateFirst(el) {
  const items = visibleItems(el);
  setActive(el, items[0] || null);
}

function moveActive(el, delta) {
  const items = visibleItems(el);
  if (!items.length) return;
  const current = activeItem(el);
  let index = current ? items.indexOf(current) : -1;
  if (index < 0) index = delta > 0 ? -1 : 0;
  index = (index + delta + items.length) % items.length;
  setActive(el, items[index]);
}

function selectActive(el) {
  const item = activeItem(el);
  if (!item) return;
  item.click();
}

function onInputKeydown(el, event) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveActive(el, 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    moveActive(el, -1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    selectActive(el);
  } else if (event.key === "Home") {
    const items = visibleItems(el);
    if (items[0]) {
      event.preventDefault();
      setActive(el, items[0]);
    }
  } else if (event.key === "End") {
    const items = visibleItems(el);
    if (items.length) {
      event.preventDefault();
      setActive(el, items[items.length - 1]);
    }
  }
}

function onDocumentKeydown(event) {
  if (!(event.key === "k" || event.key === "K")) return;
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.altKey) return;

  const target = event.target;
  if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
    /* Allow opening from inputs — command palettes usually still catch ⌘K. */
  }

  const hosts = Array.from(hotkeyHosts).filter((el) => el.isConnected);
  if (!hosts.length) return;

  event.preventDefault();
  const el = hosts[hosts.length - 1];
  if (el.boolAttr("open")) closeCommand(el, "hotkey");
  else el.setAttribute("open", "");
}

if (typeof document !== "undefined") {
  document.addEventListener("keydown", onDocumentKeydown, true);
}

/**
 * Open a command palette. Pass { el } or the first <lds-command> on the page
 * is used. Returns the element or null.
 */
LDS.command = function (opts) {
  opts = opts || {};
  const el =
    opts.el ||
    (typeof document !== "undefined" ? document.querySelector("lds-command") : null);
  if (!el) return null;
  el.setAttribute("open", "");
  return el;
};
