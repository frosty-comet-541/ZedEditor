const LANGS = ['html', 'css', 'javascript'];

const MONACO_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min';

const PRETTIER_STRICT = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  rangeStart: 0,
  endOfLine: 'lf',
  singleAttributePerLine: true,
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  proseWrap: 'always',
  embeddedLanguageFormatting: 'auto',
  insertPragma: false,
  requirePragma: false
};

const PARSER_BY_LANG = { html: 'html', css: 'css', javascript: 'babel' };

const INITIAL_CODE = {
  html: '<div class="container">\n  <h1>こんにちは、SuiEditorへようこそ！</h1>\n  <p>コードを編集すると、リアルタイムでプレビューが更新されます。</p>\n</div>',
  css: ':root {\n  --bg: #ffffff;\n  --text: #1e1e1e;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --bg: #1a1a1a;\n    --text: #e7e7e7;\n  }\n}\n\nbody {\n  font-family: system-ui, -apple-system, sans-serif;\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n  margin: 0;\n  background-color: var(--bg);\n  color: var(--text);\n  transition:\n    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),\n    color 0.2s cubic-bezier(0.16, 1, 0.3, 1);\n}\n\n.container {\n  text-align: center;\n  padding: 2rem;\n  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n}\n\n@keyframes fadeIn {\n  from {\n    opacity: 0;\n    transform: translateY(8px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}',
  javascript: 'console.log("SuiEditorの準備が完了しました。");'
};

function previewScrollbarCss(theme) {
  const thumb = theme === 'dark' ? 'rgba(237,237,240,.24)' : 'rgba(23,23,26,.26)';
  const hover = theme === 'dark' ? 'rgba(237,237,240,.44)' : 'rgba(23,23,26,.46)';
  return '::-webkit-scrollbar{width:12px;height:12px}' +
    '::-webkit-scrollbar-track{background:transparent}' +
    '::-webkit-scrollbar-corner{background:transparent}' +
    '::-webkit-scrollbar-thumb{background:' + thumb + ';border:3px solid transparent;background-clip:padding-box;border-radius:999px}' +
    '::-webkit-scrollbar-thumb:hover{background-color:' + hover + '}' +
    'html{scrollbar-width:thin;scrollbar-color:' + thumb + ' transparent}';
}

const CONSOLE_SCRIPT = `
<script>
  (function () {
    function format(a) {
      if (a instanceof Error) return a.stack || (a.name + ': ' + a.message);
      var t = typeof a;
      if (t === 'function') return '[Function ' + (a.name || 'anonymous') + ']';
      if (a === null || t !== 'object') return String(a);
      try {
        var seen = new WeakSet();
        return JSON.stringify(a, function (k, v) {
          if (v instanceof Error) return v.name + ': ' + v.message;
          if (typeof v === 'function') return '[Function]';
          if (typeof v === 'bigint') return String(v) + 'n';
          if (v instanceof Map) return { Map: Array.from(v) };
          if (v instanceof Set) return { Set: Array.from(v) };
          if (v && typeof v === 'object') { if (seen.has(v)) return '[Circular]'; seen.add(v); }
          return v;
        });
      } catch (e) { return String(a); }
    }
    function send(level, args, line, col) {
      window.parent.postMessage({
        type: 'console',
        level: level,
        msg: Array.prototype.map.call(args, format).join(' '),
        line: typeof line === 'number' ? line : 0,
        col: typeof col === 'number' ? col : 0
      }, '*');
    }
    ['log', 'info', 'debug', 'warn', 'error'].forEach(function (m) {
      var orig = console[m];
      var level = (m === 'warn' || m === 'error') ? m : 'log';
      console[m] = function () { orig.apply(console, arguments); send(level, arguments); };
    });
    window.addEventListener('error', function (e) {
      send('error', [String((e && e.message) || 'Error')], (e && e.lineno) || 0, (e && e.colno) || 0);
    });
    window.addEventListener('unhandledrejection', function (e) {
      send('error', ['Unhandled rejection: ' + format(e.reason)]);
    });
    window.addEventListener('message', function (e) {
      if (e.source !== window.parent || !e.data || e.data.type !== 'eval' || typeof e.data.cmd !== 'string') return;
      try {
        var r = (0, eval)(e.data.cmd);
        if (r && typeof r.then === 'function') {
          r.then(function (v) { send('log', [v]); }, function (err) { send('error', [String(err && err.message || err)]); });
        } else { send('log', [r]); }
      } catch (err) { send('error', [String(err && err.message || err)]); }
    });
  })();
</script>`;

