/* Behaviour for <lds-nav-item>.
 *
 * Mirrors href / target / active / disabled onto the inner <a>, and blocks
 * activation while disabled (the host itself is not a native disabled control).
 */

LDS.behavior("lds-nav-item", {
  connected(el) {
    const item = el.$(".item");

    syncLink(el, item);
    syncActive(el, item);
    syncDisabled(el, item);
    watchSlot(el, ".item__start slot", ".item__start");
    watchSlot(el, ".item__end slot", ".item__end");
    watchSlot(el, ".item__label slot", ".item__label", () => syncName(el, item));
    syncName(el, item);

    el.addEventListener(
      "click",
      (event) => {
        if (el.boolAttr("disabled")) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true
    );
  },

  attributeChanged(el, name) {
    const item = el.$(".item");
    if (!item) return;

    if (name === "href" || name === "target") syncLink(el, item);
    if (name === "active") syncActive(el, item);
    if (name === "disabled") syncDisabled(el, item);
    if (name === "label") syncName(el, item);
  },
});

function syncLink(el, item) {
  const href = el.getAttribute("href");
  if (href) {
    item.setAttribute("href", href);
  } else {
    item.removeAttribute("href");
  }

  const target = el.getAttribute("target");
  if (target) {
    item.setAttribute("target", target);
    if (target === "_blank" && !item.hasAttribute("rel")) {
      item.setAttribute("rel", "noopener noreferrer");
    }
  } else {
    item.removeAttribute("target");
  }
}

function syncActive(el, item) {
  if (el.boolAttr("active")) {
    item.setAttribute("aria-current", "page");
  } else {
    item.removeAttribute("aria-current");
  }
}

function syncDisabled(el, item) {
  const disabled = el.boolAttr("disabled");
  item.toggleAttribute("aria-disabled", disabled);
  if (disabled) {
    item.setAttribute("tabindex", "-1");
  } else {
    item.removeAttribute("tabindex");
  }
}

/* Keep an accessible name when the visible label is hidden in a collapsed rail. */
function syncName(el, item) {
  const explicit = el.getAttribute("label");
  if (explicit) {
    item.setAttribute("aria-label", explicit);
    return;
  }

  const slot = el.$(".item__label slot");
  if (!slot) return;

  const text = slot
    .assignedNodes({ flatten: true })
    .map((node) => node.textContent || "")
    .join("")
    .trim();

  if (text) {
    item.setAttribute("aria-label", text);
  } else {
    item.removeAttribute("aria-label");
  }
}

function watchSlot(el, slotSel, wrapSel, onChange) {
  const slot = el.$(slotSel);
  const wrap = el.$(wrapSel);
  if (!slot || !wrap) return;

  const update = () => {
    const empty = slot.assignedNodes({ flatten: true }).every(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() === ""
    );
    wrap.toggleAttribute("data-empty", empty);
    if (onChange) onChange();
  };

  slot.addEventListener("slotchange", update);
  update();
}
