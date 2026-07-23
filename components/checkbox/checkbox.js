/* Behaviour for <lds-checkbox> — form-associated boolean with indeterminate. */

LDS.behavior("lds-checkbox", {
  connected(el) {
    const input = el.$(".input");
    watchLabel(el);
    sync(el, input);

    input.addEventListener("change", () => {
      el.toggleAttribute("checked", input.checked);
      if (input.checked) el.removeAttribute("indeterminate");
      setValue(el);
      el.emit("lds-change", {
        checked: input.checked,
        indeterminate: false,
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

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "indeterminate" || name === "checked" || name === "disabled" || name === "required" || name === "name" || name === "value") {
      sync(el, el.$(".input"));
    }
  },

  formReset(el) {
    if (el._lds.defaultChecked == null) el._lds.defaultChecked = false;
    el.toggleAttribute("checked", el._lds.defaultChecked);
    el.removeAttribute("indeterminate");
    sync(el, el.$(".input"));
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
    const input = el.$(".input");
    if (input) input.disabled = disabled;
  },

  formStateRestore(el, state) {
    const checked = state != null && state !== "";
    el.toggleAttribute("checked", checked);
    el.removeAttribute("indeterminate");
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

  const indeterminate = el.boolAttr("indeterminate");
  input.indeterminate = indeterminate;
  input.checked = !indeterminate && el.boolAttr("checked");
  if (indeterminate) el.setAttribute("aria-checked", "mixed");
  else el.setAttribute("aria-checked", input.checked ? "true" : "false");

  setValue(el);
}

function setValue(el) {
  if (!el.internals) return;
  const input = el.$(".input");
  if (!input || input.indeterminate || !input.checked) {
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
