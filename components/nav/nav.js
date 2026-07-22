/* Behaviour for <lds-nav>.
 *
 * CSS cannot see whether a named slot has assigned nodes, so brand and footer
 * wrappers get data-empty for collapse.
 */

LDS.behavior("lds-nav", {
  connected(el) {
    watchSlot(el, 'slot[name="brand"]', ".brand");
    watchSlot(el, 'slot[name="footer"]', ".footer");
  },
});

function watchSlot(el, slotSel, wrapSel) {
  const slot = el.$(slotSel);
  const wrap = el.$(wrapSel);
  if (!slot || !wrap) return;

  const update = () => {
    wrap.toggleAttribute("data-empty", slot.assignedNodes({ flatten: true }).length === 0);
  };

  slot.addEventListener("slotchange", update);
  update();
}
