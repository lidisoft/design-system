/* Behaviour for <lds-button>.
 *
 * Two problems the platform does not solve for us:
 *
 * 1. A <button type="submit"> inside a shadow root does not submit the form in
 *    the surrounding document — the shadow boundary stops form association. We
 *    forward the activation manually.
 * 2. Click events still bubble out of a disabled host, because the host element
 *    itself is not disabled, only the inner button. We stop them at the host.
 *
 * Hooks receive the host element; `el.$()`, `el.boolAttr()` and `el.emit()` come
 * from the runtime base class in runtime/base.js.
 */

LDS.behavior("lds-button", {
  connected(el) {
    const button = el.$(".btn");

    syncDisabled(el, button);
    syncLabel(el, button);
    watchDefaultSlot(el);

    /* Capture on the host so a click on a disabled or loading button never
     * reaches listeners the consuming page attached. */
    el.addEventListener(
      "click",
      (event) => {
        if (el.boolAttr("disabled") || el.boolAttr("loading")) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        const activation = el.emit("lds-click", { originalEvent: event });
        if (activation.defaultPrevented) return;

        forwardToForm(el);
      },
      true
    );
  },

  attributeChanged(el, name) {
    const button = el.$(".btn");
    if (!button) return; /* changed before first connect */

    if (name === "disabled" || name === "loading") syncDisabled(el, button);
    if (name === "label") syncLabel(el, button);
  },
});

function syncDisabled(el, button) {
  const loading = el.boolAttr("loading");

  /* Only `disabled` leaves the tab order. A loading button stays focusable so
   * keyboard users are not thrown back to the top of the document mid-request. */
  button.disabled = el.boolAttr("disabled");
  button.setAttribute("aria-busy", loading ? "true" : "false");
}

function syncLabel(el, button) {
  const label = el.getAttribute("label");
  if (label) {
    button.setAttribute("aria-label", label);
  } else {
    button.removeAttribute("aria-label");
  }
}

/* CSS has no "does this slot have content" selector, so mirror it onto an
 * attribute the stylesheet can key off. */
function watchDefaultSlot(el) {
  const slot = el.$(".btn__label slot");
  const label = el.$(".btn__label");
  if (!slot || !label) return;

  const update = () => {
    const empty = slot.assignedNodes({ flatten: true }).every(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() === ""
    );
    label.toggleAttribute("data-empty", empty);
  };

  slot.addEventListener("slotchange", update);
  update();
}

function forwardToForm(el) {
  const type = el.getAttribute("type");
  if (type !== "submit" && type !== "reset") return;

  const form = el.closest("form");
  if (!form) return;

  if (type === "reset") {
    form.reset();
    return;
  }

  /* requestSubmit runs validation and fires submit, unlike form.submit(). */
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }
}
