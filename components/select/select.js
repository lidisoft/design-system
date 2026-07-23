/* Behaviour for <lds-select> — native <select> with cloned light-DOM options. */

LDS.behavior("lds-select", {
  connected(el) {
    const select = el.$(".select");
    const slot = el.$("slot");

    syncOptions(el, select);
    sync(el, select);

    select.addEventListener("change", () => {
      el.setAttribute("value", select.value);
      setValue(el, select.value);
      el.emit("lds-change", { value: select.value });
    });

    if (slot) {
      slot.addEventListener("slotchange", () => {
        syncOptions(el, select);
        sync(el, select);
      });
    }

    const mo = new MutationObserver(() => {
      syncOptions(el, select);
      sync(el, select);
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
    el._lds.selectMo = mo;

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

  disconnected(el) {
    if (el._lds.selectMo) {
      el._lds.selectMo.disconnect();
      el._lds.selectMo = null;
    }
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el, el.$(".select"));
  },

  formReset(el) {
    const select = el.$(".select");
    const initial = el.getAttribute("value");
    if (select) {
      if (initial != null) select.value = initial;
      else select.selectedIndex = 0;
      setValue(el, select.value);
    }
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
    const select = el.$(".select");
    if (select) select.disabled = disabled;
  },

  formStateRestore(el, state) {
    if (state == null) return;
    const value = String(state);
    el.setAttribute("value", value);
    const select = el.$(".select");
    if (select) select.value = value;
    setValue(el, value);
  },
});

function syncOptions(el, select) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  Array.prototype.forEach.call(el.querySelectorAll(":scope > option, :scope > optgroup"), (node) => {
    select.appendChild(node.cloneNode(true));
  });
  if (current) select.value = current;
}

function sync(el, select) {
  if (!select) return;
  select.disabled = el.boolAttr("disabled");
  select.required = el.boolAttr("required");
  select.name = el.getAttribute("name") || "";

  if (el.hasAttribute("value")) {
    select.value = el.getAttribute("value") || "";
  }
  setValue(el, select.value);
}

function setValue(el, value) {
  if (el.internals) el.internals.setFormValue(value == null ? "" : String(value));
}
