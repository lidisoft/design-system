/* Behaviour for <lds-avatar-group>.
 *
 * Caps visible lds-avatar children via max and shows a +N overflow chip.
 */

LDS.behavior("lds-avatar-group", {
  connected(el) {
    const slot = el.$("slot");
    if (slot) slot.addEventListener("slotchange", () => syncOverflow(el));

    const mo = new MutationObserver(() => syncOverflow(el));
    mo.observe(el, { childList: true });
    el._lds.avatarGroupMo = mo;

    syncOverflow(el);
  },

  disconnected(el) {
    if (el._lds.avatarGroupMo) {
      el._lds.avatarGroupMo.disconnect();
      el._lds.avatarGroupMo = null;
    }
  },

  attributeChanged(el, name) {
    if (name === "max" || name === "size") syncOverflow(el);
  },
});

function avatarsOf(el) {
  return Array.prototype.slice.call(el.querySelectorAll(":scope > lds-avatar"));
}

function syncOverflow(el) {
  const chip = el.$(".overflow");
  if (!chip) return;

  const avatars = avatarsOf(el);
  const maxAttr = el.getAttribute("max");
  const max = maxAttr != null && maxAttr !== "" ? parseInt(maxAttr, 10) : NaN;

  if (!Number.isFinite(max) || max < 1 || avatars.length <= max) {
    avatars.forEach((avatar) => {
      avatar.hidden = false;
    });
    chip.hidden = true;
    chip.textContent = "";
    chip.removeAttribute("aria-label");
    return;
  }

  const visible = Math.max(max - 1, 0);
  const hiddenCount = avatars.length - visible;

  avatars.forEach((avatar, index) => {
    avatar.hidden = index >= visible;
  });

  chip.hidden = false;
  chip.textContent = "+" + hiddenCount;
  chip.setAttribute("aria-label", hiddenCount + " more");
  chip.removeAttribute("aria-hidden");
}
