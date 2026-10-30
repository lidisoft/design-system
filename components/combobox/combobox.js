/* Behaviour for <lds-combobox> — filterable single or multiple choice.
 *
 * Focus stays in the shadow <input> the whole time; the highlighted option is
 * conveyed with aria-activedescendant. Options are light-DOM lds-option
 * children, so the reference crosses the shadow boundary outward, which only
 * ARIA element reflection (input.ariaActiveDescendantElement) can express. An
 * id string cannot.
 *
 * Values live in the `value` attribute: one value, or a comma-separated list
 * when `multiple` is set. The form value is a FormData with one entry per
 * value in multiple mode.
 */

const comboState = new WeakMap();
let comboSeq = 0;

LDS.behavior("lds-combobox", {
  connected(el) {
    if (comboState.has(el)) {
      syncAll(el);
      return;
    }
    comboSeq += 1;
    const input = el.$(".input");
    const list = el.$(".list");
    const create = el.$(".create");
    list.id = "lds-combobox-list-" + comboSeq;
    create.id = "lds-combobox-create-" + comboSeq;
    input.setAttribute("aria-controls", list.id);

    const s = {
      open: false,
      editing: false,
      active: null,
      overlay: null,
      reposition: null,
      defaultValue: el.getAttribute("value") || "",
      syncing: false,
    };
    comboState.set(el, s);

    input.addEventListener("input", () => onInput(el));
    input.addEventListener("keydown", (event) => onKeydown(el, event));

    el.$(".control").addEventListener("click", (event) => {
      if (el.boolAttr("disabled")) return;
      if (event.target.closest && event.target.closest("lds-tag")) return;
      input.focus();
      /* Clicking into the text keeps the list open; the rest of the control,
       * chevron included, toggles it. */
      if (!s.open) openList(el);
      else if (event.target !== input) closeList(el);
    });

    /* Keep focus in the input while clicking options. */
    el.$(".panel").addEventListener("pointerdown", (event) => event.preventDefault());
    el.$(".panel").addEventListener("click", (event) => {
      const target = targetFrom(el, event);
      if (target) pick(el, target);
    });
    el.$(".panel").addEventListener("pointermove", (event) => {
      const target = targetFrom(el, event);
      if (target && target !== s.active) setActive(el, target, { scroll: false });
    });

    el.addEventListener("focusout", (event) => {
      if (event.relatedTarget && el.contains(event.relatedTarget)) return;
      /* Focus moving inside our own shadow (a chip's remove button). */
      if (el.shadowRoot.contains(event.relatedTarget)) return;
      closeList(el);
      finishEditing(el);
    });

    const mo = new MutationObserver(() => {
      if (s.syncing) return;
      syncAll(el);
    });
    mo.observe(el, { childList: true, subtree: true, characterData: true, attributeFilter: ["value", "label", "disabled", "keywords"] });
    s.mo = mo;

    syncAll(el);
  },

  disconnected(el) {
    closeList(el);
  },

  attributeChanged(el, name) {
    if (!el._lds.ready || !comboState.has(el)) return;
    if (name === "value" || name === "multiple" || name === "required" || name === "name") syncSelection(el);
    if (name === "disabled" || name === "placeholder" || name === "label" || name === "aria-label") syncInput(el);
    if (name === "disabled" && el.boolAttr("disabled")) closeList(el);
  },

  formReset(el) {
    const s = comboState.get(el);
    if (!s) return;
    el.setAttribute("value", s.defaultValue);
    finishEditing(el);
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
  },

  formStateRestore(el, state) {
    if (state == null) return;
    const values = typeof state === "string" ? splitValues(state) : state.getAll(el.getAttribute("name") || "value");
    el.setAttribute("value", values.join(","));
  },
});

/* ---------------------------------------------------------------- reading */

function optionsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll(":scope > lds-option"));
}

function valueOf(option) {
  const v = option.getAttribute("value");
  return v != null ? v : labelOf(option);
}

