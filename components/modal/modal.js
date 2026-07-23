/* Behaviour for <lds-modal> — native <dialog> + overlay scroll lock. */

const modalState = new WeakMap();

LDS.behavior("lds-modal", {
  connected(el) {
    const dialog = el.$(".dialog");
    const closeBtn = el.$(".close");

    watchSlot(el, 'slot[name="header"]', ".header__title");
    watchSlot(el, 'slot[name="footer"]', ".footer");

    closeBtn.addEventListener("click", () => closeModal(el, "close-button"));

    dialog.addEventListener("cancel", (event) => {
      if (!isDismissible(el)) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      closeModal(el, "escape");
    });

    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      if (!isDismissible(el)) return;
      closeModal(el, "outside");
    });

    syncOpen(el);
  },

  disconnected(el) {
    teardown(el);
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "open") syncOpen(el);
    if (name === "dismissible") syncDismissible(el);
  },
});

function isDismissible(el) {
  if (!el.hasAttribute("dismissible")) return true;
  return el.getAttribute("dismissible") !== "false";
}

function syncDismissible(el) {
  const closeBtn = el.$(".close");
  if (closeBtn) closeBtn.hidden = !isDismissible(el);
}

function syncOpen(el) {
  const dialog = el.$(".dialog");
  const open = el.boolAttr("open");
  syncDismissible(el);

  if (open) {
    if (!dialog.open) {
      const ev = el.emit("lds-open");
      if (ev.defaultPrevented) {
        el.removeAttribute("open");
        return;
      }
      dialog.showModal();
    }
    setupOverlay(el);
  } else {
    teardown(el);
    if (dialog.open) dialog.close();
  }
}

function setupOverlay(el) {
  const s = modalState.get(el) || {};
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
  modalState.set(el, s);
}

function teardown(el) {
  const s = modalState.get(el);
  if (!s) return;
  if (s.overlay) {
    s.overlay.disconnect();
    s.overlay = null;
  }
}

function closeModal(el, reason) {
  if (!el.boolAttr("open")) return;
  const ev = el.emit("lds-close", { reason: reason });
  if (ev.defaultPrevented) return;
  el.removeAttribute("open");
}

function watchSlot(el, slotSel, wrapSel) {
  const slot = el.$(slotSel);
  const wrap = el.$(wrapSel);
  if (!slot || !wrap) return;
  const update = () => {
    const empty = slot.assignedNodes({ flatten: true }).every(
      (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim()
    );
    wrap.toggleAttribute("data-empty", empty);
  };
  slot.addEventListener("slotchange", update);
  update();
}
