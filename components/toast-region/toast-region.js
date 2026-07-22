/* Behaviour for <lds-toast-region> and the LDS.toast() entry point.
 *
 * Escape dismisses the newest open toast. LDS.toast() ensures a region exists
 * on document.body, builds a managed <lds-toast>, and opens it.
 */

const regionState = new WeakMap();

LDS.behavior("lds-toast-region", {
  connected(el) {
    if (!el.hasAttribute("role")) el.setAttribute("role", "region");
    if (!el.hasAttribute("aria-label")) {
      el.setAttribute("aria-label", "Notifications");
    }
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-relevant", "additions text");

    const onKeydown = function (event) {
      if (event.key !== "Escape") return;
      const open = openToasts(el);
      if (!open.length) return;
      const newest = open[open.length - 1];
      if (typeof LDS._dismissToast === "function") {
        LDS._dismissToast(newest, "escape");
      }
    };

    const slot = el.$("slot");
    const syncListener = function () {
      const s = regionState.get(el);
      if (!s) return;
      const has = openToasts(el).length > 0 || toastsOf(el).length > 0;
      if (has && !s.listening) {
        document.addEventListener("keydown", onKeydown);
        s.listening = true;
      } else if (!has && s.listening) {
        document.removeEventListener("keydown", onKeydown);
        s.listening = false;
      }
    };

    if (slot) slot.addEventListener("slotchange", syncListener);

    const mo = new MutationObserver(syncListener);
    mo.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });

    regionState.set(el, { onKeydown: onKeydown, mo: mo, listening: false });
    syncListener();
  },

  disconnected(el) {
    const s = regionState.get(el);
    if (!s) return;
    document.removeEventListener("keydown", s.onKeydown);
    s.mo.disconnect();
    regionState.delete(el);
  },
});

function toastsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll("lds-toast"));
}

function openToasts(el) {
  return toastsOf(el).filter(function (toast) {
    return toast.hasAttribute("open") && toast.getAttribute("open") !== "false";
  });
}

/**
 * Show a transient toast in the page toast region.
 *
 * @param {object} [opts]
 * @param {"info"|"success"|"warning"|"danger"} [opts.intent]
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {number} [opts.duration] ms; 0 = sticky
 * @param {boolean} [opts.dismissible] default true
 * @param {"top-start"|"top-end"|"bottom-start"|"bottom-end"} [opts.placement]
 * @returns {HTMLElement} the <lds-toast> element
 */
LDS.toast = function (opts) {
  opts = opts || {};

  let region = null;
  if (opts.placement) {
    region = document.querySelector(
      'lds-toast-region[placement="' + opts.placement + '"]'
    );
  }
  if (!region) region = document.querySelector("lds-toast-region");
  if (!region) {
    region = document.createElement("lds-toast-region");
    if (opts.placement) region.setAttribute("placement", opts.placement);
    document.body.appendChild(region);
  }

  const toast = document.createElement("lds-toast");
  toast.setAttribute("data-managed", "");

  const intent = opts.intent || "info";
  toast.setAttribute("intent", intent);

  if (opts.duration != null) {
    toast.setAttribute("duration", String(opts.duration));
  }

  if (opts.dismissible === false) {
    toast.setAttribute("dismissible", "false");
  }

  if (opts.title) {
    const title = document.createElement("span");
    title.slot = "title";
    title.textContent = String(opts.title);
    toast.appendChild(title);
  }

  if (opts.description) {
    toast.appendChild(document.createTextNode(String(opts.description)));
  }

  region.appendChild(toast);
  toast.setAttribute("open", "");
  return toast;
};