/* The label is the default slot's text: everything but the start/end slots. */
function labelOf(option) {
  const explicit = option.getAttribute("label");
  if (explicit) return explicit;
  let text = "";
  option.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute("slot")) return;
    text += node.textContent;
  });
  return text.replace(/\s+/g, " ").trim();
}

function splitValues(raw) {
  return (raw || "").split(",").map((v) => v.trim()).filter(Boolean);
}

function currentValues(el) {
  const values = splitValues(el.getAttribute("value"));
  return el.boolAttr("multiple") ? values : values.slice(0, 1);
}

function findOption(el, value) {
  return optionsOf(el).find((o) => valueOf(o) === value) || null;
}

function targetFrom(el, event) {
  const path = event.composedPath();
  for (const node of path) {
    if (node === el) break;
    if (node.classList && node.classList.contains("create")) return node;
    if (node.tagName === "LDS-OPTION" && node.parentElement === el) return node;
  }
  return null;
}

function isCreate(node) {
  return !!node && node.classList && node.classList.contains("create");
}

/* ---------------------------------------------------------------- syncing */

function syncAll(el) {
  syncInput(el);
  syncSelection(el);
  const s = comboState.get(el);
  if (s && s.open) filter(el);
}

function syncInput(el) {
  const input = el.$(".input");
  input.disabled = el.boolAttr("disabled");
  const label = el.getAttribute("label") || el.getAttribute("aria-label");
  if (label) input.setAttribute("aria-label", label);
  else input.removeAttribute("aria-label");
  const list = el.$(".list");
  if (label) list.setAttribute("aria-label", label);
  list.setAttribute("aria-multiselectable", el.boolAttr("multiple") ? "true" : "false");
  syncPlaceholder(el);
}

function syncPlaceholder(el) {
  const input = el.$(".input");
  const empty = currentValues(el).length === 0;
  input.placeholder = empty || !el.boolAttr("multiple") ? el.getAttribute("placeholder") || "" : "";
}

function syncSelection(el) {
  const s = comboState.get(el);
  s.syncing = true;
  const values = currentValues(el);
  optionsOf(el).forEach((option) => {
    option.setAttribute("aria-selected", values.indexOf(valueOf(option)) >= 0 ? "true" : "false");
  });
  el.$(".list").setAttribute("aria-multiselectable", el.boolAttr("multiple") ? "true" : "false");

  if (el.boolAttr("multiple")) renderChips(el, values);
  else renderChips(el, []);
  renderLead(el, values);
  if (!s.editing && !el.boolAttr("multiple")) {
    const option = values[0] != null ? findOption(el, values[0]) : null;
    el.$(".input").value = option ? labelOf(option) : values[0] || "";
  }
  syncPlaceholder(el);
  syncForm(el, values);
  s.syncing = false;
}

function syncForm(el, values) {
  const internals = el.internals;
  if (!internals) return;
  if (el.boolAttr("multiple")) {
    const data = new FormData();
    const name = el.getAttribute("name") || "value";
    values.forEach((v) => data.append(name, v));
    internals.setFormValue(data);
  } else {
    internals.setFormValue(values[0] || "");
  }
  if (el.boolAttr("required") && values.length === 0) {
    internals.setValidity({ valueMissing: true }, "Select an option.", el.$(".input"));
  } else {
    internals.setValidity({});
  }
}

/* Single mode shows the selected option's start content (an avatar, a status
 * glyph) in front of the text. */
function renderLead(el, values) {
  const lead = el.$(".lead");
  lead.textContent = "";
  lead.hidden = true;
  if (el.boolAttr("multiple") || !values.length) return;
  const option = findOption(el, values[0]);
  const start = option && option.querySelector(':scope > [slot="start"]');
  if (!start) return;
  const clone = start.cloneNode(true);
  clone.removeAttribute("slot");
  clone.removeAttribute("id");
  lead.appendChild(clone);
  lead.hidden = false;
}

