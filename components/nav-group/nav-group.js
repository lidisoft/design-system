/* Behaviour for <lds-nav-group>.
 *
 * Toggles the `open` attribute; aria-expanded tracks it. Cancel lds-toggle to
 * keep the previous state.
 *
 * With href, the header is a link to the group's own page (a project) and the
 * disclosure moves to a separate button beside it, since a link cannot also
 * be a toggle.
 */

LDS.behavior("lds-nav-group", {
  connected(el) {
    const trigger = el.$(".trigger");

    syncLabel(el, trigger);
    syncExpanded(el, trigger);
    syncHeader(el);
    watchSlot(el, 'slot[name="start"]', ".link__start");
    watchSlot(el, 'slot[name="end"]', ".link__end");

    trigger.addEventListener("click", () => {
      setOpen(el, !el.boolAttr("open"));
    });
    el.$(".toggle").addEventListener("click", () => {
      setOpen(el, !el.boolAttr("open"));
    });
  },

  attributeChanged(el, name) {
    const trigger = el.$(".trigger");
    if (!trigger) return;

    if (name === "label") syncLabel(el, trigger);
    if (name === "open") syncExpanded(el, trigger);
    if (name === "href" || name === "current" || name === "label") syncHeader(el);
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
  const expanded = el.boolAttr("open") ? "true" : "false";
  trigger.setAttribute("aria-expanded", expanded);
  const toggle = el.$(".toggle");
  if (toggle) toggle.setAttribute("aria-expanded", expanded);
}

function syncHeader(el) {
  const header = el.$(".header");
  const link = el.$(".link");
  const toggle = el.$(".toggle");
  const href = el.getAttribute("href");
  const label = el.getAttribute("label") || "";

  header.hidden = !href;
  el.$(".trigger").hidden = !!href;
  if (!href) return;

  link.setAttribute("href", href);
  el.$(".link__label").textContent = label;
  /* In a collapsed rail only the start content shows, so the link keeps its
   * name through aria-label. */
  link.setAttribute("aria-label", label);
  if (el.boolAttr("current")) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
  toggle.setAttribute("aria-label", label ? "Pages in " + label : "Pages");
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
