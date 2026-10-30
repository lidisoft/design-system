/* Behaviour for <lds-date-range> — two native date inputs, one form value.
 *
 * The form value is an ISO 8601 interval, "start/end", so one field carries
 * both dates. Each input bounds the other (end.min = start, start.max = end)
 * and a reversed range is reported through the Constraint Validation API.
 */

LDS.behavior("lds-date-range", {
  connected(el) {
    if (el._lds.rangeDefault == null) {
      el._lds.rangeDefault = { start: el.getAttribute("start") || "", end: el.getAttribute("end") || "" };
    }
    const start = el.$(".start");
    const end = el.$(".end");
    watchSlot(el, 'slot[name="prefix"]', ".prefix");

    for (const input of [start, end]) {
      const attr = input === start ? "start" : "end";
      input.addEventListener("input", () => {
        el.setAttribute(attr, input.value);
      });
      input.addEventListener("change", () => {
        el.emit("lds-change", { start: start.value, end: end.value, value: rangeValue(start.value, end.value) });
      });
    }

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

    sync(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el);
  },

  formReset(el) {
    const d = el._lds.rangeDefault || { start: "", end: "" };
    el.setAttribute("start", d.start);
    el.setAttribute("end", d.end);
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
  },

  formStateRestore(el, state) {
    if (typeof state !== "string") return;
    const parts = state.split("/");
    el.setAttribute("start", parts[0] || "");
    el.setAttribute("end", parts[1] || "");
  },
});

function rangeValue(start, end) {
  return start || end ? start + "/" + end : "";
}

function sync(el) {
  const start = el.$(".start");
  const end = el.$(".end");
  const disabled = el.boolAttr("disabled");
  const required = el.boolAttr("required");

  /* Assign only on change: rewriting a native date input resets the segment
   * the user is typing in. */
  const startAttr = el.getAttribute("start") || "";
  const endAttr = el.getAttribute("end") || "";
  if (start.value !== startAttr) start.value = startAttr;
  if (end.value !== endAttr) end.value = endAttr;

  start.setAttribute("aria-label", el.getAttribute("start-label") || "Start date");
  end.setAttribute("aria-label", el.getAttribute("end-label") || "End date");
  const label = el.getAttribute("label");
  if (label) el.$(".wrap").setAttribute("aria-label", label);
  else el.$(".wrap").removeAttribute("aria-label");

  for (const input of [start, end]) {
    input.disabled = disabled;
    input.required = required;
    const invalid = el.boolAttr("invalid") || el.getAttribute("aria-invalid") === "true";
    if (invalid) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  /* Each date bounds the other, inside the overall min/max. */
  const min = el.getAttribute("min") || "";
  const max = el.getAttribute("max") || "";
  setBound(start, "min", min);
  setBound(start, "max", end.value || max);
  setBound(end, "min", start.value || min);
  setBound(end, "max", max);

  if (!el.internals) return;
  el.internals.setFormValue(rangeValue(start.value, end.value));

  if (required && (!start.value || !end.value)) {
    el.internals.setValidity({ valueMissing: true }, "Enter a start and an end date.", start.value ? end : start);
  } else if (start.value && end.value && end.value < start.value) {
    el.internals.setValidity({ rangeUnderflow: true }, "The end date is before the start date.", end);
  } else if ((min && start.value && start.value < min) || (max && end.value && end.value > max)) {
    el.internals.setValidity({ rangeOverflow: true }, "The dates are outside the allowed range.", start);
  } else {
    el.internals.setValidity({});
  }
}

function setBound(input, name, value) {
  if (value) input.setAttribute(name, value);
  else input.removeAttribute(name);
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