function renderChips(el, values) {
  const chips = el.$(".chips");
  chips.textContent = "";
  values.forEach((value) => {
    const option = findOption(el, value);
    const label = option ? labelOf(option) : value;
    const tag = document.createElement("lds-tag");
    tag.setAttribute("size", "sm");
    tag.setAttribute("dismissible", "");
    if (el.boolAttr("disabled")) tag.setAttribute("disabled", "");
    const start = option && option.querySelector(':scope > [slot="start"]');
    if (start) {
      const clone = start.cloneNode(true);
      clone.removeAttribute("id");
      tag.appendChild(clone);
    }
    tag.appendChild(document.createTextNode(label));
    tag.addEventListener("lds-remove", (event) => {
      event.preventDefault();
      setValues(el, currentValues(el).filter((v) => v !== value));
      el.$(".input").focus();
    });
    chips.appendChild(tag);
    const close = tag.$ && tag.$(".tag__close");
    if (close) {
      close.setAttribute("aria-label", "Remove " + label);
      close.tabIndex = -1;
    }
  });
}

function setValues(el, values) {
  el.setAttribute("value", values.join(","));
  el.emit("lds-change", { value: values.join(","), values: values.slice() });
}

/* -------------------------------------------------------------- filtering */

function filter(el) {
  const input = el.$(".input");
  const s = comboState.get(el);
  const query = s.editing ? input.value.trim() : "";
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const manual = el.getAttribute("filter") === "none";
  let visible = 0;
  let exact = false;

  optionsOf(el).forEach((option) => {
    const label = labelOf(option).toLowerCase();
    const haystack = label + " " + valueOf(option).toLowerCase() + " " + (option.getAttribute("keywords") || "").toLowerCase();
    const match = manual || tokens.every((t) => haystack.indexOf(t) >= 0);
    option.hidden = !match;
    if (match) visible += 1;
    if (label === query.toLowerCase()) exact = true;
  });

  const create = el.$(".create");
  const canCreate = el.boolAttr("creatable") && query !== "" && !exact;
  create.hidden = !canCreate;
  el.$(".create__label").textContent = canCreate ? "Create “" + query + "”" : "";

  const empty = el.$(".empty");
  empty.hidden = visible > 0 || canCreate;
  empty.textContent = el.getAttribute("empty") || "No results";
}

function candidates(el) {
  const list = optionsOf(el).filter((o) => !o.hidden && !o.boolAttr("disabled"));
  const create = el.$(".create");
  if (!create.hidden) list.push(create);
  return list;
}

function setActive(el, node, opts) {
  const s = comboState.get(el);
  const input = el.$(".input");
  optionsOf(el).forEach((o) => o.toggleAttribute("data-active", o === node));
  el.$(".create").toggleAttribute("data-active", isCreate(node));
  s.active = node || null;

  if ("ariaActiveDescendantElement" in input) {
    input.ariaActiveDescendantElement = node || null;
  } else if (node) {
    /* Without element reflection only the in-shadow create row resolves. */
    input.setAttribute("aria-activedescendant", node.id);
  } else {
    input.removeAttribute("aria-activedescendant");
  }

  if (node && (!opts || opts.scroll !== false)) node.scrollIntoView({ block: "nearest" });
}

function activateDefault(el) {
  const list = candidates(el);
  const values = currentValues(el);
  const selected = list.find((o) => !isCreate(o) && values.indexOf(valueOf(o)) >= 0);
  setActive(el, comboState.get(el).editing ? list[0] || null : selected || list[0] || null);
}

function move(el, delta) {
  const list = candidates(el);
  if (!list.length) return;
  const s = comboState.get(el);
  let index = list.indexOf(s.active);
  if (index < 0) index = delta > 0 ? -1 : list.length;
  index = Math.min(Math.max(index + delta, 0), list.length - 1);
  setActive(el, list[index]);
}

/* ---------------------------------------------------------------- open / close */

