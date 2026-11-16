/* ============================================================================
   cdn.js — CDN ライブラリのワンクリック追加（要件2）
   ----------------------------------------------------------------------------
   構成：
   - 状態        … enabled（有効 id の Set）＋ custom（ユーザー定義エントリ）
                   → localStorage の 'cdn' / 'cdn-custom' に永続化
   - 注入        … cssLinks() / jsScripts() が <link> / <script> の文字列を返す。
                   プレビュー・一括書き出し・分割書き出しのすべてから参照される。
                   並び順は定義順（依存関係を安定させるため、有効化順では決めない）
   - UI          … ツールバーの CDN ボタンで開くポップオーバー。
                   検索 / プリセットのワンクリック ON-OFF / カスタム URL 追加
   - 変更通知    … onRefresh コールバック（main.js がプレビュー再描画を渡す）
   ========================================================================== */

import { store } from './storage.js';
import { CDN_LIBRARIES } from './config.js';
import { $ } from './ui.js';

let onRefresh = () => {};
let enabled = new Set();                 // 有効化中のライブラリ id
let custom = [];                          // [{ id, label, url, type: 'js'|'css' }]

const btn = $('#btn-cdn');
const menu = $('#cdn-menu');
const listEl = $('#cdn-list');
const searchEl = $('#cdn-search');
const customForm = $('#cdn-custom-form');
const customUrlEl = $('#cdn-custom-url');

/* -------------------------------------------------------------- 状態管理 -- */

function persist() {
  store.set('cdn', [...enabled]);
  store.set('cdn-custom', custom);
}

function restore() {
  enabled = new Set(store.get('cdn', []));
  custom = Array.isArray(store.get('cdn-custom', [])) ? store.get('cdn-custom', []) : [];
  // 型の正規化（壊れた保存データへの耐性）
  custom = custom.filter(c =>
    c && typeof c.id === 'string' && typeof c.url === 'string' &&
    typeof c.label === 'string' && /^(js|css)$/.test(String(c.type))
  );
  // 存在しない id（削除済みカスタム等）を掃除
  const known = new Set([...CDN_LIBRARIES.map(l => l.id), ...custom.map(c => c.id)]);
  enabled = new Set([...enabled].filter(id => known.has(id)));
}

/** 注入順を安定させるためのレジストリ（プリセット → カスタムの順）。 */
function registry() {
  const customLibs = custom.map(c => ({
    id: c.id,
    label: c.label,
    version: c.type === 'js' ? 'JS' : 'CSS',
    category: 'カスタム',
    description: c.url,
    keywords: '',
    css: c.type === 'css' ? [c.url] : [],
    js: c.type === 'js' ? [c.url] : []
  }));
  return [...CDN_LIBRARIES, ...customLibs];
}

/* ---------------------------------------------------------------- 注入 -- */

const escapeAttr = s =>
  String(s).trim()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 有効中ライブラリの <link> 一覧（ユーザーCSSより先に読み込まれる）。 */
export function cssLinks() {
  return registry()
    .filter(l => enabled.has(l.id))
    .flatMap(l => l.css)
    .map(u => `<link rel="stylesheet" href="${escapeAttr(u)}">`)
    .join('\n');
}

/** 有効中ライブラリの <script> 一覧（ユーザーJSより先に読み込まれる）。 */
export function jsScripts() {
  return registry()
    .filter(l => enabled.has(l.id))
    .flatMap(l => l.js)
    .map(u => `<script src="${escapeAttr(u)}"></script>`)
    .join('\n');
}

/* ----------------------------------------------------------------- UI --- */

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

/**
 * ライブラリ行のDOMを生成する。
 * プリセット     : <button class="lib-row"> をそのまま返す
 * カスタム       : 削除ボタンとの並びが必要なため
 *   <div class="lib-item"> [ <button class="lib-row"> , <button class="lib-del"> ]
 * というラッパーを返す（button の入れ子を避けるため、del は row の外側）。
 */
function buildRow(lib, isCustom) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'lib-row';
  row.dataset.libId = lib.id;

  const on = enabled.has(lib.id);
  row.classList.toggle('is-on', on);
  row.setAttribute('aria-pressed', String(on));

  const dot = document.createElement('span');
  dot.className = 'lib-dot';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML = CHECK_SVG;

  const name = document.createElement('span');
  name.className = 'lib-name';
  name.textContent = lib.label;

  const ver = document.createElement('span');
  ver.className = 'lib-ver';
  ver.textContent = lib.version;

  const desc = document.createElement('span');
  desc.className = 'lib-desc';
  desc.textContent = lib.description;

  row.append(dot, name, ver, desc);

  if (!isCustom) return row;

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'lib-del';
  del.dataset.libId = lib.id;
  del.setAttribute('aria-label', `${lib.label} を削除`);
  del.textContent = '×';

  const item = document.createElement('div');
  item.className = 'lib-item';
  item.append(row, del);
  return item;
}

