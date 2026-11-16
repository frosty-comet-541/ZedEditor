/* ============================================================================
   ui.js — 複数モジュールで共用する小さなDOM/フィードバックヘルパー
   ========================================================================== */

/** querySelector の短縮形。 */
export const $ = (sel, root = document) => root.querySelector(sel);

/** CSSアニメーションを最初から再生し直す。 */
export function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // reflow を強制してアニメーションをリセット
  el.classList.add(cls);
}

/**
 * ボタンに一時的なテキストフィードバックを表示する。
 * flash(btn, 'Copied') → 1.2秒だけ "Copied" を表示して元に戻す。
 */
export function flash(btn, label) {
  if (!btn || btn.dataset.busy) return;
  btn.dataset.busy = '1';
  if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
  btn.textContent = label;
  btn.classList.add('is-feedback');
  setTimeout(() => {
    btn.textContent = btn.dataset.orig;
    btn.classList.remove('is-feedback');
    delete btn.dataset.busy;
  }, 1200);
}