const CDN_LIBRARIES = [
  { id: 'jquery', label: 'jQuery', version: '3.7.1',
    description: 'DOM 操作・Ajax・アニメーションの定番',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js'] },
  { id: 'bootstrap', label: 'Bootstrap 5', version: '5.3.3',
    description: '定番レスポンシブUIフレームワーク（JSバンドル同梱）',
    css: ['https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.3/css/bootstrap.min.css'],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.3/js/bootstrap.bundle.min.js'] },
  { id: 'tailwind', label: 'Tailwind CSS', version: 'Play CDN',
    description: 'ユーティリティファーストのCSS（ブラウザ内ビルド）',
    css: ['https://cdn.tailwindcss.com'],
    js: [] },
  { id: 'vue', label: 'Vue.js 3', version: '3.4.21',
    description: 'リアクティブなUIを組み立てられる軽量フレームワーク',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/vue/3.4.21/vue.global.prod.min.js'] },
  { id: 'react', label: 'React 18', version: '18.2.0',
    description: '宣言的なUI構築ライブラリ（ReactDOM 同梱）',
    css: [],
    js: [
      'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js'
    ] },
  { id: 'fontawesome', label: 'Font Awesome', version: '6.5.2',
    description: '1600種以上のアイコンフォント',
    css: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'],
    js: [] },
  { id: 'gsap', label: 'GSAP', version: '3.12.5',
    description: 'タイムライン駆動の高速アニメーションエンジン',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'] },
  { id: 'chartjs', label: 'Chart.js', version: '4.4.1',
    description: 'canvasベースのグラフ描画ライブラリ',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'] },
  { id: 'three', label: 'three.js', version: 'r158',
    description: 'WebGL 3D描画の定番エンジン',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js'] },
  { id: 'axios', label: 'Axios', version: '1.6.8',
    description: 'PromiseベースのHTTPクライアント',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.8/axios.min.js'] }
];

const $ = (sel, root = document) => root.querySelector(sel);

function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function flash(btn, label) {
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

const OWN_STORAGE_KEYS = ['theme', 'code', 'preview-theme', 'cdn', 'project-name'];
const storageMemory = new Map();
let storageMode = 'unknown';
let storageNoticeShown = false;

function probeStorage() {
  if (storageMode !== 'unknown') return;
  try {
    const k = '__sui_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    storageMode = 'local';
  } catch {
    storageMode = 'memory';
    if (!storageNoticeShown) {
      storageNoticeShown = true;
      console.info('SuiEditor: localStorage が利用できないため、保存はこのセッション内のみ有効です。');
    }
  }
}

function sweepOwnKeys() {
  for (const k of OWN_STORAGE_KEYS) {
    try { window.localStorage.removeItem(k); } catch { }
  }
}

function parseStored(raw) {
  try {
    const v = JSON.parse(raw);
    return (v === null || v === undefined) ? undefined : v;
  } catch {
    return undefined;
  }
}

const store = {
  get(key, fallback) {
    if (storageMemory.has(key)) {
      const v = storageMemory.get(key);
      return (v === undefined || v === null) ? fallback : v;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const v = parseStored(raw);
      return v === undefined ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    probeStorage();
    storageMemory.set(key, value);
    if (storageMode === 'memory') return true;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      storageMode = 'local';
      return true;
    } catch {
      sweepOwnKeys();
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        storageMode = 'memory';
        if (!storageNoticeShown) {
          storageNoticeShown = true;
          console.info('SuiEditor: localStorage に書き込めなかったため、保存はこのセッション内のみ有効です。');
        }
        return true;
      }
    }
  }
};

probeStorage();

const code = { ...INITIAL_CODE, ...store.get('code', {}) };
let saveTimer = null;

function saveCode(immediate = false) {
  clearTimeout(saveTimer);
  if (immediate) store.set('code', code);
  else saveTimer = setTimeout(() => store.set('code', code), 500);
}

function commitLang(lang, value) {
  code[lang] = value;
  saveCode();
}

let cdnEnabled = new Set();

const cdnBtn = $('#btn-cdn');
const cdnMenu = $('#cdn-menu');
const cdnList = $('#cdn-list');

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

function persistCdn() {
  store.set('cdn', [...cdnEnabled]);
}

function restoreCdn() {
  cdnEnabled = new Set(store.get('cdn', []));
  const known = new Set(CDN_LIBRARIES.map(l => l.id));
  cdnEnabled = new Set([...cdnEnabled].filter(id => known.has(id)));
}

const escapeAttr = s =>
  String(s).trim()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cssLinks() {
  return CDN_LIBRARIES
    .filter(l => cdnEnabled.has(l.id))
    .flatMap(l => l.css)
    .map(u => `<link rel="stylesheet" href="${escapeAttr(u)}">`)
    .join('\n');
}

function jsScripts() {
  return CDN_LIBRARIES
    .filter(l => cdnEnabled.has(l.id))
    .flatMap(l => l.js)
    .map(u => `<script src="${escapeAttr(u)}"></script>`)
    .join('\n');
}

function buildCdnRow(lib) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'lib-row';
  row.dataset.libId = lib.id;

  const on = cdnEnabled.has(lib.id);
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
  return row;
}

function renderCdnList() {
  cdnList.textContent = '';
  for (const lib of CDN_LIBRARIES) {
    cdnList.append(buildCdnRow(lib));
  }
}

function toggleLib(id) {
  if (cdnEnabled.has(id)) cdnEnabled.delete(id);
  else cdnEnabled.add(id);
  persistCdn();
  render();
}

function initCdn() {
  restoreCdn();
  renderCdnList();

  cdnBtn.addEventListener('click', () => {
    const open = toggleMenu('cdn-menu');
    if (open) renderCdnList();
  });

  cdnList.addEventListener('click', e => {
    const row = e.target.closest('.lib-row');
    if (!row) return;
    const id = row.dataset.libId;
    toggleLib(id);
    const on = cdnEnabled.has(id);
    row.classList.toggle('is-on', on);
    row.setAttribute('aria-pressed', String(on));
  });
}
const previewFrame = $('#preview');
const viewPane = $('#view');
const previewThemeToggle = $('#preview-theme-toggle');

let previewTheme = 'light';
let themeFlashTimer = null;
let jsLineOffset = 0;
let jsLineCount = 0;

function adaptCss(css, theme) {
  return css.replace(
    /\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/gi,
    (_, mode) => mode.toLowerCase() === theme ? '(min-width: 0px)' : '(min-width: 999999px)'
  );
}

function wrapUserJs(js) {
  return '<script>\n' + String(js).replace(/<\/script/gi, '<\\/script') + '\n</script>';
}

function buildDocument() {
  const links = cssLinks();
  const scripts = jsScripts();
  let doc = `<!doctype html><html lang="ja"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<style>:root{color-scheme:${previewTheme}}</style>` +
    `<style>${previewScrollbarCss(previewTheme)}</style>` +
    (links ? '\n' + links : '') +
    `<style>${adaptCss(code.css, previewTheme)}</style>` +
    `</head><body>${CONSOLE_SCRIPT}` +
    (scripts ? '\n' + scripts : '') +
    `\n${code.html}\n`;
  jsLineCount = code.javascript ? code.javascript.split('\n').length : 0;
  jsLineOffset = jsLineCount ? doc.split('\n').length + 1 : 0;
  doc += wrapUserJs(code.javascript);
  return doc;
}

function render() {
  document.dispatchEvent(new CustomEvent('sui:beforerender'));
  previewFrame.srcdoc = buildDocument();
}

function pulsePreview() {
  replayAnim($('.preview-wrapper'), 'is-fading');
}

function applyPreviewTheme(next) {
  previewTheme = next === 'dark' ? 'dark' : 'light';
  viewPane.dataset.previewTheme = previewTheme;
  previewThemeToggle.setAttribute('aria-pressed', String(previewTheme === 'dark'));
  store.set('preview-theme', previewTheme);
  render();
  pulsePreview();
}

function initPreview() {
  const stored = store.get('preview-theme', document.documentElement.dataset.theme);
  previewTheme = stored === 'dark' ? 'dark' : 'light';
  viewPane.dataset.previewTheme = previewTheme;
  previewThemeToggle.setAttribute('aria-pressed', String(previewTheme === 'dark'));

  previewThemeToggle.addEventListener('click', () => {
    applyPreviewTheme(previewTheme === 'dark' ? 'light' : 'dark');
    replayAnim(previewThemeToggle, 'is-flash');
    clearTimeout(themeFlashTimer);
    themeFlashTimer = setTimeout(() => previewThemeToggle.classList.remove('is-flash'), 1000);
  });
}

const consoleLogs = $('#console-logs');
const consolePane = $('#console-pane');
const consoleJumpBtn = $('#console-jump');
const consoleInput = $('#console-input');

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');

const isNearBottom = () =>
  consoleLogs.scrollHeight - consoleLogs.scrollTop - consoleLogs.clientHeight < 40;

function appendLog(level, msg, meta) {
  const row = document.createElement('div');
  row.className = 'log ' + level;
  const g = document.createElement('span');
  g.className = 'g';
  g.textContent = level === 'error' ? '×' : level === 'warn' ? '!' : level === 'input' ? '›' : '·';
  const body = document.createElement('span');
  body.className = 'msg';
  body.textContent = msg;
  row.append(g, body);
  if (level === 'error' && meta && meta.jumpLine) {
    row.classList.add('is-jumpable');
    row.dataset.line = String(meta.jumpLine);
    row.dataset.col = String(meta.col || 1);
    row.setAttribute('data-tip', 'クリックでコードの該当行へジャンプ');
    row.setAttribute('tabindex', '0');
  }
  const stick = isNearBottom();
  consoleLogs.append(row);
  while (consoleLogs.childElementCount > 500) consoleLogs.firstElementChild.remove();
  if (stick) consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function clearLogs() {
  consoleLogs.textContent = '';
  consoleJumpBtn.classList.remove('is-visible');
}

function activateLogJump(row) {
  const line = parseInt(row.dataset.line, 10);
  const col = parseInt(row.dataset.col, 10) || 1;
  if (line) jumpToLine('javascript', line, col);
}

function initConsolePanel() {
  consoleLogs.addEventListener('scroll', () => {
    consoleJumpBtn.classList.toggle(
      'is-visible',
      consoleLogs.childElementCount > 0 && !isNearBottom()
    );
  }, { passive: true });

  consoleJumpBtn.addEventListener('click', () => {
    consoleLogs.scrollTo({
      top: consoleLogs.scrollHeight,
      behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth'
    });
  });

  window.addEventListener('message', e => {
    if (e.source !== previewFrame.contentWindow || !e.data || e.data.type !== 'console') return;
    const level = ['log', 'warn', 'error'].includes(e.data.level) ? e.data.level : 'log';
    const msg = typeof e.data.msg === 'string' ? e.data.msg.slice(0, 10000) : String(e.data.msg);
    let meta = null;
    if (level === 'error' && e.data.line && jsLineOffset) {
      const rel = e.data.line - jsLineOffset + 1;
      if (rel >= 1 && rel <= jsLineCount) {
        meta = { line: e.data.line, col: e.data.col || 1, jumpLine: rel };
      }
    }
    appendLog(level, msg, meta);
  });

  consoleLogs.addEventListener('click', e => {
    const row = e.target.closest('.log.is-jumpable');
    if (row) activateLogJump(row);
  });
  consoleLogs.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('is-jumpable')) {
      e.preventDefault();
      activateLogJump(e.target);
    }
  });

  consoleInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || !e.target.value.trim()) return;
    appendLog('input', e.target.value);
    previewFrame.contentWindow?.postMessage({ type: 'eval', cmd: e.target.value }, '*');
    e.target.value = '';
  });

  consoleInput.addEventListener('focus', () => {
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
    setTimeout(clampDivider, 60);
    setTimeout(clampDivider, 350);
  });

  const btnConsole = $('#btn-toggle-console');
  btnConsole.addEventListener('click', () => {
    const open = !consolePane.classList.toggle('is-hidden');
    btnConsole.classList.toggle('is-armed', open);
    btnConsole.setAttribute('aria-expanded', String(open));
    requestAnimationFrame(clampDivider);
    setTimeout(clampDivider, 420);
  });

  $('#btn-clear-console').addEventListener('click', clearLogs);

  document.addEventListener('sui:beforerender', clearLogs);
}

const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)');

