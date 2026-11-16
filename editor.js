/* ============================================================================
   editor.js — Monaco エディタ・タブ切替・コード整形・コピー
   ----------------------------------------------------------------------------
   - Monaco は AMD loader（head 内 defer スクリプトで読み込み済み）から起動
   - 各言語の model は常に生成し、表示中タブだけを editor にセット
     （タブ切替時に viewState を保存／復元してカーソル位置を維持）
   - 編集内容は state.setLang（保存）＋ 160ms デバウンスでプレビュー反映
   - 整形は Prettier → js-beautify のフォールバック構成
   ========================================================================== */

import { MONACO_BASE, PRETTIER_OPTS, LANGS } from './config.js';
import { code, saveCode, setLang } from './state.js';
import { store } from './storage.js';
import { render, applyPreviewTheme } from './preview.js';
import { $, flash } from './ui.js';

const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)');

const seg = $('.segmented');
const thumb = $('.thumb', seg);
const tabs = [...seg.querySelectorAll('[role="tab"]')];

let currentTab = 'html';
let editor = null;
const models = {};
const viewStates = {};
let renderTimer = null;

/* ------------------------------------------------------------- テーマ --- */

const suiTheme = () =>
  document.documentElement.dataset.theme === 'dark' ? 'sui-dark' : 'sui-light';

function defineSuiThemes() {
  monaco.editor.defineTheme('sui-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'regexp', foreground: '811F3F' },
      { token: 'keyword', foreground: '0000FF' },
      { token: 'type', foreground: '267F99' },
      { token: 'type.identifier', foreground: '267F99' },
      { token: 'identifier', foreground: '001080' },
      { token: 'variable', foreground: '001080' },
      { token: 'variable.predefined', foreground: '0070C1' },
      { token: 'constant', foreground: '0070C1' },
      { token: 'delimiter', foreground: '3c3c3c' },
      { token: 'delimiter.html', foreground: '800000' },
      { token: 'tag', foreground: '800000' },
      { token: 'tag.css', foreground: '800000' },
      { token: 'metatag', foreground: '800000' },
      { token: 'attribute.name', foreground: 'E50000' },
      { token: 'attribute.value', foreground: '0000FF' },
      { token: 'attribute.value.number', foreground: '098658' },
      { token: 'attribute.value.unit', foreground: '098658' },
      { token: 'attribute.value.hex', foreground: '098658' },
      { token: 'annotation', foreground: '795E26' },
      { token: 'invalid', foreground: 'CD3131' }
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#000000',
      'editorLineNumber.foreground': '#A6A6A6',
      'editorLineNumber.activeForeground': '#181818',
      'editorCursor.foreground': '#000000',
      'editor.lineHighlightBackground': '#0000000A',
      'editor.selectionBackground': '#D6D6D6',
      'editor.inactiveSelectionBackground': '#ECECEC',
      'editorIndentGuide.background1': '#D3D3D3',
      'editorIndentGuide.activeBackground1': '#939393',
      'editorWidget.background': '#F3F3F3',
      'editorWidget.border': '#C8C8C8',
      'editorBracketMatch.background': '#0064001A',
      'editorBracketMatch.border': '#00640040',
      'scrollbarSlider.background': '#00000026',
      'scrollbarSlider.hoverBackground': '#00000042',
      'scrollbarSlider.activeBackground': '#00000059'
    }
  });
  monaco.editor.defineTheme('sui-dark', {
    base: 'vs-dark', inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'regexp', foreground: 'D16969' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'variable.predefined', foreground: '4FC1FF' },
      { token: 'constant', foreground: '4FC1FF' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'delimiter.html', foreground: '808080' },
      { token: 'tag', foreground: '569CD6' },
      { token: 'tag.css', foreground: 'D7BA7D' },
      { token: 'metatag', foreground: '808080' },
      { token: 'attribute.name', foreground: '9CDCFE' },
      { token: 'attribute.value', foreground: 'CE9178' },
      { token: 'attribute.value.number', foreground: 'B5CEA8' },
      { token: 'attribute.value.unit', foreground: 'B5CEA8' },
      { token: 'attribute.value.hex', foreground: 'B5CEA8' },
      { token: 'annotation', foreground: 'DCDCAA' },
      { token: 'invalid', foreground: 'F14C4C' }
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#8B8B8B',
      'editorLineNumber.activeForeground': '#D4D4D4',
      'editorCursor.foreground': '#AEAFAD',
      'editor.lineHighlightBackground': '#FFFFFF0A',
      'editor.selectionBackground': '#404040',
      'editor.inactiveSelectionBackground': '#2D2D2D',
      'editorIndentGuide.background1': '#404040',
      'editorIndentGuide.activeBackground1': '#707070',
      'editorWidget.background': '#252526',
      'editorWidget.border': '#454545',
      'editorBracketMatch.background': '#88888821',
      'editorBracketMatch.border': '#88888857',
      'scrollbarSlider.background': '#79797966',
      'scrollbarSlider.hoverBackground': '#646464B3',
      'scrollbarSlider.activeBackground': '#BFBFBF66'
    }
  });
}

