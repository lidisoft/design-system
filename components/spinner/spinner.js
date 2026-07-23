/* Behaviour for <lds-spinner> — accessible name when label is set. */

LDS.behavior("lds-spinner", {
  connected(el) {
    syncLabel(el);
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "label") syncLabel(el);
  },
});

function syncLabel(el) {
  const label = el.getAttribute("label");
  if (label) {
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", label);
    el.removeAttribute("aria-hidden");
  } else {
    el.removeAttribute("role");
    el.removeAttribute("aria-label");
    el.setAttribute("aria-hidden", "true");
  }
}
