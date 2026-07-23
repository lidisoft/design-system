/* Behaviour for <lds-timeline-item> — sync time text. */

LDS.behavior("lds-timeline-item", {
  connected(el) {
    syncTime(el);
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "time") syncTime(el);
  },
});

function syncTime(el) {
  const node = el.$(".time");
  if (!node) return;
  node.textContent = el.getAttribute("time") || "";
}
