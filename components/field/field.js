/* Behaviour for <lds-field> — label / describedby wiring for the control. */

let fieldSeq = 0;

LDS.behavior("lds-field", {
  connected(el) {
    if (!el._lds.fieldId) {
      fieldSeq += 1;
      el._lds.fieldId = "lds-field-" + fieldSeq;
    }

    watchSlot(el, 'slot[name="help"]', ".help");
    watchSlot(el, 'slot[name="error"]', ".error", () => sync(el));

    const slot = el.$(".control slot");
    if (slot) slot.addEventListener("slotchange", () => sync(el));

    sync(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el);
  },
});

function sync(el) {
  const id = el._lds.fieldId;
  const labelEl = el.$(".label");
  const requiredMark = el.$(".required");
  const help = el.$(".help");
  const error = el.$(".error");
  const control = controlOf(el);

  const label = el.getAttribute("label") || "";
  labelEl.textContent = label;

  const required = el.boolAttr("required");
  requiredMark.hidden = !required;

  help.id = id + "-help";
  error.id = id + "-error";

  const hasError = !error.hasAttribute("data-empty");
  const hasHelp = !help.hasAttribute("data-empty");
  el.toggleAttribute("invalid", hasError);

  if (!control) return;

  const controlId = id + "-control";
  if (!control.id) control.id = controlId;
  labelEl.setAttribute("for", control.id);

  const described = [];
  if (hasHelp) described.push(help.id);
  if (hasError) described.push(error.id);
  if (described.length) control.setAttribute("aria-describedby", described.join(" "));
  else control.removeAttribute("aria-describedby");

  if (hasError) {
    control.setAttribute("aria-invalid", "true");
    if (control.setAttribute) control.setAttribute("invalid", "");
  } else {
    control.removeAttribute("aria-invalid");
    if (control.removeAttribute) control.removeAttribute("invalid");
  }

  if (required) {
    if (control.setAttribute) control.setAttribute("required", "");
    if ("required" in control) control.required = true;
  }

  if (label && control.getAttribute && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby")) {
    /* label[for] covers native labelling when the control is the labelled target */
  }
}

function controlOf(el) {
  const slot = el.$(".control slot");
  if (!slot) return null;
  const assigned = slot.assignedElements({ flatten: true });
  for (let i = 0; i < assigned.length; i++) {
    const node = assigned[i];
    if (node.matches && node.matches("lds-input,lds-textarea,lds-select,lds-checkbox,lds-switch,lds-radio-group,input,textarea,select")) {
      return node;
    }
  }
  return assigned[0] || null;
}

function watchSlot(el, slotSel, wrapSel, onChange) {
  const slot = el.$(slotSel);
  const wrap = el.$(wrapSel);
  if (!slot || !wrap) return;
  const update = () => {
    const empty = slot.assignedNodes({ flatten: true }).every(
      (node) => node.nodeType === Node.TEXT_NODE && !node.textContent.trim()
    );
    wrap.toggleAttribute("data-empty", empty);
    if (onChange) onChange();
  };
  slot.addEventListener("slotchange", update);
  update();
}
