/* Behaviour for <lds-empty-state> — hide unused regions so the gap between
 * them stays even. CSS cannot see whether a slot has content. */

LDS.behavior("lds-empty-state", {
  connected(el) {
    watchSlot(el, 'slot[name="icon"]', ".icon");
    watchSlot(el, 'slot[name="title"]', ".title");
    watchSlot(el, ".body slot", ".body");
    watchSlot(el, 'slot[name="actions"]', ".actions");
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
