/* Behaviour for <lds-table>.
 *
 * The <table> stays in light DOM. When sortable, th[data-sortable] cycles
 * asc → desc → none, sets aria-sort, and reorders tbody rows unless lds-sort
 * is canceled (server-sort escape hatch).
 */

const tableState = new WeakMap();

LDS.behavior("lds-table", {
  connected(el) {
    const onClick = (event) => {
      if (!el.boolAttr("sortable")) return;
      const th = event.target.closest("th[data-sortable]");
      if (!th || !el.contains(th)) return;
      event.preventDefault();
      cycleSort(el, th);
    };

    const onKeydown = (event) => {
      if (!el.boolAttr("sortable")) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const th = event.target.closest("th[data-sortable]");
      if (!th || !el.contains(th)) return;
      event.preventDefault();
      cycleSort(el, th);
    };

    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKeydown);
    tableState.set(el, { onClick: onClick, onKeydown: onKeydown });

    syncSortable(el);
  },

  disconnected(el) {
    const s = tableState.get(el);
    if (!s) return;
    el.removeEventListener("click", s.onClick);
    el.removeEventListener("keydown", s.onKeydown);
    tableState.delete(el);
  },

  attributeChanged(el, name) {
    if (name === "sortable") syncSortable(el);
  },
});

function tableOf(el) {
  return el.querySelector(":scope > table");
}

function syncSortable(el) {
  const table = tableOf(el);
  if (!table) return;

  const headers = Array.prototype.slice.call(
    table.querySelectorAll("thead th[data-sortable]")
  );

  headers.forEach((th) => {
    if (el.boolAttr("sortable")) {
      if (!th.hasAttribute("tabindex")) th.setAttribute("tabindex", "0");
      th.setAttribute("role", "columnheader");
    } else {
      th.removeAttribute("tabindex");
      if (th.getAttribute("role") === "columnheader") th.removeAttribute("role");
      th.removeAttribute("aria-sort");
    }
  });
}

function cycleSort(el, th) {
  const current = th.getAttribute("aria-sort");
  let direction = null;
  if (current === "ascending") direction = "desc";
  else if (current === "descending") direction = null;
  else direction = "asc";

  const key = th.getAttribute("data-key") || null;
  const detail = {
    column: th,
    direction: direction,
  };
  if (key) detail.key = key;

  const event = el.emit("lds-sort", detail);
  if (event.defaultPrevented) {
    applyAriaSort(el, th, direction);
    return;
  }

  applyAriaSort(el, th, direction);
  if (direction) {
    sortBody(el, th, direction);
  } else {
    restoreOrder(el);
  }
}

function applyAriaSort(el, activeTh, direction) {
  const table = tableOf(el);
  if (!table) return;

  Array.prototype.forEach.call(table.querySelectorAll("thead th[data-sortable]"), (th) => {
    if (th === activeTh && direction === "asc") {
      th.setAttribute("aria-sort", "ascending");
    } else if (th === activeTh && direction === "desc") {
      th.setAttribute("aria-sort", "descending");
    } else {
      th.removeAttribute("aria-sort");
    }
  });
}

function cellIndex(th) {
  const row = th.parentElement;
  if (!row) return -1;
  return Array.prototype.indexOf.call(row.children, th);
}

function sortBody(el, th, direction) {
  const table = tableOf(el);
  if (!table) return;
  const tbody = table.tBodies[0];
  if (!tbody) return;

  rememberOrder(el, tbody);

  const index = cellIndex(th);
  if (index < 0) return;

  const type = th.getAttribute("data-type") || "string";
  const rows = Array.prototype.slice.call(tbody.rows);
  const factor = direction === "desc" ? -1 : 1;

  rows.sort((a, b) => {
    const av = cellValue(a.cells[index], type);
    const bv = cellValue(b.cells[index], type);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * factor;
    }
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * factor;
  });

  rows.forEach((row) => tbody.appendChild(row));
}

function cellValue(cell, type) {
  if (!cell) return null;
  const raw = (cell.getAttribute("data-value") || cell.textContent || "").trim();
  if (!raw) return null;

  if (type === "number") {
    const n = Number(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (type === "date") {
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : null;
  }
  return raw;
}

function rememberOrder(el, tbody) {
  const s = tableState.get(el);
  if (!s || s.originalOrder) return;
  s.originalOrder = Array.prototype.slice.call(tbody.rows);
}

function restoreOrder(el) {
  const s = tableState.get(el);
  const table = tableOf(el);
  if (!s || !s.originalOrder || !table || !table.tBodies[0]) return;
  const tbody = table.tBodies[0];
  s.originalOrder.forEach((row) => {
    if (row.parentNode === tbody || table.contains(row)) tbody.appendChild(row);
  });
}