/** リスト全体を再構築する（カテゴリ見出し付き）。 */
function renderList() {
  listEl.textContent = '';
  const all = registry();
  let lastCat = '';
  for (const lib of all) {
    if (lib.category !== lastCat) {
      lastCat = lib.category;
      const head = document.createElement('div');
      head.className = 'cdn-cat';
      head.textContent = lib.category;
      listEl.append(head);
    }
    const isCustom = lib.category === 'カスタム';
    const el = buildRow(lib, isCustom);
    el.dataset.keywords = (lib.label + ' ' + (lib.keywords || '')).toLowerCase();
    listEl.append(el);
  }
  applyFilter(searchEl.value || '');
}

/** 検索語で行を絞り込み、空カテゴリの見出しを隠す。 */
function applyFilter(q) {
  const needle = q.trim().toLowerCase();
  let currentCat = null, visibleInCat = 0;
  const items = [...listEl.children];
  for (const item of items) {
    if (item.classList.contains('cdn-cat')) {
      if (currentCat) currentCat.hidden = visibleInCat === 0;
      currentCat = item;
      visibleInCat = 0;
      continue;
    }
    const hit = !needle || item.dataset.keywords.includes(needle);
    item.hidden = !hit;
    if (hit) visibleInCat++;
  }
  if (currentCat) currentCat.hidden = visibleInCat === 0;
}

/** カスタムURLの表示ラベルをそれっぽく切り出す（ファイル名部分）。 */
function deriveLabel(url) {
  const last = url.split('/').pop() || url;
  const base = last.replace(/\.(min\s*)?\.(js|css)(\?|#.*)?$/i, '').replace(/\.(js|css)(\?|#.*)?$/i, '');
  return base || new URL(url).hostname;
}

/* ------------------------------------------------------------- 配線 -- */

function toggleLib(id) {
  if (enabled.has(id)) enabled.delete(id);
  else enabled.add(id);
  persist();
  onRefresh();
}

function removeCustomLib(id) {
  custom = custom.filter(c => c.id !== id);
  enabled.delete(id);
  persist();
  renderList();
  onRefresh();
}

export function closeCdnMenu() {
  menu.classList.remove('is-open');
  btn.setAttribute('aria-expanded', 'false');
}

export function initCdn(options = {}) {
  onRefresh = options.onRefresh || (() => {});
  restore();
  renderList();

  // 開閉
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      renderList();          // 状態を最新化
      searchEl.value = '';
      applyFilter('');
      setTimeout(() => searchEl.focus(), 30);
    }
  });

  // 検索
  searchEl.addEventListener('input', () => applyFilter(searchEl.value));

  // 行クリック（イベント委譲：トグルとカスタム削除を振り分け）
  listEl.addEventListener('click', e => {
    const del = e.target.closest('.lib-del');
    if (del) {
      e.stopPropagation();
      removeCustomLib(del.dataset.libId);
      return;
    }
    const row = e.target.closest('.lib-row');
    if (!row) return;
    const id = row.dataset.libId;
    toggleLib(id);
    const on = enabled.has(id);
    row.classList.toggle('is-on', on);
    row.setAttribute('aria-pressed', String(on));
  });

  // カスタム追加フォーム
  customForm.addEventListener('submit', e => {
    e.preventDefault();
    const url = (customUrlEl.value || '').trim();
    const type = customForm.querySelector('input[name="cdn-kind"]:checked')?.value || 'js';
    const okUrl = /^https?:\/\//i.test(url);
    let parsed = null;
    try { parsed = new URL(url); } catch { /* 不正URL */ }
    if (!okUrl || !parsed || !/^https?:$/.test(parsed.protocol)) {
      customUrlEl.classList.remove('is-error');
      void customUrlEl.offsetWidth;
      customUrlEl.classList.add('is-error');
      setTimeout(() => customUrlEl.classList.remove('is-error'), 900);
      return;
    }
    const entry = {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: deriveLabel(url),
      url,
      type: /^(js|css)$/.test(type) ? type : 'js'
    };
    custom.push(entry);
    enabled.add(entry.id);
    persist();
    renderList();
    customUrlEl.value = '';
    onRefresh();
  });
}
