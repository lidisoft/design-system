/* Behaviour for <lds-progress>. */

LDS.behavior("lds-progress", {
  connected(el) {
    sync(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    sync(el);
  },
});

function sync(el) {
  const variant = el.getAttribute("variant") || "linear";
  const indeterminate = el.boolAttr("indeterminate");
  const max = Math.max(0.0001, num(el, "max", 100));
  let value = num(el, "value", 0);
  if (value < 0) value = 0;
  if (value > max) value = max;
  const ratio = indeterminate ? 0 : value / max;

  const linear = el.$(".linear");
  const circular = el.$(".circular");
  const bar = el.$(".bar");
  const ringBar = el.$(".ring__bar");
  const label = el.$(".label");

  linear.hidden = variant === "circular";
  circular.hidden = variant !== "circular";

  if (!indeterminate) {
    bar.style.width = percentage(ratio);
    const circ = 2 * Math.PI * 14;
    ringBar.style.strokeDasharray = String(circ);
    ringBar.style.strokeDashoffset = String(circ * (1 - ratio));
  } else {
    bar.style.width = "";
    ringBar.style.strokeDashoffset = "";
  }

  el.setAttribute("role", "progressbar");
  if (indeterminate) {
    el.removeAttribute("aria-valuenow");
    el.removeAttribute("aria-valuemin");
    el.removeAttribute("aria-valuemax");
  } else {
    el.setAttribute("aria-valuemin", "0");
    el.setAttribute("aria-valuemax", String(max));
    el.setAttribute("aria-valuenow", String(value));
  }

  const labelText = el.getAttribute("label");
  if (labelText) {
    label.hidden = false;
    label.textContent = labelText;
    el.setAttribute("aria-label", labelText);
  } else {
    label.hidden = true;
    label.textContent = "";
    if (!el.hasAttribute("aria-label")) {
      el.setAttribute("aria-label", "Progress");
    }
  }
}

function num(el, name, fallback) {
  const raw = el.getAttribute(name);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function percentage(ratio) {
  return (Math.round(ratio * 1000) / 10) + "%";
}