const tipHost = document.createElement('div');
tipHost.className = 'sui-tip';
tipHost.setAttribute('role', 'tooltip');
tipHost.setAttribute('aria-hidden', 'true');
document.body.append(tipHost);

let tipTarget = null;
let tipTimer = 0;

function hideTip() {
  clearTimeout(tipTimer);
  tipTimer = 0;
  tipTarget = null;
  tipHost.classList.remove('is-show');
}

function placeTip(target) {
  const text = target.getAttribute('data-tip');
  if (!text) return;
  tipTarget = target;
  tipHost.textContent = text;
  const rect = target.getBoundingClientRect();
  const tipW = tipHost.offsetWidth;
  const tipH = tipHost.offsetHeight;
  const margin = 8;
  let left = rect.left + rect.width / 2 - tipW / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
  let top = rect.bottom + 9;
  if (top + tipH > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - tipH - 9);
  }
  tipHost.style.left = Math.round(left) + 'px';
  tipHost.style.top = Math.round(top) + 'px';
  tipHost.classList.add('is-show');
}

function initTooltips() {
  if (!FINE_POINTER.matches) return;
  document.addEventListener('mouseover', e => {
    const target = e.target.closest?.('[data-tip]');
    if (target === tipTarget) return;
    clearTimeout(tipTimer);
    if (target && !target.disabled) tipTimer = setTimeout(() => placeTip(target), 300);
    else hideTip();
  });
  document.addEventListener('mousedown', hideTip, true);
  document.addEventListener('focusin', e => {
    const target = e.target.closest?.('[data-tip]');
    if (target) placeTip(target);
  });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('scroll', hideTip, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('blur', hideTip);
  window.addEventListener('resize', hideTip);
}
const seg = $('.segmented');
const segThumb = $('.thumb', seg);
const segTabs = [...seg.querySelectorAll('[role="tab"]')];

let currentTab = 'html';
let editor = null;
const models = {};
const viewStates = {};
let renderTimer = null;
let isFormatting = false;

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
      commitLang(lang, models[lang].getValue());
      scheduleRender();
      if (lang === 'javascript') scheduleLint();
    });
  }
}

function createEditor() {
  editor = monaco.editor.create($('#monaco-editor'), {
    model: models[currentTab],
    theme: suiTheme(),
    fontFamily: '"Fira Code", "SF Mono", ui-monospace, Menlo, Consolas, "Noto Sans JP", monospace',
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
      verticalScrollbarSize: FINE_POINTER.matches ? 12 : 14,
      horizontalScrollbarSize: FINE_POINTER.matches ? 12 : 14,
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      vertical: 'auto',
      horizontal: 'auto',
      alwaysConsumeMouseWheel: false
    }
  });
}

function setupMonacoEnvironment() {
  window.MonacoEnvironment = {
    getWorkerUrl: () => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
      "self.MonacoEnvironment={baseUrl:'" + MONACO_BASE + "/'};" +
      "importScripts('" + MONACO_BASE + "/vs/base/worker/workerMain.js');")
  };
}

function configureTsChecks() {
  const ts = monaco.languages.typescript;
  const jsDefaults = ts.javascriptDefaults;
  jsDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
  jsDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ESNext,
    lib: ['esnext', 'dom', 'dom.iterable'],
    allowJs: true,
    checkJs: true,
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    alwaysStrict: false,
    allowNonTsExtensions: true
  });
}

function onMonacoReady(onEditorReady) {
  defineSuiThemes();
  if (window.emmetMonaco) {
    emmetMonaco.emmetHTML(monaco);
    emmetMonaco.emmetCSS(monaco);
  }
  configureTsChecks();
  createModels();
  createEditor();
  registerFormatters();
  monaco.editor.onDidChangeMarkers(() => scheduleProblems());

  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', e => {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    monaco.editor.setTheme(suiTheme());
    if (store.get('preview-theme', null) === null) {
      applyPreviewTheme(e.matches ? 'dark' : 'light');
    }
  });

  scheduleLint();
  onEditorReady?.();
}

function positionThumb() {
  const active = segTabs.find(b => b.dataset.tab === currentTab);
  if (!active) return;
  segThumb.style.width = active.offsetWidth + 'px';
  segThumb.style.transform = 'translateX(' + active.offsetLeft + 'px)';
}

function setTab(lang) {
  if (editor) viewStates[currentTab] = editor.saveViewState();
  currentTab = lang;
  segTabs.forEach(b => {
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
  replayAnim(box, 'is-swapping');
  positionThumb();
}

function initTabs() {
  segTabs.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  seg.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = segTabs.findIndex(b => b.dataset.tab === currentTab);
    const next = segTabs[(i + (e.key === 'ArrowRight' ? 1 : segTabs.length - 1)) % segTabs.length];
    setTab(next.dataset.tab);
    next.focus();
  });
  requestAnimationFrame(() => seg.classList.add('is-ready'));
}

