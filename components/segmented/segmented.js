/* Behaviour for <lds-segmented> — a radiogroup of lds-segment children.
 *
 * Roving tabindex: only the checked segment is in the tab order, arrow keys
 * move and select at once, as native radios do. Form-associated, so a
 * segmented control inside a form submits its value under name.
 */

LDS.behavior("lds-segmented", {
  connected(el) {
    if (el._lds.segDefault == null) el._lds.segDefault = el.getAttribute("value") || "";
    const track = el.$(".track");

    el.addEventListener("click", (event) => {
      const segment = segmentFrom(el, event.target);
      if (!segment || !enabled(el, segment)) return;
      choose(el, segment, false);
    });

    /* Key events from slotted segments pass through the track. */
    track.addEventListener("keydown", (event) => onKeydown(el, event));

    el.$("slot").addEventListener("slotchange", () => sync(el));
    sync(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el);
  },

  formReset(el) {
    el.setAttribute("value", el._lds.segDefault || "");
  },

  formDisabled(el, disabled) {
    el.toggleAttribute("disabled", disabled);
  },

  formStateRestore(el, state) {
    if (state != null) el.setAttribute("value", String(state));
  },
});

function segmentsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll(":scope > lds-segment"));
}

function segmentFrom(el, node) {
  while (node && node !== el) {
    if (node.tagName === "LDS-SEGMENT" && node.parentElement === el) return node;
    node = node.parentElement;
  }
  return null;
}

function valueOf(segment) {
  return segment.getAttribute("value") || segment.textContent.trim();
}

function enabled(el, segment) {
  return !el.boolAttr("disabled") && !segment.hasAttribute("disabled");
}

function sync(el) {
  const track = el.$(".track");
  const label = el.getAttribute("label");
  if (label) track.setAttribute("aria-label", label);
  else track.removeAttribute("aria-label");

  const segments = segmentsOf(el);
  let value = el.getAttribute("value");
  if (!value && segments.length) {
    value = valueOf(segments[0]);
    el.setAttribute("value", value);
    return;
  }

  segments.forEach((segment) => {
    const checked = valueOf(segment) === value;
    segment.setAttribute("role", "radio");
    segment.setAttribute("aria-checked", checked ? "true" : "false");
    segment.tabIndex = checked && enabled(el, segment) ? 0 : -1;
    if (enabled(el, segment)) segment.removeAttribute("aria-disabled");
    else segment.setAttribute("aria-disabled", "true");
  });

  /* If the checked segment cannot take focus, keep the group reachable. */
  if (!segments.some((s) => s.tabIndex === 0)) {
    const first = segments.find((s) => enabled(el, s));
    if (first) first.tabIndex = 0;
  }

  if (el.internals) el.internals.setFormValue(value || "");
}

function choose(el, segment, focus) {
  const value = valueOf(segment);
  if (focus) segment.focus();
  if (value === el.getAttribute("value")) return;
  el.setAttribute("value", value);
  el.emit("lds-change", { value: value });
}

function onKeydown(el, event) {
  const segments = segmentsOf(el).filter((s) => enabled(el, s));
  if (!segments.length) return;
  const current = segments.indexOf(segmentFrom(el, event.target));
  let next;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % segments.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + segments.length) % segments.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = segments.length - 1;
  else if (event.key === " " || event.key === "Enter") next = Math.max(current, 0);
  else return;
  event.preventDefault();
  event.stopPropagation();
  choose(el, segments[next], true);
}
