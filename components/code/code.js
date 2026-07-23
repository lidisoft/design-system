/* Behaviour for <lds-code> — copy button and language metadata. */

LDS.behavior("lds-code", {
  connected(el) {
    const copy = el.$(".copy");
    syncCopyable(el, copy);
    syncLanguage(el);

    copy.addEventListener("click", () => {
      const text = slotText(el);
      const write =
        navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(text)
          : Promise.reject(new Error("clipboard unavailable"));

      write
        .then(() => {
          el.emit("lds-copy", { ok: true });
        })
        .catch(() => {
          el.emit("lds-copy", { ok: false });
        });
    });
  },

  attributeChanged(el, name) {
    if (!el._lds.ready) return;
    if (name === "copyable") syncCopyable(el, el.$(".copy"));
    if (name === "language") syncLanguage(el);
  },
});

function isCopyable(el) {
  /* Default true when attribute omitted; literal "false" turns it off. */
  if (!el.hasAttribute("copyable")) return true;
  return el.getAttribute("copyable") !== "false";
}

function syncCopyable(el, copy) {
  if (!copy) return;
  copy.hidden = !isCopyable(el);
}

function syncLanguage(el) {
  const lang = el.getAttribute("language");
  const code = el.$(".code");
  if (!code) return;
  if (lang) code.setAttribute("data-language", lang);
  else code.removeAttribute("data-language");
}

function slotText(el) {
  const slot = el.$("slot");
  if (!slot) return el.textContent || "";
  return slot
    .assignedNodes({ flatten: true })
    .map((node) => node.textContent || "")
    .join("")
    .replace(/\n$/, "");
}