function prettierEngineReady() {
  return typeof window.prettier === 'object' &&
    window.prettier !== null &&
    typeof window.prettier.format === 'function' &&
    !!window.prettierPlugins &&
    Object.keys(window.prettierPlugins).length > 0;
}

function waitForPrettier(timeout = 4000) {
  if (prettierEngineReady()) return Promise.resolve(true);
  return new Promise(resolve => {
    const startedAt = performance.now();
    const poll = setInterval(() => {
      if (prettierEngineReady() || performance.now() - startedAt > timeout) {
        clearInterval(poll);
        resolve(prettierEngineReady());
      }
    }, 100);
  });
}

async function formatWithPrettier(text, lang) {
  if (!text || !text.trim()) return text;
  const parser = PARSER_BY_LANG[lang];
  if (!parser) return null;
  try {
    const plugins = Object.values(window.prettierPlugins).filter(Boolean);
    const out = await window.prettier.format(text, { ...PRETTIER_STRICT, parser, plugins });
    return typeof out === 'string' && out.length ? out : null;
  } catch {
    return null;
  }
}

function replaceModelText(model, text) {
  model.pushStackElement();
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  model.pushStackElement();
}

async function runFormat(scope) {
  if (isFormatting) return;
  isFormatting = true;
  const btn = $('#btn-format');
  try {
    const ready = await waitForPrettier();
    if (!ready) { flash(btn, 'Failed'); return; }
    const langs = scope === 'all' ? LANGS : [currentTab];
    let ok = 0;
    let fail = 0;
    for (const lang of langs) {
      const model = models[lang];
      if (!model || !model.getValue().trim()) continue;
      const out = await formatWithPrettier(model.getValue(), lang);
      if (out === null) { fail++; continue; }
      if (out !== model.getValue()) replaceModelText(model, out);
      ok++;
    }
    if (fail) {
      flash(btn, 'Failed');
      appendLog('warn', '整形できなかったタブがあります（構文エラーの可能性を確認してください）');
    } else if (ok) {
      flash(btn, 'Done');
    }
  } finally {
    isFormatting = false;
  }
}

function registerFormatters() {
  for (const lang of LANGS) {
    monaco.languages.registerDocumentFormattingEditProvider(lang, {
      provideDocumentFormattingEdits: async model => {
        const ready = await waitForPrettier(3000);
        if (!ready) return [];
        const out = await formatWithPrettier(model.getValue(), lang);
        if (out === null || out === model.getValue()) return [];
        return [{ range: model.getFullModelRange(), text: out }];
      }
    });
  }
}

function setAllTexts(texts) {
  for (const lang of LANGS) {
    if (!(lang in texts)) continue;
    code[lang] = texts[lang];
    if (models[lang]) replaceModelText(models[lang], texts[lang]);
  }
  saveCode(true);
}

function getActiveEditor() {
  return editor;
}

function initEditor({ onEditorReady } = {}) {
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

  $('#btn-copy').addEventListener('click', () => {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getValue())
      .then(() => flash($('#btn-copy'), 'Copied'))
      .catch(() => flash($('#btn-copy'), 'Failed'));
  });
}

const ESLINT_RULES = {
  'no-undef': 'error',
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
  'no-var': 'error',
  'prefer-const': 'warn',
  'eqeqeq': ['error', 'smart'],
  'no-const-assign': 'error',
  'no-redeclare': 'error',
  'no-fallthrough': 'error',
  'no-unreachable': 'error',
  'no-duplicate-case': 'error',
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-self-compare': 'error',
  'no-prototype-builtins': 'warn',
  'no-loss-of-precision': 'error',
  'no-async-promise-executor': 'error',
  'no-shadow-restricted-names': 'error',
  'no-template-curly-in-string': 'warn'
};

const BROWSER_GLOBALS = Object.fromEntries([
  'window', 'document', 'console', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'alert', 'confirm', 'prompt',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'Blob', 'File',
  'FileReader', 'FileList', 'FormData', 'URL', 'URLSearchParams',
  'Image', 'Audio', 'Option', 'Event', 'CustomEvent', 'MessageChannel',
  'MessagePort', 'Request', 'Response', 'Headers', 'AbortController',
  'crypto', 'performance', 'atob', 'btoa', 'structuredClone',
  'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout',
  'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'cancelIdleCallback', 'getComputedStyle',
  'matchMedia', 'screen', 'visualViewport', 'devicePixelRatio',
  'parent', 'top', 'self', 'globalThis', 'frames', 'opener',
  'HTMLElement', 'Element', 'Node', 'NodeList', 'HTMLCollection',
  'EventTarget', 'DOMParser', 'MutationObserver', 'ResizeObserver',
  'IntersectionObserver', 'PerformanceObserver', 'Math', 'JSON',
  'Date', 'Promise', 'Error', 'TypeError', 'RangeError',
  'SyntaxError', 'URIError', 'EvalError', 'AggregateError', 'Object',
  'Array', 'String', 'Number', 'Boolean', 'Function', 'RegExp',
  'Symbol', 'BigInt', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Proxy',
  'Reflect', 'Intl', 'isNaN', 'isFinite', 'parseInt', 'parseFloat',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'NaN', 'Infinity', 'undefined', 'TextEncoder', 'TextDecoder',
  'ReadableStream', 'WritableStream', 'TransformStream',
  'getSelection', 'scrollTo', 'scrollBy', 'open', 'close', 'print',
  'postMessage', 'addEventListener', 'removeEventListener', 'dispatchEvent'
].map(n => [n, 'readonly']));

let eslintEngine = null;
let eslintFlat = true;

function initEslint() {
  const mod = window.eslint || window.Linter;
  const Ctor = mod && typeof mod.Linter === 'function' ? mod.Linter : null;
  if (!Ctor) return false;
  try {
    eslintEngine = new Ctor();
  } catch {
    eslintEngine = null;
    return false;
  }
  try {
    const probe = eslintEngine.verify('const x = 1;', {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'script' },
      rules: {}
    });
    eslintFlat = !probe.some(m => /Parsing error/i.test(m.message || ''));
  } catch {
    eslintFlat = false;
  }
  return true;
}

function lintJs() {
  if (!models.javascript) return;
  if (!eslintEngine) {
    monaco.editor.setModelMarkers(models.javascript, 'eslint', []);
    scheduleProblems();
    return;
  }
  const src = models.javascript.getValue();
  if (!src.trim()) {
    monaco.editor.setModelMarkers(models.javascript, 'eslint', []);
    scheduleProblems();
    return;
  }
  let messages = [];
  try {
    messages = eslintFlat
      ? eslintEngine.verify(src, {
          languageOptions: { ecmaVersion: 'latest', sourceType: 'script', globals: BROWSER_GLOBALS },
          rules: ESLINT_RULES
        })
      : eslintEngine.verify(src, {
          env: { browser: true, es2021: true },
          parserOptions: { ecmaVersion: 'latest', sourceType: 'script' },
          rules: ESLINT_RULES
        });
  } catch {
    messages = [];
  }
  messages = messages.filter(m => !/was not found/i.test(m.message || ''));
  monaco.editor.setModelMarkers(models.javascript, 'eslint', messages.map(m => ({
    startLineNumber: m.line,
    startColumn: m.column,
    endLineNumber: m.endLine || m.line,
    endColumn: m.endColumn || m.column + 1,
    message: m.ruleId ? `${m.message} (${m.ruleId})` : m.message,
    severity: m.severity === 2 ? 8 : 4,
    source: 'ESLint'
  })));
  scheduleProblems();
}

