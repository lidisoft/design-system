/* Behaviour for <lds-option> — role, id and slot emptiness. Selection and
 * the active highlight are set by the parent lds-combobox. */

let optionSeq = 0;

LDS.behavior("lds-option", {
  connected(el) {
    el.setAttribute("role", "option");
    if (!el.id) {
      optionSeq += 1;
      el.id = "lds-option-" + optionSeq;
    }
    if (!el.hasAttribute("aria-selected")) el.setAttribute("aria-selected", "false");
    syncDisabled(el);
    watchSlot(el, 'slot[name="start"]', ".start");
    watchSlot(el, 'slot[name="end"]', ".end");
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "disabled") syncDisabled(el);
  },
});

function syncDisabled(el) {
  if (el.boolAttr("disabled")) el.setAttribute("aria-disabled", "true");
  else el.removeAttribute("aria-disabled");
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
