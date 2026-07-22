/* Behaviour for <lds-toast>.
 *
 * open controls visibility. duration (ms, default 5000; 0 = sticky) auto-
 * dismisses; the timer pauses while hovered or focus is inside. dismissible
 * defaults to true when the attribute is omitted.
 */

const state = new WeakMap();

LDS.behavior("lds-toast", {
  connected(el) {
    const close = el.$(".close");
    const root = el.$(".root");

    syncRole(el, root);
    syncDismissible(el, close);
    watchSlot(el, 'slot[name="title"]', ".title");
    watchSlot(el, ".body > slot", ".body");
    watchSlot(el, 'slot[name="action"]', ".action");

    close.addEventListener("click", function () {
      dismiss(el, "close");
    });

    el.addEventListener("mouseenter", function () {
      pauseTimer(el);
    });
    el.addEventListener("mouseleave", function () {
      resumeTimer(el);
    });
    el.addEventListener("focusin", function () {
      pauseTimer(el);
    });
    el.addEventListener("focusout", function () {
      requestAnimationFrame(function () {
        if (!el.matches(":focus-within")) resumeTimer(el);
      });
    });

    if (el.boolAttr("open")) startTimer(el);
  },

  disconnected(el) {
    clearTimer(el);
  },

  attributeChanged(el, name) {
    const close = el.$(".close");
    const root = el.$(".root");
    if (!root) return;

    if (name === "intent") syncRole(el, root);
    if (name === "dismissible" && close) syncDismissible(el, close);
    if (name === "open") {
      if (el.boolAttr("open")) startTimer(el);
      else clearTimer(el);
    }
    if (name === "duration" && el.boolAttr("open")) {
      clearTimer(el);
      startTimer(el);
    }
  },
});

function isDismissible(el) {
  if (!el.hasAttribute("dismissible")) return true;
  return el.boolAttr("dismissible");
}

function syncDismissible(el, close) {
  close.hidden = !isDismissible(el);
}

function syncRole(el, root) {
  root.setAttribute(
    "role",
    el.getAttribute("intent") === "danger" ? "alert" : "status"
  );
}

function durationMs(el) {
  const raw = el.getAttribute("duration");
  if (raw === null || raw === "") return 5000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 5000;
}

function dismiss(el, reason) {
  if (!el.boolAttr("open")) return;

  const event = el.emit("lds-dismiss", { reason: reason });
  if (event.defaultPrevented) return;

  el.removeAttribute("open");
  clearTimer(el);

  if (el.hasAttribute("data-managed")) {
    el.remove();
  }
}

function clearTimer(el) {
  const s = state.get(el);
  if (!s) return;
  if (s.timer) clearTimeout(s.timer);
  s.timer = null;
  state.set(el, s);
}

function startTimer(el) {
  clearTimer(el);
  const ms = durationMs(el);
  if (ms <= 0) return;

  const s = state.get(el) || {};
  s.remaining = ms;
  s.started = Date.now();
  s.timer = setTimeout(function () {
    dismiss(el, "timeout");
  }, ms);
  state.set(el, s);
}

function pauseTimer(el) {
  const s = state.get(el);
  if (!s || !s.timer) return;
  clearTimeout(s.timer);
  s.timer = null;
  s.remaining = Math.max(0, s.remaining - (Date.now() - s.started));
  state.set(el, s);
}

function resumeTimer(el) {
  if (!el.boolAttr("open")) return;
  const s = state.get(el);
  if (!s || s.timer) return;
  if (s.remaining <= 0) {
    dismiss(el, "timeout");
    return;
  }
  s.started = Date.now();
  s.timer = setTimeout(function () {
    dismiss(el, "timeout");
  }, s.remaining);
  state.set(el, s);
}

function watchSlot(el, slotSel, wrapSel) {
  const slot = el.$(slotSel);
  const wrap = el.$(wrapSel);
  if (!slot || !wrap) return;

  const update = function () {
    const empty = slot.assignedNodes({ flatten: true }).every(function (node) {
      return node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "";
    });
    wrap.toggleAttribute("data-empty", empty);
  };

  slot.addEventListener("slotchange", update);
  update();
}

/* Used by lds-toast-region Escape handling. */
LDS._dismissToast = dismiss;
