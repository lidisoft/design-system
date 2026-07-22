/* Behaviour for <lds-nav-group>.
 *
 * Toggles the `open` attribute; aria-expanded tracks it. Cancel lds-toggle to
 * keep the previous state.
 */

LDS.behavior("lds-nav-group", {
  connected(el) {
    const trigger = el.$(".trigger");

    syncLabel(el, trigger);
    syncExpanded(el, trigger);

    trigger.addEventListener("click", () => {
      setOpen(el, !el.boolAttr("open"));
    });
  },

  attributeChanged(el, name) {
    const trigger = el.$(".trigger");
    if (!trigger) return;

    if (name === "label") syncLabel(el, trigger);
    if (name === "open") syncExpanded(el, trigger);
  },
});

function setOpen(el, open) {
  if (el.boolAttr("open") === open) return;

  const event = el.emit("lds-toggle", { open: open });
  if (event.defaultPrevented) return;

  el.toggleAttribute("open", open);
}

function syncLabel(el, trigger) {
  const label = el.$(".trigger__label");
  const text = el.getAttribute("label") || "";
  if (label) label.textContent = text;
  if (text) {
    trigger.removeAttribute("aria-label");
  } else {
    trigger.setAttribute("aria-label", "Section");
  }
}

function syncExpanded(el, trigger) {
  trigger.setAttribute("aria-expanded", el.boolAttr("open") ? "true" : "false");
}