/* -------------------------------------------------------------- 起動 --- */

/** 160ms デバウンスでプレビューへ反映（入力のたびに iframe を作らない）。 */
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 160);
}

function editorFallback(msg) {
  const box = $('#monaco-editor');
  box.textContent = msg;
  box.style.cssText = 'padding:18px;color:var(--muted);font-size:12px;';
}

function createModels() {
  for (const lang of LANGS) {
    models[lang] = monaco.editor.createModel(code[lang], lang);
    models[lang].onDidChangeContent(() => {
      setLang(lang, models[lang].getValue());
      scheduleRender();
    });
  }
}

function createEditor() {
  editor = monaco.editor.create($('#monaco-editor'), {
    model: models[currentTab],
    theme: suiTheme(),
    fontFamily: '"Fira Code", "SF Mono", ui-monospace, Menlo, Consolas, monospace',
    fontLigatures: true,
    fontSize: 14,
    lineHeight: 23,
    tabSize: 2,
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    folding: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderLineHighlightOnlyWhenFocus: true,
    occurrencesHighlight: 'off',
    selectionHighlight: false,
    padding: { top: 12, bottom: 12 },
    automaticLayout: true,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    bracketPairColorization: { enabled: false },
    guides: { bracketPairs: false },
    scrollbar: {
      verticalScrollbarSize: FINE_POINTER.matches ? 14 : 16,
      horizontalScrollbarSize: FINE_POINTER.matches ? 14 : 16,
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      vertical: 'visible'
    }
  });
}

/** Monaco のワーカーを同一生成元で動かすための定番ワークアラウンド。 */
function setupMonacoEnvironment() {
  window.MonacoEnvironment = {
    getWorkerUrl: () => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
      "self.MonacoEnvironment={baseUrl:'" + MONACO_BASE + "/'};" +
      "importScripts('" + MONACO_BASE + "/vs/base/worker/workerMain.js');")
  };
}

function onMonacoReady(onEditorReady) {
  defineSuiThemes();
  if (window.emmetMonaco) {
    emmetMonaco.emmetHTML(monaco);
    emmetMonaco.emmetCSS(monaco);
  }
  createModels();
  createEditor();

  // OS のテーマ変更に追従（明示的なプレビューテーマ設定がない場合のみ）
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', e => {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    monaco.editor.setTheme(suiTheme());
    if (store.get('preview-theme', null) === null) {
      applyPreviewTheme(e.matches ? 'dark' : 'light');
    }
  });

  onEditorReady?.();
}

/* -------------------------------------------------------------- タブ --- */

export function positionThumb() {
  const active = tabs.find(b => b.dataset.tab === currentTab);
  if (!active) return;
  thumb.style.width = active.offsetWidth + 'px';
  thumb.style.transform = 'translateX(' + active.offsetLeft + 'px)';
}

export function setTab(lang) {
  if (editor) viewStates[currentTab] = editor.saveViewState();
  currentTab = lang;
  tabs.forEach(b => {
    const on = b.dataset.tab === lang;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on);
  });
  if (editor && models[lang]) {
    editor.setModel(models[lang]);
    if (viewStates[lang]) editor.restoreViewState(viewStates[lang]);
    if (FINE_POINTER.matches) editor.focus();
  }
  const box = $('.editor-container');
  box.classList.remove('is-swapping');
  void box.offsetWidth;
  box.classList.add('is-swapping');
  positionThumb();
}