let lintTimer = null;
function scheduleLint() {
  clearTimeout(lintTimer);
  lintTimer = setTimeout(lintJs, 400);
}

const problemsPane = $('#problems-pane');
const problemsList = $('#problems-list');
const problemsSummary = $('#problems-summary');
const problemsBadge = $('#problems-badge');
const btnProblems = $('#btn-problems');

const PROBLEM_ICONS = {
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>'
};

function collectProblems() {
  const items = [];
  if (window.monaco) {
    for (const lang of LANGS) {
      const model = models[lang];
      if (!model) continue;
      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const fixedSource = lang === 'html' ? 'HTML' : lang === 'css' ? 'CSS' : null;
      for (const m of markers) {
        items.push({
          lang,
          line: m.startLineNumber,
          col: m.startColumn,
          severity: m.severity === 8 ? 'error' : m.severity === 4 ? 'warn' : 'info',
          message: m.message,
          source: fixedSource || (m.owner === 'eslint' ? 'ESLint' : 'TypeScript'),
          static: false
        });
      }
    }
  }
  if (!eslintEngine) {
    items.push({
      lang: 'javascript', line: 0, col: 0, severity: 'info',
      message: 'ESLint を読み込めませんでした（ネットワーク接続をご確認ください）',
      source: 'SuiEditor', static: true
    });
  }
  return items;
}

function buildProblemRow(item) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'problem-item ' + item.severity;
  btn.setAttribute('role', 'listitem');
  const ico = document.createElement('span');
  ico.className = 'problem-ico';
  ico.setAttribute('aria-hidden', 'true');
  ico.innerHTML = PROBLEM_ICONS[item.severity];
  const msg = document.createElement('span');
  msg.className = 'problem-msg';
  msg.textContent = item.message;
  const meta = document.createElement('span');
  meta.className = 'problem-meta';
  const src = document.createElement('span');
  src.className = 'problem-src';
  src.textContent = item.source;
  const loc = document.createElement('span');
  loc.className = 'problem-loc';
  loc.textContent = item.lang.toUpperCase() + ' ' + item.line + ':' + item.col;
  meta.append(src, loc);
  btn.append(ico, msg, meta);
  if (item.static) {
    btn.disabled = true;
  } else {
    btn.addEventListener('click', () => jumpToLine(item.lang, item.line, item.col));
  }
  return btn;
}

function renderProblems() {
  const items = collectProblems();
  const errors = items.filter(i => i.severity === 'error').length;
  const warns = items.filter(i => i.severity === 'warn').length;

  problemsSummary.textContent = (errors || warns) ? `エラー ${errors} ・ 警告 ${warns}` : '問題はありません';
  problemsSummary.classList.toggle('has-errors', errors > 0);
  problemsSummary.classList.toggle('has-warns', errors === 0 && warns > 0);

  problemsBadge.hidden = items.length === 0;
  problemsBadge.textContent = String(items.length);
  problemsBadge.classList.toggle('is-warn', errors === 0);

  problemsList.textContent = '';
  const weight = { error: 0, warn: 1, info: 2 };
  const sorted = [...items].sort((a, b) => {
    if (weight[a.severity] !== weight[b.severity]) return weight[a.severity] - weight[b.severity];
    if (a.line !== b.line) return a.line - b.line;
    return a.col - b.col;
  });
  for (const item of sorted) problemsList.append(buildProblemRow(item));
}

let problemsTimer = 0;
function scheduleProblems() {
  clearTimeout(problemsTimer);
  problemsTimer = setTimeout(renderProblems, 200);
}

function initProblems() {
  btnProblems.addEventListener('click', () => {
    const open = !problemsPane.classList.toggle('is-hidden');
    btnProblems.setAttribute('aria-expanded', String(open));
    btnProblems.classList.toggle('is-armed', open);
    renderProblems();
  });
  $('#btn-close-problems').addEventListener('click', () => {
    problemsPane.classList.add('is-hidden');
    btnProblems.setAttribute('aria-expanded', 'false');
    btnProblems.classList.remove('is-armed');
  });
}

function jumpToLine(lang, line, col) {
  if (!models[lang]) return;
  setTab(lang);
  if (!editor) return;
  const maxLine = models[lang].getLineCount();
  const ln = Math.min(Math.max(1, line), maxLine);
  editor.revealLineInCenter(ln);
  editor.setPosition({
    lineNumber: ln,
    column: Math.min(Math.max(1, col || 1), models[lang].getLineMaxColumn(ln))
  });
  editor.focus();
}
function extractCode(html) {
  const styles = [], scripts = [];
  const isJs = attrs => {
    if (/\ssrc\s*=/i.test(attrs)) return false;
    const t = (attrs.match(/\stype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '';
    return !t || /^(module|text\/javascript|application\/javascript|text\/ecmascript|application\/ecmascript)$/i.test(t);
  };
  html = String(html ?? '').replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, inner) => {
    if (inner.trim()) styles.push(inner.trim());
    return '';
  });
  html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, inner) => {
    if (!isJs(attrs)) return m;
    if (inner.trim()) scripts.push(inner.trim());
    return '';
  });
  return { html, styles, scripts };
}

function parseImportedHtml(text) {
  const ex = extractCode(text);
  const body = ex.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return {
    html: (body ? body[1] : ex.html).trim(),
    css: ex.styles.join('\n\n'),
    js: ex.scripts.join('\n\n')
  };
}

function injectHead(html, payload) {
  if (!payload) return html;
  if (/<\/head\s*>/i.test(html)) return html.replace(/<\/head\s*>/i, m => payload + '\n' + m);
  const bodyOpen = /<body(\s[^>]*)?>/i;
  if (bodyOpen.test(html)) return html.replace(bodyOpen, m => payload + '\n' + m);
  return payload + '\n' + html;
}

function injectBodyEnd(html, payload) {
  if (!payload) return html;
  if (/<\/body\s*>/i.test(html)) return html.replace(/<\/body\s*>/i, m => payload + '\n' + m);
  const bodyOpen = /<body(\s[^>]*)?>/i;
  if (bodyOpen.test(html)) return html.replace(bodyOpen, m => m + '\n' + payload);
  if (/<\/html\s*>/i.test(html)) return html.replace(/<\/html\s*>/i, m => payload + '\n' + m);
  return html + '\n' + payload;
}

