/* Behaviour for <lds-segment> — accessible name and slot emptiness. Role,
 * checked state and tabindex are owned by the parent lds-segmented. */

LDS.behavior("lds-segment", {
  connected(el) {
    el.setAttribute("role", "radio");
    syncLabel(el);
    watchSlot(el, 'slot[name="start"]', ".start");
    watchSlot(el, ".label slot", ".label");
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "label") syncLabel(el);
  },
});

function syncLabel(el) {
  const label = el.getAttribute("label");
  if (label) el.setAttribute("aria-label", label);
  else el.removeAttribute("aria-label");
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
