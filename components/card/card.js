/* Behaviour for <lds-card> — hide empty slots. */

LDS.behavior("lds-card", {
  connected(el) {
    watchSlot(el, 'slot[name="media"]', ".media");
    watchSlot(el, 'slot[name="header"]', ".header");
    watchSlot(el, "slot:not([name])", ".body");
    watchSlot(el, 'slot[name="footer"]', ".footer");
  },
});

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