function composeDocument(html, cssBlock, jsBlock, extra = {}) {
  const headExtra = extra.head || '';
  const bodyExtra = extra.body || '';
  html = String(html ?? '').replace(/\r\n?/g, '\n').trim();

  if (!/<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<\/head|<\/body|<\/html/i.test(html)) {
    let out = '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n';
    if (headExtra) out += headExtra + '\n';
    if (cssBlock) out += cssBlock + '\n';
    out += '</head>\n<body>\n';
    if (bodyExtra) out += bodyExtra + '\n';
    out += html + '\n';
    if (jsBlock) out += jsBlock + '\n';
    return out + '</body>\n</html>';
  }

  let out = html;
  const has = re => re.test(out);

  if (!has(/<body[\s>]|<\/body\s*>/i)) {
    const skeleton = '<head>\n<meta charset="utf-8">\n</head>\n<body>';
    if (has(/<\/head\s*>/i)) out = out.replace(/<\/head\s*>/i, m => m + '\n<body>');
    else if (has(/<html(\s[^>]*)?>/i)) out = out.replace(/<html(\s[^>]*)?>/i, m => m + '\n' + skeleton);
    else if (has(/<!doctype\s+html[^>]*>/i)) out = out.replace(/<!doctype\s+html[^>]*>/i, m => m + '\n' + skeleton);
    else out = skeleton + '\n' + out;
    out = has(/<\/html\s*>/i)
      ? out.replace(/<\/html\s*>/i, m => '</body>\n' + m)
      : out + '\n</body>';
  }
  if (!has(/<head[\s>]|<\/head\s*>/i) && has(/<body(\s[^>]*)?>/i)) {
    out = out.replace(/<body(\s[^>]*)?>/i, m => '<head>\n<meta charset="utf-8">\n</head>\n' + m);
  }
  if (has(/<body(\s[^>]*)?>/i) && !has(/<\/body\s*>/i)) {
    out = has(/<\/html\s*>/i)
      ? out.replace(/<\/html\s*>/i, m => '</body>\n' + m)
      : out + '\n</body>';
  }
  if (!has(/<html[\s>]/i)) {
    out = has(/<head(\s[^>]*)?>/i)
      ? out.replace(/<head(\s[^>]*)?>/i, m => '<html>\n' + m)
      : has(/<body(\s[^>]*)?>/i)
        ? out.replace(/<body(\s[^>]*)?>/i, m => '<html>\n' + m)
        : '<html>\n' + out;
  }
  if (!has(/<\/html\s*>/i)) out += '\n</html>';
  if (!has(/<!doctype\s+html/i)) out = '<!DOCTYPE html>\n' + out;

  out = injectHead(out, headExtra);
  out = injectHead(out, cssBlock);
  out = injectBodyEnd(out, bodyExtra);
  out = injectBodyEnd(out, jsBlock);
  return out;
}

function makeCssRefRegex() {
  return /<link\b[^>]*\bhref\s*=\s*["']?(?:[^"'>\s]*\/)?style\.css(?:\?[^"'>\s]*)?(?:#[^"'>\s]*)?["']?[^>]*>/gi;
}

function makeJsRefRegex() {
  return /<script\b[^>]*\bsrc\s*=\s*["']?(?:[^"'>\s]*\/)?script\.js(?:\?[^"'>\s]*)?(?:#[^"'>\s]*)?["']?[^>]*>\s*<\/script>/gi;
}

function containsBlock(doc, block) {
  const probe = block.trim().slice(0, 80);
  return !probe || doc.includes(probe);
}

function composeExport(html, css, js) {
  html = String(html ?? '').replace(/\r\n?/g, '\n');
  const cssBlock = css ? '<style>\n' + css + '\n</style>' : '';
  const escapedJs = js ? String(js).replace(/<\/script/gi, '<\\/script') : '';
  const jsBlock = js ? '<script>\n' + escapedJs + '\n</script>' : '';
  const extra = { head: cssLinks(), body: jsScripts() };

  let mergedCss = false;
  html = html.replace(makeCssRefRegex(), () => {
    if (mergedCss) return '';
    mergedCss = true;
    return cssBlock;
  });
  let mergedJs = false;
  html = html.replace(makeJsRefRegex(), () => {
    if (mergedJs) return '';
    mergedJs = true;
    return jsBlock;
  });

  let out = composeDocument(
    html,
    mergedCss ? '' : cssBlock,
    mergedJs ? '' : jsBlock,
    extra
  );
  if (cssBlock && !containsBlock(out, cssBlock)) out = injectHead(out, cssBlock);
  if (jsBlock && !containsBlock(out, jsBlock)) out = injectBodyEnd(out, jsBlock);
  return out;
}

function buildSplitFiles() {
  const ex = extractCode(code.html);
  const css = [code.css.trim(), ex.styles.join('\n\n')].filter(Boolean).join('\n\n');
  const js = [code.javascript.trim(), ex.scripts.join('\n\n')].filter(Boolean).join('\n\n');
  const hasCssRef = /<link\b[^>]*\bhref\s*=\s*["']?(?:[^"'>\s]*\/)?style\.css(?=["'\s>?#])/i.test(ex.html);
  const hasJsRef = /<script\b[^>]*\bsrc\s*=\s*["']?(?:[^"'>\s]*\/)?script\.js(?=["'\s>?#])/i.test(ex.html);
  const html = composeDocument(
    ex.html,
    css && !hasCssRef ? '<link rel="stylesheet" href="style.css">' : '',
    js && !hasJsRef ? '<script src="script.js"></script>' : '',
    { head: cssLinks(), body: jsScripts() }
  );
  const files = [{ name: 'index.html', text: html + '\n' }];
  if (css) files.push({ name: 'style.css', text: css + '\n' });
  if (js) files.push({ name: 'script.js', text: js + '\n' });
  return files;
}

function sanitizeFilename(raw) {
  let cleaned = String(raw ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 60)
    .trim();
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(cleaned)) cleaned = 'SuiEditor_' + cleaned;
  return cleaned;
}

function rememberProjectName(text) {
  const m = String(text ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const name = sanitizeFilename(m ? m[1] : '');
  if (name) store.set('project-name', name);
}

function projectBaseName() {
  const m = String(code.html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const fromHtml = sanitizeFilename(m ? m[1] : '');
  if (fromHtml) return fromHtml;
  const stored = sanitizeFilename(String(store.get('project-name', '') || ''));
  return stored || 'SuiEditor';
}

async function saveFile(data, suggestedName, mime, pickerAccept) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: pickerAccept.desc, accept: { [mime.split(';')[0]]: pickerAccept.exts } }]
      });
      const stream = await handle.createWritable();
      await stream.write(data);
      await stream.close();
      return 'Saved';
    } catch (err) {
      if (err?.name === 'AbortError') return '';
    }
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const a = Object.assign(document.createElement('a'), { href: url, download: suggestedName });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'Exported';
  } catch {
    if (typeof data === 'string') {
      try {
        await navigator.clipboard.writeText(data);
        return 'Copied';
      } catch { }
    }
    return 'Failed';
  }
}

