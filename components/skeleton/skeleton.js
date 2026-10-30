/* Behaviour for <lds-skeleton> — render one bar per line and hide the
 * placeholder from assistive technology. The region being loaded should carry
 * aria-busy="true"; the skeleton itself says nothing. */

LDS.behavior("lds-skeleton", {
  connected(el) {
    el.setAttribute("aria-hidden", "true");
    render(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    render(el);
  },
});

function render(el) {
  const lines = el.$(".lines");
  const shape = el.getAttribute("shape") || "text";
  let count = shape === "text" ? parseInt(el.getAttribute("lines"), 10) : 1;
  if (Number.isNaN(count) || count < 1) count = 1;

  lines.textContent = "";
  for (let i = 0; i < count; i++) {
    const bar = document.createElement("span");
    bar.className = "bar";
    if (count > 1 && i === count - 1) bar.setAttribute("data-last", "");
    lines.appendChild(bar);
  }
}
