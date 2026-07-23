/* Behaviour for <lds-pagination>.
 *
 * Rebuilds page buttons with an ellipsis window, wires prev/next and a native
 * page-size select, and reflects page / page-size after successful events.
 */

const DEFAULT_SIZES = [10, 25, 50, 100];

LDS.behavior("lds-pagination", {
  connected(el) {
    const select = el.$(".sizes__select");
    const pages = el.$(".pages");

    select.addEventListener("change", () => {
      const pageSize = parseInt(select.value, 10);
      if (!Number.isFinite(pageSize) || pageSize < 1) return;
      setPageSize(el, pageSize);
    });

    pages.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-page]");
      if (!btn || btn.disabled || !pages.contains(btn)) return;
      const page = parseInt(btn.getAttribute("data-page"), 10);
      if (!Number.isFinite(page)) return;
      setPage(el, page);
    });

    syncAll(el);
  },

  attributeChanged(el) {
    if (!el._lds.ready) return;
    syncAll(el);
  },
});

function syncAll(el) {
  syncLabel(el);
  syncSizes(el);
  syncSummary(el);
  syncPages(el);
}

function syncLabel(el) {
  const nav = el.$(".root");
  const label = el.getAttribute("label") || "Pagination";
  nav.setAttribute("aria-label", label);
}

function num(el, name, fallback) {
  const raw = el.getAttribute(name);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function totalOf(el) {
  return Math.max(0, Math.floor(num(el, "total", 0)));
}

function pageSizeOf(el) {
  return Math.max(1, Math.floor(num(el, "page-size", 25)));
}

function pageCountOf(el) {
  const total = totalOf(el);
  const size = pageSizeOf(el);
  if (total === 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

function pageOf(el) {
  const max = pageCountOf(el);
  const page = Math.floor(num(el, "page", 1));
  return Math.min(Math.max(1, page), max);
}

function parseSizes(el) {
  const raw = el.getAttribute("sizes");
  if (raw == null) return DEFAULT_SIZES.slice();
  const parts = raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parts.length ? parts : DEFAULT_SIZES.slice();
}

function syncSizes(el) {
  const wrap = el.$(".sizes");
  const select = el.$(".sizes__select");
  const hidden = el.boolAttr("hide-sizes");
  wrap.toggleAttribute("data-hidden", hidden);

  const sizes = parseSizes(el);
  const current = pageSizeOf(el);
  if (sizes.indexOf(current) === -1) sizes.push(current);
  sizes.sort((a, b) => a - b);

  const prev = select.value;
  select.innerHTML = "";
  sizes.forEach((size) => {
    const opt = document.createElement("option");
    opt.value = String(size);
    opt.textContent = String(size);
    select.appendChild(opt);
  });
  select.value = String(current);
  if (select.value !== String(current) && prev) {
    /* keep best effort */
  }
  select.disabled = el.boolAttr("disabled") || hidden;
}

function syncSummary(el) {
  const summary = el.$(".summary");
  const total = totalOf(el);
  if (total === 0) {
    summary.textContent = "";
    summary.toggleAttribute("data-empty", true);
    return;
  }

  const size = pageSizeOf(el);
  const page = pageOf(el);
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  summary.textContent = "Showing " + from + "\u2013" + to + " of " + total;
  summary.toggleAttribute("data-empty", false);
}

function syncPages(el) {
  const host = el.$(".pages");
  const page = pageOf(el);
  const pageCount = pageCountOf(el);
  const disabled = el.boolAttr("disabled");

  host.innerHTML = "";

  host.appendChild(
    pageButton(el, {
      page: page - 1,
      label: "Previous page",
      icon: "chevron-left",
      disabled: disabled || page <= 1,
    })
  );

  pageWindow(page, pageCount).forEach((item) => {
    if (item === "…") {
      const span = document.createElement("span");
      span.className = "ellipsis";
      span.setAttribute("aria-hidden", "true");
      span.textContent = "\u2026";
      host.appendChild(span);
      return;
    }
    host.appendChild(
      pageButton(el, {
        page: item,
        label: "Page " + item,
        text: String(item),
        current: item === page,
        disabled: disabled,
      })
    );
  });

  host.appendChild(
    pageButton(el, {
      page: page + 1,
      label: "Next page",
      icon: "chevron-right",
      disabled: disabled || page >= pageCount,
    })
  );
}

function pageButton(el, opts) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn" + (opts.icon ? " btn--icon" : "");
  btn.setAttribute("data-page", String(opts.page));
  btn.setAttribute("aria-label", opts.label);
  if (opts.current) btn.setAttribute("aria-current", "page");
  btn.disabled = !!opts.disabled;

  if (opts.icon) {
    const icon = document.createElement("lds-icon");
    icon.setAttribute("name", opts.icon);
    icon.setAttribute("size", "sm");
    btn.appendChild(icon);
  } else {
    btn.textContent = opts.text || "";
  }
  return btn;
}

/* first, last, current ± 1, with ellipsis gaps */
function pageWindow(page, pageCount) {
  if (pageCount <= 7) {
    const all = [];
    for (let i = 1; i <= pageCount; i++) all.push(i);
    return all;
  }

  const set = new Set([1, pageCount, page, page - 1, page + 1]);
  const nums = Array.from(set)
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}

function setPage(el, page) {
  const max = pageCountOf(el);
  const next = Math.min(Math.max(1, page), max);
  if (next === pageOf(el)) return;

  const event = el.emit("lds-page-change", { page: next });
  if (event.defaultPrevented) return;
  el.setAttribute("page", String(next));
}

function setPageSize(el, pageSize) {
  const size = Math.max(1, Math.floor(pageSize));
  let page = pageOf(el);
  const total = totalOf(el);
  const newCount = total === 0 ? 1 : Math.max(1, Math.ceil(total / size));
  if (page > newCount) page = 1;

  const event = el.emit("lds-page-size-change", { pageSize: size, page: page });
  if (event.defaultPrevented) return;

  el.setAttribute("page-size", String(size));
  el.setAttribute("page", String(page));
}