function initTabs() {
  tabs.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  seg.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.findIndex(b => b.dataset.tab === currentTab);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    setTab(next.dataset.tab);
    next.focus();
  });
  // thumb の transition は初回位置確定後に有効化（初動で横に流れるのを防ぐ）
  requestAnimationFrame(() => seg.classList.add('is-ready'));
}

/* --------------------------------------------------------------- 整形 -- */

async function formatWithPrettier(text, lang) {
  if (typeof prettier === 'undefined' || !window.prettierPlugins) return null;
  const parser = { css: 'css', javascript: 'babel', html: 'html' }[lang];
  if (!parser) return null;
  try {
    const plugins = Object.values(window.prettierPlugins).filter(Boolean);
    const out = await prettier.format(text, { ...PRETTIER_OPTS, parser, plugins });
    return typeof out === 'string' && out.length ? out : null;
  } catch {
    return null;
  }
}

function formatWithBeautify(text, lang) {
  const fn = {
    css: window.css_beautify,
    javascript: window.js_beautify,
    html: window.html_beautify
  }[lang];
  if (typeof fn !== 'function') return null;
  try {
    const opts = {
      indent_size: 2, indent_char: ' ', wrap_line_length: 80,
      preserve_newlines: true, max_preserve_newlines: 2, end_with_newline: false
    };
    if (lang === 'html') Object.assign(opts, { indent_inner_html: true, extra_liners: [] });
    if (lang === 'css') Object.assign(opts, { selector_separator_newline: true });
    if (lang === 'javascript') Object.assign(opts, { brace_style: 'collapse,preserve-inline' });
    const out = fn(text, opts);
    return typeof out === 'string' && out.trim() ? out : null;
  } catch {
    return null;
  }
}

async function formatCode(text, lang) {
  if (!text || !text.trim()) return text;
  for (const engine of [formatWithPrettier, formatWithBeautify]) {
    const out = await engine(text, lang);
    if (typeof out === 'string' && out.length) return out;
  }
  return null;
}

/* -------------------------------------------------- モデルへの一括反映 -- */

/** undo スタックを分断しつつ model 全体を置き換える（整形・クリア・読み込み用）。 */
function replaceModelText(model, text) {
  model.pushStackElement();
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  model.pushStackElement();
}

/**
 * 渡された言語ぶんだけコードを置き換える。
 * 例）クリア:  setAllTexts({ html:'', css:'', javascript:'' })
 *      復元:  setAllTexts(INITIAL_CODE)
 * 置き換え後は即時保存。model が無い（Monaco未起動）場合は state のみ更新。
 */
export function setAllTexts(texts) {
  for (const lang of LANGS) {
    if (!(lang in texts)) continue;
    code[lang] = texts[lang];
    if (models[lang]) replaceModelText(models[lang], texts[lang]);
  }
  saveCode(true);
}

/* ------------------------------------------------------------- 公開API -- */

/** layout.js が行高を参照するために使用。 */
export function getActiveEditor() {
  return editor;
}

export function initEditor({ onEditorReady } = {}) {
  initTabs();

  if (typeof require === 'undefined') {
    editorFallback('エディタの読み込みに失敗しました。ネットワークをご確認ください。');
    return;
  }
  setupMonacoEnvironment();
  require.config({
    paths: { vs: MONACO_BASE + '/vs' },
    'vs/nls': { availableLanguages: { '*': 'ja' } }
  });
  require(
    ['vs/editor/editor.main'],
    () => onMonacoReady(onEditorReady),
    () => editorFallback('エディタの読み込みに失敗しました。')
  );

  // 整形
  $('#btn-format').addEventListener('click', async () => {
    if (!editor || !models[currentTab]) return;
    const model = models[currentTab];
    const formatted = await formatCode(model.getValue(), currentTab);
    if (formatted === null) { flash($('#btn-format'), 'Failed'); return; }
    if (formatted !== model.getValue()) replaceModelText(model, formatted);
    flash($('#btn-format'), 'Done');
  });

  // コピー
  $('#btn-copy').addEventListener('click', () => {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getValue())
      .then(() => flash($('#btn-copy'), 'Copied'))
      .catch(() => flash($('#btn-copy'), 'Failed'));
  });
}
