/* Behaviour for <lds-tabs> — tablist from lds-tab-panel children. */

LDS.behavior("lds-tabs", {
  connected(el) {
    const tablist = el.$(".tablist");

    tablist.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-name]");
      if (!btn || !tablist.contains(btn)) return;
      selectTab(el, btn.getAttribute("data-name"), { focus: false });
    });

    tablist.addEventListener("keydown", (event) => {
      const buttons = tabButtons(el);
      if (!buttons.length) return;
      const current = buttons.indexOf(document.activeElement);
      if (current < 0) return;

      let next = current;
      if (event.key === "ArrowRight") next = (current + 1) % buttons.length;
      else if (event.key === "ArrowLeft") next = (current - 1 + buttons.length) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;

      event.preventDefault();
      const name = buttons[next].getAttribute("data-name");
      const activation = el.getAttribute("activation") || "auto";
      if (activation === "manual") {
        buttons[next].focus();
      } else {
        selectTab(el, name, { focus: true });
      }
    });

    const mo = new MutationObserver(() => sync(el));
    mo.observe(el, { childList: true, attributes: true, attributeFilter: ["name", "label"] });
    el._lds.tabsMo = mo;

    const slot = el.$("slot");
    if (slot) slot.addEventListener("slotchange", () => sync(el));

    sync(el);
  },

  disconnected(el) {
    if (el._lds.tabsMo) {
      el._lds.tabsMo.disconnect();
      el._lds.tabsMo = null;
    }
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "value") sync(el);
  },
});

function panelsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll(":scope > lds-tab-panel"));
}

function tabButtons(el) {
  return Array.prototype.slice.call(el.$$(".tablist .tab"));
}

function sync(el) {
  const tablist = el.$(".tablist");
  const panels = panelsOf(el);
  let value = el.getAttribute("value");
  if (!value && panels[0]) value = panels[0].getAttribute("name") || "";
  if (value && !panels.some((p) => p.getAttribute("name") === value) && panels[0]) {
    value = panels[0].getAttribute("name") || "";
  }
  if (value && el.getAttribute("value") !== value) {
    el.setAttribute("value", value);
  }

  tablist.innerHTML = "";
  panels.forEach((panel, index) => {
    const name = panel.getAttribute("name") || "tab-" + index;
    if (!panel.getAttribute("name")) panel.setAttribute("name", name);
    const label = panel.getAttribute("label") || name;
    const selected = name === value;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.setAttribute("role", "tab");
    btn.setAttribute("data-name", name);
    btn.id = el.tagName.toLowerCase() + "-tab-" + name;
    btn.setAttribute("aria-selected", selected ? "true" : "false");
    btn.tabIndex = selected ? 0 : -1;
    btn.textContent = label;
    tablist.appendChild(btn);

    panel.toggleAttribute("active", selected);
    panel.hidden = !selected;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", btn.id);
  });
}

function selectTab(el, name, opts) {
  opts = opts || {};
  if (!name || el.getAttribute("value") === name) {
    if (opts.focus) {
      const btn = el.$('.tablist .tab[data-name="' + name + '"]');
      if (btn) btn.focus();
    }
    return;
  }
  const event = el.emit("lds-change", { value: name });
  if (event.defaultPrevented) return;
  el.setAttribute("value", name);
  if (opts.focus) {
    requestAnimationFrame(() => {
      const btn = el.$('.tablist .tab[data-name="' + name + '"]');
      if (btn) btn.focus();
    });
  }
}
