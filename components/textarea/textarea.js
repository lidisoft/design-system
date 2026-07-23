/* Behaviour for <lds-textarea> — form-associated multi-line control. */

LDS.behavior("lds-textarea", {
  connected(el) {
    const area = el.$(".textarea");
    sync(el, area);

    area.addEventListener("input", () => {
      el.setAttribute("value", area.value);
      setValue(el, area.value);
      updateCounter(el, area);
      if (el.boolAttr("auto-grow")) autoGrow(area);
      el.emit("lds-input", { value: area.value });
    });
    area.addEventListener("change", () => {
      el.emit("lds-change", { value: area.value });
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
    sync(el, el.$(".textarea"));
  },

  formReset(el) {
    const initial = el.getAttribute("value") || "";
    const area = el.$(".textarea");
    if (area) area.value = initial;
    setValue(el, initial);
    updateCounter(el, area);
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
    const area = el.$(".textarea");
    if (area) area.disabled = disabled;
  },

  formStateRestore(el, state) {
    if (state == null) return;
    const value = String(state);
    el.setAttribute("value", value);
    const area = el.$(".textarea");
    if (area) area.value = value;
    setValue(el, value);
    updateCounter(el, area);
  },
});

function sync(el, area) {
  if (!area) return;
  area.placeholder = el.getAttribute("placeholder") || "";
  area.disabled = el.boolAttr("disabled");
  area.readOnly = el.boolAttr("readonly");
  area.required = el.boolAttr("required");
  area.name = el.getAttribute("name") || "";
  area.rows = Math.max(1, Number(el.getAttribute("rows") || 3));

  if (el.hasAttribute("value") && area.value !== el.getAttribute("value")) {
    area.value = el.getAttribute("value") || "";
  }
  if (el.hasAttribute("maxlength")) area.maxLength = Number(el.getAttribute("maxlength"));
  else area.removeAttribute("maxlength");

  updateCounter(el, area);
  if (el.boolAttr("auto-grow")) autoGrow(area);
  setValue(el, area.value);
}

function autoGrow(area) {
  area.style.height = "auto";
  area.style.height = area.scrollHeight + "px";
}

function updateCounter(el, area) {
  const counter = el.$(".counter");
  if (!counter || !area) return;
  const max = el.hasAttribute("maxlength") ? Number(el.getAttribute("maxlength")) : NaN;
  if (!Number.isFinite(max) || max <= 0) {
    counter.hidden = true;
    counter.textContent = "";
    return;
  }
  counter.hidden = false;
  counter.textContent = area.value.length + " / " + max;
}

function setValue(el, value) {
  if (el.internals) el.internals.setFormValue(value == null ? "" : String(value));
}
