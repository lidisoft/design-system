/* Behaviour for <lds-switch> — immediate toggle, form-associated. */

LDS.behavior("lds-switch", {
  connected(el) {
    const input = el.$(".input");
    watchLabel(el);
    sync(el, input);

    input.addEventListener("change", () => {
      el.toggleAttribute("checked", input.checked);
      setValue(el);
      el.emit("lds-change", {
        checked: input.checked,
        value: el.getAttribute("value") || "on",
      });
    });

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

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el, el.$(".input"));
  },

  formReset(el) {
    if (el._lds.defaultChecked == null) el._lds.defaultChecked = false;
    el.toggleAttribute("checked", el._lds.defaultChecked);
    sync(el, el.$(".input"));
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
    const input = el.$(".input");
    if (input) input.disabled = disabled;
  },

  formStateRestore(el, state) {
    el.toggleAttribute("checked", state != null && state !== "");
    sync(el, el.$(".input"));
  },
});

function sync(el, input) {
  if (!input) return;
  if (el._lds.defaultChecked == null) el._lds.defaultChecked = el.boolAttr("checked");

  input.disabled = el.boolAttr("disabled");
  input.required = el.boolAttr("required");
  input.name = el.getAttribute("name") || "";
  input.value = el.getAttribute("value") || "on";
  input.checked = el.boolAttr("checked");
  input.setAttribute("aria-checked", input.checked ? "true" : "false");
  setValue(el);
}

function setValue(el) {
  if (!el.internals) return;
  if (!el.boolAttr("checked")) {
    el.internals.setFormValue(null);
    return;
  }
  el.internals.setFormValue(el.getAttribute("value") || "on");
}

function watchLabel(el) {
  const slot = el.$("slot");
  const label = el.$(".label");
  if (!slot || !label) return;
  const update = () => {
    const empty = slot.assignedNodes({ flatten: true }).every(
      (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim()
    );
    label.hidden = empty;
  };
  slot.addEventListener("slotchange", update);
  update();
}
