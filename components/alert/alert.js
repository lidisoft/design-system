/* Behaviour for <lds-alert> — inline persistent message. */

LDS.behavior("lds-alert", {
  connected(el) {
    const close = el.$(".close");
    const root = el.$(".root");

    syncRole(el, root);
    syncDismissible(el, close);
    syncFallbackIcon(el);
    watchSlot(el, 'slot[name="title"]', ".title");
    watchDescription(el);
    watchSlot(el, 'slot[name="actions"]', ".actions");
    watchIconSlot(el);

    close.addEventListener("click", () => dismiss(el, "close"));
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    const close = el.$(".close");
    const root = el.$(".root");
    if (name === "intent") {
      syncRole(el, root);
      syncFallbackIcon(el);
    }
    if (name === "dismissible" && close) syncDismissible(el, close);
  },
});

function isDismissible(el) {
  return el.boolAttr("dismissible");
}

function syncDismissible(el, close) {
  close.hidden = !isDismissible(el);
}

function syncRole(el, root) {
  root.setAttribute(
    "role",
    el.getAttribute("intent") === "danger" ? "alert" : "status"
  );
}

function syncFallbackIcon(el) {
  const intent = el.getAttribute("intent") || "info";
  el.$$(".icon__fallback").forEach((icon) => {
    icon.hidden = icon.getAttribute("data-intent") !== intent;
  });
}

function dismiss(el, reason) {
  if (el.hasAttribute("hidden")) return;

  const event = el.emit("lds-dismiss", { reason: reason });
  if (event.defaultPrevented) return;

  el.setAttribute("hidden", "");
}

function slotEmpty(slot) {
  return slot.assignedNodes({ flatten: true }).every(
    (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim()
  );
}

function watchSlot(el, slotSel, wrapSel) {
  const slot = el.$(slotSel);
  const wrap = el.$(wrapSel);
  if (!slot || !wrap) return;

  const update = () => wrap.toggleAttribute("data-empty", slotEmpty(slot));
  slot.addEventListener("slotchange", update);
  update();
}

function watchDescription(el) {
  const named = el.$('slot[name="description"]');
  const def = el.$(".description > slot:not([name])");
  const wrap = el.$(".description");
  if (!wrap) return;

  const update = () => {
    const empty =
      (!named || slotEmpty(named)) && (!def || slotEmpty(def));
    wrap.toggleAttribute("data-empty", empty);
  };

  if (named) named.addEventListener("slotchange", update);
  if (def) def.addEventListener("slotchange", update);
  update();
}

function watchIconSlot(el) {
  const slot = el.$('slot[name="icon"]');
  const wrap = el.$(".icon");
  if (!slot || !wrap) return;

  const update = () => {
    const empty = slotEmpty(slot);
    wrap.toggleAttribute("data-empty-slot", empty);
    el.$$(".icon__fallback").forEach((icon) => {
      if (!empty) icon.hidden = true;
      else icon.hidden = icon.getAttribute("data-intent") !== (el.getAttribute("intent") || "info");
    });
  };

  slot.addEventListener("slotchange", update);
  update();
}
