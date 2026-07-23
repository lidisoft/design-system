/* Behaviour for <lds-radio-group> — FACE group with roving tabindex. */

LDS.behavior("lds-radio-group", {
  connected(el) {
    const group = el.$(".options");
    sync(el);

    group.addEventListener("click", (event) => {
      if (el.boolAttr("disabled")) return;
      const option = optionFromEvent(el, event.target);
      if (!option || optionDisabled(option)) return;
      select(el, valueOf(option), { focus: false });
    });

    group.addEventListener("keydown", (event) => {
      if (el.boolAttr("disabled")) return;
      const options = enabledOptions(el);
      if (!options.length) return;
      const current = options.indexOf(document.activeElement);
      if (current < 0 && !isOption(document.activeElement)) return;

      const horizontal = el.getAttribute("orientation") === "horizontal";
      let next = current < 0 ? 0 : current;
      if (event.key === "ArrowDown" || (horizontal && event.key === "ArrowRight")) {
        next = (Math.max(current, 0) + 1) % options.length;
      } else if (event.key === "ArrowUp" || (horizontal && event.key === "ArrowLeft")) {
        next = (Math.max(current, 0) - 1 + options.length) % options.length;
      } else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = options.length - 1;
      else if (event.key === " " || event.key === "Enter") {
        const active = document.activeElement;
        if (isOption(active) && el.contains(active)) {
          event.preventDefault();
          select(el, valueOf(active), { focus: true });
        }
        return;
      } else return;

      event.preventDefault();
      select(el, valueOf(options[next]), { focus: true });
    });

    const slot = el.$("slot");
    if (slot) slot.addEventListener("slotchange", () => sync(el));

    const mo = new MutationObserver(() => {
      if (el._lds.radioSyncing) return;
      sync(el);
    });
    mo.observe(el, { childList: true });
    el._lds.radioMo = mo;
  },

  disconnected(el) {
    if (el._lds.radioMo) {
      el._lds.radioMo.disconnect();
      el._lds.radioMo = null;
    }
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el);
  },

  formReset(el) {
    const initial = el._lds.defaultValue;
    if (initial == null) return;
    el.setAttribute("value", initial);
    sync(el);
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
    sync(el);
  },

  formStateRestore(el, state) {
    if (state == null) return;
    el.setAttribute("value", String(state));
    sync(el);
  },
});

function sync(el) {
  el._lds.radioSyncing = true;
  const group = el.$(".options");
  const labelEl = el.$(".label");
  const label = el.getAttribute("label") || "";
  labelEl.textContent = label;
  labelEl.hidden = !label;

  if (el._lds.defaultValue == null) {
    el._lds.defaultValue = el.getAttribute("value") || "";
  }

  const options = allOptions(el);
  let value = el.getAttribute("value");
  if (value == null || value === "") {
    const checked = options.find((o) => o.getAttribute("aria-checked") === "true");
    value = checked ? valueOf(checked) : options[0] ? valueOf(options[0]) : "";
    if (value) el.setAttribute("value", value);
  }

  group.setAttribute("role", "radiogroup");
  if (label) group.setAttribute("aria-label", label);
  else group.removeAttribute("aria-label");
  if (el.boolAttr("disabled")) group.setAttribute("aria-disabled", "true");
  else group.removeAttribute("aria-disabled");

  options.forEach((option, index) => {
    const v = valueOf(option);
    const selected = v === value;
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", selected ? "true" : "false");
    option.tabIndex = selected ? 0 : -1;
    if (option.tagName === "BUTTON" && !option.getAttribute("type")) {
      option.setAttribute("type", "button");
    }
    if (el.boolAttr("disabled") || optionDisabled(option)) {
      option.setAttribute("aria-disabled", "true");
      option.tabIndex = -1;
    } else {
      option.removeAttribute("aria-disabled");
    }
  });

  setValue(el, value);
  el._lds.radioSyncing = false;
}

function select(el, value, opts) {
  if (value == null) return;
  el.setAttribute("value", value);
  sync(el);
  if (opts && opts.focus) {
    const option = allOptions(el).find((o) => valueOf(o) === value);
    if (option) option.focus();
  }
  el.emit("lds-change", { value: value });
}

function setValue(el, value) {
  if (el.internals) el.internals.setFormValue(value == null ? "" : String(value));
}

function allOptions(el) {
  const slot = el.$("slot");
  if (!slot) return [];
  return slot
    .assignedElements({ flatten: true })
    .filter((node) => node.hasAttribute("value") || node.tagName === "BUTTON");
}

function enabledOptions(el) {
  return allOptions(el).filter((o) => !optionDisabled(o) && !el.boolAttr("disabled"));
}

function optionFromEvent(el, target) {
  const options = allOptions(el);
  let node = target;
  while (node && node !== el) {
    if (options.indexOf(node) >= 0) return node;
    node = node.parentElement;
  }
  return null;
}

function isOption(node) {
  return node && node.getAttribute && node.getAttribute("role") === "radio";
}

function valueOf(option) {
  return option.getAttribute("value") || option.value || option.textContent.trim();
}

function optionDisabled(option) {
  return option.hasAttribute("disabled") || option.getAttribute("aria-disabled") === "true";
}