function makeZip(files) {
  const enc = new TextEncoder();
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  const crc32 = u8 => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = table[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >>> 1);
  const dosDate = (((d.getFullYear() - 1980) & 0x7F) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [];
  const entries = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 0x0800, true);
    head.setUint16(8, 0, true);
    head.setUint16(10, dosTime, true);
    head.setUint16(12, dosDate, true);
    head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true);
    head.setUint32(22, data.length, true);
    head.setUint16(26, name.length, true);
    head.setUint16(28, 0, true);
    parts.push(new Uint8Array(head.buffer), name, data);
    entries.push({ name, size: data.length, crc, offset });
    offset += 30 + name.length + data.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const e of entries) {
    const head = new DataView(new ArrayBuffer(46));
    head.setUint32(0, 0x02014b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 20, true);
    head.setUint16(8, 0x0800, true);
    head.setUint16(10, 0, true);
    head.setUint16(12, dosTime, true);
    head.setUint16(14, dosDate, true);
    head.setUint32(16, e.crc, true);
    head.setUint32(20, e.size, true);
    head.setUint32(24, e.size, true);
    head.setUint16(28, e.name.length, true);
    head.setUint32(42, e.offset, true);
    parts.push(new Uint8Array(head.buffer), e.name);
    cdSize += 46 + e.name.length;
  }
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, cdStart, true);
  parts.push(new Uint8Array(eocd.buffer));
  return new Blob(parts, { type: 'application/zip' });
}

const IMPORT_EXTS = ['html', 'css', 'js', 'txt'];
const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
const KIND_LABEL = { html: 'HTML', css: 'CSS', javascript: 'JS' };

