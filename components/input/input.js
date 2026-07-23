/* Behaviour for <lds-input> — form-associated text control. */

LDS.behavior("lds-input", {
  connected(el) {
    const input = el.$(".input");
    watchSlot(el, 'slot[name="prefix"]', ".prefix");
    watchSlot(el, 'slot[name="suffix"]', ".suffix");
    sync(el, input);

    input.addEventListener("input", () => {
      el.setAttribute("value", input.value);
      setValue(el, input.value);
      el.emit("lds-input", { value: input.value });
    });
    input.addEventListener("change", () => {
      el.emit("lds-change", { value: input.value });
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
    const initial = el.getAttribute("value") || "";
    const input = el.$(".input");
    if (input) input.value = initial;
    setValue(el, initial);
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
    const input = el.$(".input");
    if (input) input.disabled = disabled;
  },

  formStateRestore(el, state) {
    if (state == null) return;
    const value = String(state);
    el.setAttribute("value", value);
    const input = el.$(".input");
    if (input) input.value = value;
    setValue(el, value);
  },
});

function sync(el, input) {
  if (!input) return;
  const type = el.getAttribute("type") || "text";
  input.type = type;
  input.placeholder = el.getAttribute("placeholder") || "";
  input.disabled = el.boolAttr("disabled");
  input.readOnly = el.boolAttr("readonly");
  input.required = el.boolAttr("required");
  input.name = el.getAttribute("name") || "";

  if (el.hasAttribute("value") && input.value !== el.getAttribute("value")) {
    input.value = el.getAttribute("value") || "";
  }
  if (el.hasAttribute("min")) input.min = el.getAttribute("min");
  else input.removeAttribute("min");
  if (el.hasAttribute("max")) input.max = el.getAttribute("max");
  else input.removeAttribute("max");
  if (el.hasAttribute("step")) input.step = el.getAttribute("step");
  else input.removeAttribute("step");
  if (el.hasAttribute("maxlength")) input.maxLength = Number(el.getAttribute("maxlength"));
  else input.removeAttribute("maxlength");

  const invalid = el.boolAttr("invalid") || el.getAttribute("aria-invalid") === "true";
  input.setAttribute("aria-invalid", invalid ? "true" : "false");
  if (!invalid) input.removeAttribute("aria-invalid");

  setValue(el, input.value);
}

function setValue(el, value) {
  if (el.internals) el.internals.setFormValue(value == null ? "" : String(value));
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
