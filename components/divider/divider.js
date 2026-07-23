/* Behaviour for <lds-divider> — separator role and label emptiness. */

LDS.behavior("lds-divider", {
  connected(el) {
    sync(el);
    watchSlot(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el);
  },
});

function sync(el) {
  const orientation = el.getAttribute("orientation") || "horizontal";
  el.setAttribute("role", "separator");
  el.setAttribute("aria-orientation", orientation);
}

function watchSlot(el) {
  const slot = el.$("slot");
  const label = el.$(".label");
  if (!slot || !label) return;

  const update = () => {
    const empty = slot.assignedNodes({ flatten: true }).every(
      (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim()
    );
    label.toggleAttribute("data-empty", empty);
  };

  slot.addEventListener("slotchange", update);
  update();
}