function detectImportKind(ext, text) {
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js') return 'javascript';
  if (/<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(text)) return 'html';
  const cssHints = (text.match(/[\w-]+\s*:\s*[^;{}]+;/g) || []).length;
  const cssAtRule = /@[\w-]+[^{}]*\{/.test(text);
  const selectorBrace = /(^|\n)\s*[^{}@\n][^{}\n]*\{/.test(text);
  const jsHints = /(^|\n)\s*(function\s|async\s+function\s|const\s|let\s|var\s|return\s|if\s*\(|for\s*\(|while\s*\(|=>)/.test(text);
  if (!jsHints && (cssHints >= 1 || (cssAtRule && selectorBrace))) return 'css';
  return 'javascript';
}

function applyImportKind(kind, text) {
  if (kind === 'css') {
    setAllTexts({ css: text });
    return;
  }
  if (kind === 'javascript') {
    setAllTexts({ javascript: text });
    return;
  }
  const parsed = parseImportedHtml(text);
  const next = { html: parsed.html || text };
  if (parsed.css) next.css = parsed.css;
  if (parsed.js) next.javascript = parsed.js;
  rememberProjectName(text);
  setAllTexts(next);
}

async function importFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return false;
  const imported = [];
  const rejected = [];
  let lastKind = null;
  for (const file of files) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!IMPORT_EXTS.includes(ext)) {
      rejected.push(file.name + '（未対応の形式）');
      continue;
    }
    if (file.size > IMPORT_MAX_BYTES) {
      rejected.push(file.name + '（サイズ上限 2MB）');
      continue;
    }
    if (file.type && /(msdownload|octet-stream|x-msdownload|x-executable|zip|gzip|tar|rar|7z|image\/|video\/|audio\/|pdf)/i.test(file.type)) {
      rejected.push(file.name + '（実行・バイナリファイル）');
      continue;
    }
    let text = '';
    try {
      text = await file.text();
    } catch {
      rejected.push(file.name + '（読み込みエラー）');
      continue;
    }
    if (!text || /[\u0000-\u0008\u000e-\u001f]/.test(text.slice(0, 4096))) {
      rejected.push(file.name + '（テキストとして判別できません）');
      continue;
    }
    const kind = detectImportKind(ext, text);
    applyImportKind(kind, text);
    imported.push(file.name + ' → ' + KIND_LABEL[kind]);
    lastKind = kind;
  }
  if (imported.length) {
    saveCode(true);
    render();
    pulsePreview();
    if (lastKind) setTab(lastKind);
    appendLog('log', '読み込み完了: ' + imported.join('、'));
    flash($('#btn-import'), 'Imported');
  }
  if (rejected.length) {
    appendLog('warn', '読み込めなかったファイル: ' + rejected.join('、'));
    flash($('#btn-import'), 'Failed');
  }
  return imported.length > 0;
}

const exportBtn = $('#btn-dl');
const exportMenu = $('#export-menu');
const fileImport = $('#file-import');

const MENU_IDS = ['export-menu', 'cdn-menu', 'clear-menu', 'format-menu'];

function closeMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.classList.remove('is-open');
  const btn = document.getElementById(menu.dataset.btn);
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function closeAllMenus() {
  for (const id of MENU_IDS) closeMenu(id);
}

function toggleMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return false;
  const willOpen = !menu.classList.contains('is-open');
  closeAllMenus();
  menu.classList.toggle('is-open', willOpen);
  const btn = document.getElementById(menu.dataset.btn);
  if (btn) btn.setAttribute('aria-expanded', String(willOpen));
  return willOpen;
}

const dropOverlay = $('#drop-overlay');
let dragDepth = 0;

function hasFilePayload(e) {
  return !!(e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files'));
}

function initDragImport() {
  window.addEventListener('dragenter', e => {
    if (!hasFilePayload(e)) return;
    e.preventDefault();
    dragDepth++;
    dropOverlay.classList.add('is-show');
  }, true);
  window.addEventListener('dragover', e => {
    if (!hasFilePayload(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, true);
  window.addEventListener('dragleave', e => {
    if (!hasFilePayload(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropOverlay.classList.remove('is-show');
  }, true);
  window.addEventListener('drop', e => {
    if (!hasFilePayload(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dropOverlay.classList.remove('is-show');
    importFiles(e.dataTransfer.files);
  }, true);
}

async function doExport(mode) {
  if (mode === 'split') {
    return saveFile(
      makeZip(buildSplitFiles()), projectBaseName() + '.zip', 'application/zip',
      { desc: 'ZIP', exts: ['.zip'] });
  }
  const css = code.css.replace(/\r\n?/g, '\n').trim();
  const js = code.javascript.replace(/\r\n?/g, '\n').trim();
  return saveFile(
    composeExport(code.html, css, js), 'index.html', 'text/html;charset=utf-8',
    { desc: 'HTML', exts: ['.html'] });
}

function initExporter() {
  $('#btn-import').addEventListener('click', () => fileImport.click());
  fileImport.addEventListener('change', async () => {
    const files = fileImport.files;
    fileImport.value = '';
    if (!files || !files.length) return;
    await importFiles(files);
  });

  exportBtn.addEventListener('click', () => toggleMenu('export-menu'));
  exportMenu.querySelectorAll('[data-export]').forEach(b => {
    b.addEventListener('click', async () => {
      closeAllMenus();
      const result = await doExport(b.dataset.export);
      if (result) flash(exportBtn, result);
    });
  });
}

function initClearMenu() {
  $('#btn-clear').addEventListener('click', () => toggleMenu('clear-menu'));
  $('#clear-menu').querySelectorAll('[data-clear]').forEach(b => {
    b.addEventListener('click', () => {
      const kind = b.dataset.clear;
      closeAllMenus();
      if (kind === 'reset') runClear(INITIAL_CODE);
      else if (kind === 'empty') runClear({ html: '', css: '', javascript: '' });
    });
  });
}

function runClear(texts) {
  setAllTexts(texts);
  render();
  pulsePreview();
  flash($('#btn-clear'), 'Cleared');
}

function initFormatMenu() {
  $('#btn-format').addEventListener('click', () => toggleMenu('format-menu'));
  $('#format-menu').querySelectorAll('[data-format]').forEach(b => {
    b.addEventListener('click', () => {
      closeAllMenus();
      runFormat(b.dataset.format);
    });
  });
}

const divider = $('#divider');
const layoutConsolePane = $('#console-pane');

function minContentSize(el) {
  if (!el) return 0;
  const prev = el.style.width;
  el.style.width = 'min-content';
  const w = el.offsetWidth;
  el.style.width = prev;
  return w;
}

function computeLimits() {
  const vert = window.innerWidth <= 720;
  const vv = window.visualViewport;
  const total = Math.max(200, vert
    ? Math.min(window.innerHeight, vv ? vv.height : window.innerHeight)
    : window.innerWidth);
  const pad = vert ? 8 : 10;
  const gap = vert ? 8 : 10;
  const fudge = vert ? 13 : 15;
  const appSize = total - pad * 2;
  const editNav = $('#edit .pane-nav');
  const viewNav = $('.pane-nav', $('#view'));
  const consoleOpen = !layoutConsolePane.classList.contains('is-hidden');
  const active = getActiveEditor();
  const lineH = (window.monaco && active)
    ? active.getOption(monaco.editor.EditorOption.lineHeight)
    : 23;
  let minEditPx, viewMinPx;
  if (vert) {
    const editNavH = editNav?.offsetHeight || 46;
    const viewNavH = viewNav?.offsetHeight || 46;
    if (consoleOpen) {
      minEditPx = editNavH;
      viewMinPx = viewNavH + gap + (layoutConsolePane?.offsetHeight || 0);
    } else {
      minEditPx = editNavH + lineH * 5 + 24;
      viewMinPx = viewNavH + lineH * 5;
    }
  } else {
    minEditPx = Math.max(140, minContentSize(editNav) + 2);
    viewMinPx = Math.max(120, minContentSize(viewNav) + 2);
  }
  const maxEditPx = Math.max(0, appSize - gap * 2 - 10 - viewMinPx);
  const minEditUse = Math.min(minEditPx, maxEditPx);
  return {
    vert, total, pad, fudge, appSize,
    minEditPx: minEditUse,
    maxEditPx,
    minS: Math.max(0, (minEditUse + fudge) / appSize * 100),
    maxS: Math.max(0, Math.min(100, (maxEditPx + fudge) / appSize * 100))
  };
}

function setSplit(pct, L) {
  L = L || computeLimits();
  pct = Math.max(L.minS, Math.min(L.maxS, pct));
  document.body.style.setProperty('--s', pct + '%');
  divider.setAttribute('aria-valuenow', String(Math.round(pct)));
}

function clampDivider() {
  const L = computeLimits();
  divider.setAttribute('aria-valuemin', String(Math.round(L.minS)));
  divider.setAttribute('aria-valuemax', String(Math.round(L.maxS)));
  setSplit(parseFloat(document.body.style.getPropertyValue('--s')) || 50, L);
}

let isDragging = false;
let dragLimits = null;

function stopDrag(e) {
  if (!isDragging) return;
  isDragging = false;
  dragLimits = null;
  try { divider.releasePointerCapture(e.pointerId); } catch { }
  document.body.classList.remove('is-dragging');
  $('#edit').style.transition = '';
}

let prevViewportH = 0;
let splitBeforeKeyboard = null;

function syncViewportHeight() {
  const vv = window.visualViewport;
  if (!vv) return;
  if (window.innerWidth <= 720) {
    const h = Math.round(vv.height);
    document.body.style.height = h + 'px';
    const y = Math.round(vv.offsetTop || 0);
    document.body.style.transform = y ? 'translateY(' + y + 'px)' : '';
    if (prevViewportH && prevViewportH - h > 120 && splitBeforeKeyboard === null) {
      splitBeforeKeyboard = parseFloat(document.body.style.getPropertyValue('--s')) || 50;
    } else if (prevViewportH && h - prevViewportH > 120 && splitBeforeKeyboard !== null) {
      document.body.style.setProperty('--s', splitBeforeKeyboard + '%');
      splitBeforeKeyboard = null;
    }
    prevViewportH = h;
  } else if (document.body.style.height) {
    document.body.style.height = '';
    document.body.style.transform = '';
    prevViewportH = 0;
    splitBeforeKeyboard = null;
  }
  clampDivider();
}

function initLayout() {
  divider.addEventListener('pointerdown', e => {
    isDragging = true;
    dragLimits = computeLimits();
    divider.setPointerCapture(e.pointerId);
    document.body.classList.add('is-dragging');
    $('#edit').style.transition = 'none';
  });

  divider.addEventListener('pointermove', e => {
    if (!isDragging || !dragLimits) return;
    const { vert, pad, appSize, fudge, minEditPx, maxEditPx } = dragLimits;
    const current = vert ? e.clientY : e.clientX;
    const editPx = Math.max(minEditPx, Math.min(maxEditPx, current - pad));
    setSplit((editPx + fudge) / appSize * 100, dragLimits);
  });

  divider.addEventListener('pointerup', stopDrag);
  divider.addEventListener('pointercancel', stopDrag);

  divider.addEventListener('keydown', e => {
    const d = { ArrowLeft: -2, ArrowUp: -2, ArrowRight: 2, ArrowDown: 2 }[e.key];
    if (!d) return;
    e.preventDefault();
    setSplit((parseFloat(document.body.style.getPropertyValue('--s')) || 50) + d);
  });

  addEventListener('resize', () => {
    positionThumb();
    clampDivider();
  });
  addEventListener('load', () => {
    positionThumb();
    clampDivider();
  });
  window.visualViewport?.addEventListener('resize', syncViewportHeight);
  window.visualViewport?.addEventListener('scroll', syncViewportHeight);
}

function wireGlobalHandlers() {
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });

  document.addEventListener('pointerdown', e => {
    if (e.target.closest?.('button, #console-input')) {
      const sel = getSelection();
      if (sel && !sel.isCollapsed) sel.removeAllRanges();
    }
    if (!e.target.closest?.('.export-wrap')) closeAllMenus();
  });

  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 'Enter' || e.key.toLowerCase() === 's')) {
      e.preventDefault();
      render();
      pulsePreview();
      return;
    }
    if (mod && ['+', '-', '=', '_', '0'].includes(e.key)) e.preventDefault();
    if (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f') && !mod) {
      e.preventDefault();
      runFormat('current');
      return;
    }
    if (e.key === 'Escape') {
      hideTip();
      closeAllMenus();
      const consolePaneEl = $('#console-pane');
      if (!e.target.closest?.('#monaco-editor') && !consolePaneEl.classList.contains('is-hidden')) {
        $('#btn-toggle-console').click();
      }
    }
  });
}

initPreview();
initConsolePanel();
initCdn();
initEslint();
initEditor({ onEditorReady: clampDivider });
initExporter();
initClearMenu();
initFormatMenu();
initProblems();
initDragImport();
initLayout();
wireGlobalHandlers();
initTooltips();

render();
positionThumb();
clampDivider();
syncViewportHeight();

addEventListener('pagehide', () => saveCode(true));

window.SuiEditor = {
  composeExport,
  buildSplitFiles,
  makeZip,
  projectBaseName,
  sanitizeFilename,
  importFiles,
  detectImportKind,
  toggleLib,
  lintJs,
  renderProblems,
  setTab,
  runFormat,
  problems: collectProblems
};
