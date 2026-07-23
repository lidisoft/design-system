/* Behaviour for <lds-command-group>. */

LDS.behavior("lds-command-group", {
  connected(el) {
    sync(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el);
  },
});

function sync(el) {
  const heading = el.$(".heading");
  const group = el.$(".group");
  const text = el.getAttribute("heading") || "";
  heading.textContent = text;
  if (text) group.setAttribute("aria-label", text);
  else group.removeAttribute("aria-label");
}
