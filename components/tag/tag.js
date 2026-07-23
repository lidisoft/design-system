/* Behaviour for <lds-tag> — dismiss control and start-slot emptiness. */

LDS.behavior("lds-tag", {
  connected(el) {
    const close = el.$(".tag__close");
    watchSlot(el, '.tag__start slot[name="start"]', ".tag__start");
    syncDismiss(el, close);

    close.addEventListener("click", (event) => {
      event.stopPropagation();
      if (el.boolAttr("disabled")) return;
      const ev = el.emit("lds-remove");
      if (!ev.defaultPrevented) el.remove();
    });
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "dismissible" || name === "disabled") {
      syncDismiss(el, el.$(".tag__close"));
    }
  },
});

function syncDismiss(el, close) {
  if (!close) return;
  const show = el.boolAttr("dismissible");
  close.hidden = !show;
  close.disabled = el.boolAttr("disabled");
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
