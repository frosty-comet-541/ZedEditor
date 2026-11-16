/* ============================================================================
   preview.js — リアルタイムプレビューの生成と描画
   ----------------------------------------------------------------------------
   - buildDocument()  … iframe srcdoc 用の完全なHTMLを組み立てる
       head : color-scheme + CDN(<link>) + ユーザーCSS（メディアクエリ適応済み）
       body : ユーザーHTML + consoleフック + CDN(<script>) + ユーザーJS
       ※ ライブラリは常にユーザーコードより先に読み込まれる
   - render()         … プレビューを描画し直す（前に sui:beforerender イベントを発火）
   - プレビューテーマ … iframe 内の color-scheme を切替（light / dark）
   ========================================================================== */

import { CONSOLE_SCRIPT } from './config.js';
import { code } from './state.js';
import { store } from './storage.js';
import { cssLinks, jsScripts } from './cdn.js';
import { $, replayAnim } from './ui.js';

const preview = $('#preview');
const view = $('#view');
const themeToggle = $('#preview-theme-toggle');

let previewTheme = 'light';
let themeFlashTimer = null;

/** ユーザーの prefers-color-scheme をプレビューテーマに合わせて書き換える。 */
function adaptCss(css, theme) {
  return css.replace(
    /\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/gi,
    (_, mode) => mode.toLowerCase() === theme ? '(min-width: 0px)' : '(min-width: 999999px)'
  );
}

/** ユーザーJS内の </script を壊さないようにエスケープして <script> で包む。 */
function wrapUserJs(js) {
  return `<script>${String(js).replace(/<\/script/gi, '<\\/script')}</script>`;
}

/** iframe srcdoc 用のHTML文書を組み立てる。
 *  body の並びは「consoleフック → CDNライブラリ → ユーザーHTML → ユーザーJS」。
 *  フックを最初に置くことで、HTMLタブ内のインラインscriptのログも拾える。 */
export function buildDocument() {
  const links = cssLinks();
  const scripts = jsScripts();
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<style>:root{color-scheme:${previewTheme}}</style>` +
    (links ? '\n' + links : '') +
    `<style>${adaptCss(code.css, previewTheme)}</style>` +
    `</head><body>${CONSOLE_SCRIPT}` +
    (scripts ? '\n' + scripts : '') +
    `\n${code.html}\n${wrapUserJs(code.javascript)}</body></html>`;
}

/** プレビューを再描画する（各所はこれを呼ぶだけでよい）。 */
export function render() {
  // 描画前に通知（コンソールのログ消去などがここに集約される）
  document.dispatchEvent(new CustomEvent('sui:beforerender'));
  preview.srcdoc = buildDocument();
}

/** プレビュー領域にさっとフェードをかける（再実行のフィードバック）。 */
export function pulsePreview() {
  replayAnim($('.preview-wrapper'), 'is-fading');
}

/** 現在のプレビューテーマ。 */
export function currentPreviewTheme() {
  return previewTheme;
}

/** プレビューテーマを適用し、保存して再描画する。 */
export function applyPreviewTheme(next) {
  previewTheme = next === 'dark' ? 'dark' : 'light';
  view.dataset.previewTheme = previewTheme;
  themeToggle.setAttribute('aria-pressed', String(previewTheme === 'dark'));
  store.set('preview-theme', previewTheme);
  render();
  pulsePreview();
}

export function initPreview() {
  // 復元（未設定ならドキュメントテーマに合わせる）
  const stored = store.get('preview-theme', document.documentElement.dataset.theme);
  previewTheme = stored === 'dark' ? 'dark' : 'light';
  view.dataset.previewTheme = previewTheme;
  themeToggle.setAttribute('aria-pressed', String(previewTheme === 'dark'));

  themeToggle.addEventListener('click', () => {
    applyPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark');
    themeToggle.classList.remove('is-flash');
    void themeToggle.offsetWidth;
    themeToggle.classList.add('is-flash');
    clearTimeout(themeFlashTimer);
    themeFlashTimer = setTimeout(() => themeToggle.classList.remove('is-flash'), 1000);
  });
}
