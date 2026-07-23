/* Behaviour for <lds-command-item> — option inside lds-command. */

LDS.behavior("lds-command-item", {
  connected(el) {
    ensureControl(el);
    watchSlot(el, ".item__start slot", ".item__start");
    watchSlot(el, ".item__end slot", ".item__end");

    el.addEventListener(
      "click",
      (event) => {
        if (el.boolAttr("disabled")) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        activate(el, event);
      },
      true
    );

    el.addEventListener("pointermove", () => {
      if (el.boolAttr("disabled") || el.hidden) return;
      const command = el.closest("lds-command");
      if (!command || !command.boolAttr("open")) return;
      /* Parent owns aria-activedescendant; mirror hover into data-active. */
      command.querySelectorAll("lds-command-item[data-active]").forEach((node) => {
        if (node !== el) {
          node.removeAttribute("data-active");
          node.setAttribute("aria-selected", "false");
        }
      });
      el.setAttribute("data-active", "");
      el.setAttribute("aria-selected", "true");
      const input = command.$ && command.$(".input");
      if (input && el.id) input.setAttribute("aria-activedescendant", el.id);
    });
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "href" || name === "disabled" || name === "value" || name === "target") {
      ensureControl(el);
    }
  },
});

function ensureControl(el) {
  const wantsLink = !!el.getAttribute("href");
  let item = el.$(".item");
  const tag = wantsLink ? "a" : "button";

  if (!item || item.tagName.toLowerCase() !== tag) {
    const next = document.createElement(tag);
    next.className = "item";
    next.setAttribute("part", "item");
    if (tag === "button") next.type = "button";

    if (item) {
      while (item.firstChild) next.appendChild(item.firstChild);
      item.replaceWith(next);
    } else {
      el.shadowRoot.appendChild(next);
    }
    item = next;
  }

  syncControl(el, item);
}

function syncControl(el, item) {
  const disabled = el.boolAttr("disabled");

  if (item.tagName.toLowerCase() === "a") {
    const href = el.getAttribute("href") || "#";
    item.setAttribute("href", href);
    const target = el.getAttribute("target");
    if (target) {
      item.setAttribute("target", target);
      if (target === "_blank" && !item.hasAttribute("rel")) {
        item.setAttribute("rel", "noopener noreferrer");
      }
    } else {
      item.removeAttribute("target");
    }
    if (disabled) {
      item.setAttribute("aria-disabled", "true");
      item.setAttribute("tabindex", "-1");
    } else {
      item.removeAttribute("aria-disabled");
      item.removeAttribute("tabindex");
    }
  } else {
    item.disabled = disabled;
    item.removeAttribute("aria-disabled");
  }
}

function activate(el, originalEvent) {
  if (el.boolAttr("disabled")) return;

  const detail = { originalEvent: originalEvent };
  const value = el.getAttribute("value");
  if (value != null) detail.value = value;

  el.emit("lds-select", detail);
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
