/* Behaviour for <lds-drawer> — native <dialog> pinned to an edge.
 *
 * Modal drawers use showModal() and LDS.overlay's scroll lock, like lds-modal.
 * Non-modal drawers use show(): no backdrop, no scroll lock, no outside-click
 * dismissal, so a list beside an issue peek stays clickable. Escape still
 * closes them while focus is inside.
 */

const drawerState = new WeakMap();

LDS.behavior("lds-drawer", {
  connected(el) {
    const dialog = el.$(".dialog");

    watchSlot(el, 'slot[name="header"]', ".header__title");
    watchSlot(el, 'slot[name="footer"]', ".footer");

    el.$(".close").addEventListener("click", () => closeDrawer(el, "close-button"));

    /* Fired by modal dialogs on Escape; some browsers fire it for non-modal
     * ones too. Either way the drawer decides, not the platform. */
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      if (isDismissible(el)) closeDrawer(el, "escape");
    });

    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!el.boolAttr("non-modal")) return;
      event.preventDefault();
      if (isDismissible(el)) closeDrawer(el, "escape");
    });

    /* On a modal dialog a click whose target is the dialog itself landed on
     * the backdrop: the chrome fills the whole panel. */
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog || el.boolAttr("non-modal")) return;
      if (isDismissible(el)) closeDrawer(el, "outside");
    });

    /* Keep the attribute honest if something else closes the dialog, e.g. a
     * slotted <form method="dialog">. */
    dialog.addEventListener("close", () => {
      if (el.boolAttr("open")) el.removeAttribute("open");
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
    if (name === "non-modal" && el.boolAttr("open")) {
      /* show() and showModal() cannot convert into each other. */
      teardown(el);
      el.$(".dialog").close();
      el.setAttribute("open", "");
      syncOpen(el);
    }
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

  if (!open) {
    teardown(el);
    if (dialog.open) dialog.close();
    return;
  }
  if (dialog.open) return;

  if (el.emit("lds-open").defaultPrevented) {
    el.removeAttribute("open");
    return;
  }

  if (el.boolAttr("non-modal")) {
    dialog.show();
    return;
  }

  dialog.showModal();
  const s = drawerState.get(el) || {};
  if (!s.overlay) {
    s.overlay = LDS.overlay.bind(dialog, {
      trapFocus: false,
      scrollLock: true,
      /* The overlay cancels Escape's keydown, which stops the dialog's own
       * cancel event, so Escape is handled here. Backdrop clicks land on the
       * dialog and are handled by its click listener. */
      onDismiss: function (reason) {
        if (reason === "escape" && isDismissible(el)) closeDrawer(el, "escape");
      },
    });
  }
  drawerState.set(el, s);
}

function teardown(el) {
  const s = drawerState.get(el);
  if (!s || !s.overlay) return;
  s.overlay.disconnect();
  s.overlay = null;
}

function closeDrawer(el, reason) {
  if (!el.boolAttr("open")) return;
  if (el.emit("lds-close", { reason: reason }).defaultPrevented) return;
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