function openList(el) {
  const s = comboState.get(el);
  if (s.open || el.boolAttr("disabled")) return;
  s.open = true;
  const panel = el.$(".panel");
  panel.hidden = false;
  el.$(".input").setAttribute("aria-expanded", "true");
  filter(el);
  activateDefault(el);
  position(el);

  s.reposition = () => position(el);
  window.addEventListener("resize", s.reposition);
  window.addEventListener("scroll", s.reposition, true);
  s.overlay = LDS.overlay.bind(panel, {
    trapFocus: false,
    ignoreOutside: [el],
    onDismiss: () => closeList(el),
  });
}

function closeList(el) {
  const s = comboState.get(el);
  if (!s || !s.open) return;
  s.open = false;
  el.$(".panel").hidden = true;
  el.$(".input").setAttribute("aria-expanded", "false");
  setActive(el, null);
  if (s.reposition) {
    window.removeEventListener("resize", s.reposition);
    window.removeEventListener("scroll", s.reposition, true);
    s.reposition = null;
  }
  if (s.overlay) {
    s.overlay.disconnect();
    s.overlay = null;
  }
}

function position(el) {
  LDS.position(el.$(".panel"), el.$(".control"), { placement: "bottom-start", matchWidth: true });
}

/* Leave edit mode: single shows the selection again, multiple clears the
 * query. */
function finishEditing(el) {
  const s = comboState.get(el);
  s.editing = false;
  if (el.boolAttr("multiple")) el.$(".input").value = "";
  syncSelection(el);
}

/* ---------------------------------------------------------------- input */

function onInput(el) {
  const s = comboState.get(el);
  const input = el.$(".input");
  s.editing = true;
  if (!s.open) openList(el);
  filter(el);
  setActive(el, input.value.trim() ? candidates(el)[0] || null : null);
  position(el);
  el.emit("lds-search", { query: input.value });
}

function onKeydown(el, event) {
  const s = comboState.get(el);
  const input = el.$(".input");

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (!s.open) openList(el);
      else if (event.altKey) return;
      else move(el, 1);
      return;
    case "ArrowUp":
      event.preventDefault();
      if (!s.open) openList(el);
      else if (event.altKey) closeList(el);
      else move(el, -1);
      return;
    case "Enter":
      if (!s.open || !s.active) return;
      event.preventDefault();
      pick(el, s.active);
      return;
    case "Escape":
      /* An open list is closed by the overlay helper, which handles Escape
       * first and cancels it. Only an Escape on a closed list abandons the
       * typed text. */
      if (s.open || event.defaultPrevented) return;
      if (s.editing || input.value) {
        event.preventDefault();
        finishEditing(el);
      }
      return;
    case "Backspace":
      if (el.boolAttr("multiple") && input.value === "" && input.selectionStart === 0) {
        const values = currentValues(el);
        if (values.length) {
          event.preventDefault();
          setValues(el, values.slice(0, -1));
        }
      }
      return;
    case "Tab":
      closeList(el);
      return;
    default:
      return;
  }
}

/* ---------------------------------------------------------------- choosing */

function pick(el, node) {
  const s = comboState.get(el);
  const input = el.$(".input");

  if (isCreate(node)) {
    const query = input.value.trim();
    if (!query) return;
    const ev = el.emit("lds-create", { value: query });
    if (ev.defaultPrevented) return;
    const option = document.createElement("lds-option");
    option.setAttribute("value", query.replace(/,/g, " "));
    option.textContent = query;
    el.appendChild(option);
    node = option;
  }

  if (node.boolAttr && node.boolAttr("disabled")) return;
  const value = valueOf(node);

  if (el.boolAttr("multiple")) {
    const values = currentValues(el);
    const next = values.indexOf(value) >= 0 ? values.filter((v) => v !== value) : values.concat(value);
    input.value = "";
    s.editing = false;
    setValues(el, next);
    filter(el);
    setActive(el, node, { scroll: false });
    position(el);
    return;
  }

  s.editing = false;
  closeList(el);
  if (currentValues(el)[0] !== value) setValues(el, [value]);
  else syncSelection(el);
}
