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
    function send(level, args) {
      window.parent.postMessage({
        type: 'console',
        level: level,
        msg: Array.prototype.map.call(args, format).join(' ')
      }, '*');
    }
    ['log', 'info', 'debug', 'warn', 'error'].forEach(function (m) {
      var orig = console[m];
      var level = (m === 'warn' || m === 'error') ? m : 'log';
      console[m] = function () { orig.apply(console, arguments); send(level, arguments); };
    });
    window.addEventListener('error', function (e) {
      send('error', [e.message + (e.lineno ? ' (Line ' + e.lineno + ')' : '')]);
    });
    window.addEventListener('unhandledrejection', function (e) {
      send('error', ['Unhandled rejection: ' + format(e.reason)]);
    });
    window.addEventListener('message', function (e) {
      if (e.source !== window.parent || !e.data || e.data.type !== 'eval' || typeof e.data.cmd !== 'string') return;
      try {
        var r = (0, eval)(e.data.cmd);
        if (r && typeof r.then === 'function') {
          r.then(function (v) { send('log', [v]); }, function (err) { send('error', [err]); });
        } else { send('log', [r]); }
      } catch (err) { send('error', [err]); }
    });
  })();
</script>`;

const CDN_LIBRARIES = [
  { id: 'jquery', label: 'jQuery', version: '3.7.1', category: 'フレームワーク',
    description: 'DOM 操作・Ajax・アニメーションの定番',
    keywords: 'jquery dom ajax',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js'] },
  { id: 'vue', label: 'Vue.js 3', version: '3.4.21', category: 'フレームワーク',
    description: 'リアクティブなUIを組み立てられる軽量フレームワーク',
    keywords: 'vue vuejs vue3',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/vue/3.4.21/vue.global.prod.min.js'] },
  { id: 'react', label: 'React 18', version: '18.2.0', category: 'フレームワーク',
    description: '宣言的なUI構築ライブラリ（ReactDOM 同梱）',
    keywords: 'react reactdom component',
    css: [],
    js: [
      'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js'
    ] },
  { id: 'alpine', label: 'Alpine.js', version: '3.13.10', category: 'フレームワーク',
    description: 'HTMLに属性を足すだけで動く超軽量フレームワーク',
    keywords: 'alpine alpinejs',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/alpinejs/3.13.10/cdn.min.js'] },
  { id: 'htmx', label: 'htmx', version: '1.9.12', category: 'フレームワーク',
    description: 'HTML属性だけでAJAX遷移を実現するハイパーテキスト',
    keywords: 'htmx ajax html',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/htmx/1.9.12/htmx.min.js'] },
  { id: 'bootstrap', label: 'Bootstrap 5', version: '5.3.3', category: 'UI / デザイン',
    description: '定番レスポンシブUIフレームワーク（JSバンドル同梱）',
    keywords: 'bootstrap twitter css',
    css: ['https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.3/css/bootstrap.min.css'],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.3/js/bootstrap.bundle.min.js'] },
  { id: 'tailwind', label: 'Tailwind CSS', version: 'Play CDN', category: 'UI / デザイン',
    description: 'ユーティリティファーストのCSS（ブラウザ内ビルド）',
    keywords: 'tailwind utility css',
    css: ['https://cdn.tailwindcss.com'],
    js: [] },
  { id: 'fontawesome', label: 'Font Awesome', version: '6.5.2', category: 'UI / デザイン',
    description: '1600種以上のアイコンフォント',
    keywords: 'fontawesome icon アイコン',
    css: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'],
    js: [] },
  { id: 'bulma', label: 'Bulma', version: '0.9.4', category: 'UI / デザイン',
    description: 'JS不要のFlexboxベースCSSフレームワーク',
    keywords: 'bulma css flexbox',
    css: ['https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css'],
    js: [] },
  { id: 'gsap', label: 'GSAP', version: '3.12.5', category: 'アニメーション',
    description: 'タイムライン駆動の高速アニメーションエンジン',
    keywords: 'gsap tween timeline',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'] },
  { id: 'anime', label: 'anime.js', version: '3.2.2', category: 'アニメーション',
    description: '軽量なアニメーションライブラリ（CSS/SVG対応）',
    keywords: 'anime animejs svg',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js'] },
  { id: 'aos', label: 'AOS', version: '2.3.4', category: 'アニメーション',
    description: 'スクロール連動のフェード表示（CSS + JS）',
    keywords: 'aos scroll スクロール reveal',
    css: ['https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css'],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js'] },
  { id: 'typed', label: 'Typed.js', version: '2.0.12', category: 'アニメーション',
    description: 'タイプライター風の文字表示エフェクト',
    keywords: 'typed typewriter タイポ',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/typed.js/2.0.12/typed.min.js'] },
  { id: 'chartjs', label: 'Chart.js', version: '4.4.1', category: 'グラフ / データ',
    description: 'canvasベースのグラフ描画ライブラリ',
    keywords: 'chart chartjs グラフ graph',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'] },
  { id: 'echarts', label: 'ECharts', version: '5.5.0', category: 'グラフ / データ',
    description: '中国発の高機能グラフライブラリ（Apache）',
    keywords: 'echarts グラフ chart baidu',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js'] },
  { id: 'd3', label: 'D3.js', version: '7.9.0', category: 'グラフ / データ',
    description: 'データ駆動ドキュメントの定番（SVG操作）',
    keywords: 'd3 dataviz svg データビジュアル',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js'] },
  { id: 'lodash', label: 'Lodash', version: '4.17.21', category: 'ユーティリティ',
    description: '配列・オブジェクト操作のユーティリティ集',
    keywords: 'lodash underscore utils',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js'] },
  { id: 'axios', label: 'Axios', version: '1.6.8', category: 'ユーティリティ',
    description: 'PromiseベースのHTTPクライアント',
    keywords: 'axios ajax http fetch',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.8/axios.min.js'] },
  { id: 'dayjs', label: 'Day.js', version: '1.11.10', category: 'ユーティリティ',
    description: '2KBの軽量日付ライブラリ（Moment互換API）',
    keywords: 'dayjs date 日付 moment',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.10/dayjs.min.js'] },
  { id: 'marked', label: 'marked', version: '12.0.2', category: 'ユーティリティ',
    description: 'MarkdownをHTMLへ変換するパーサ',
    keywords: 'marked markdown md',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js'] },
  { id: 'howler', label: 'Howler.js', version: '2.2.4', category: 'ユーティリティ',
    description: 'Web Audioの音声再生ラッパー',
    keywords: 'howler audio sound 音',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js'] },
  { id: 'three', label: 'three.js', version: 'r158', category: '3D / クリエイティブ',
    description: 'WebGL 3D描画の定番エンジン',
    keywords: 'three threejs webgl 3d',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js'] },
  { id: 'p5', label: 'p5.js', version: '1.9.0', category: '3D / クリエイティブ',
    description: 'クリエイティブコーディング向けの描画ライブラリ',
    keywords: 'p5 processing creative',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js'] },
  { id: 'matter', label: 'Matter.js', version: '0.19.0', category: '3D / クリエイティブ',
    description: '2D物理エンジン（剛体・衝突）',
    keywords: 'matter physics 物理 engine',
    css: [],
    js: ['https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'] }
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

const OWN_STORAGE_KEYS = ['theme', 'code', 'preview-theme', 'cdn', 'cdn-custom'];
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
let cdnCustom = [];

const cdnBtn = $('#btn-cdn');
const cdnMenu = $('#cdn-menu');
const cdnList = $('#cdn-list');
const cdnSearch = $('#cdn-search');
const cdnCustomForm = $('#cdn-custom-form');
const cdnCustomUrl = $('#cdn-custom-url');

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

function persistCdn() {
  store.set('cdn', [...cdnEnabled]);
  store.set('cdn-custom', cdnCustom);
}

function restoreCdn() {
  cdnEnabled = new Set(store.get('cdn', []));
  cdnCustom = Array.isArray(store.get('cdn-custom', [])) ? store.get('cdn-custom', []) : [];
  cdnCustom = cdnCustom.filter(c =>
    c && typeof c.id === 'string' && typeof c.url === 'string' &&
    typeof c.label === 'string' && /^(js|css)$/.test(String(c.type))
  );
  const known = new Set([...CDN_LIBRARIES.map(l => l.id), ...cdnCustom.map(c => c.id)]);
  cdnEnabled = new Set([...cdnEnabled].filter(id => known.has(id)));
}

function cdnRegistry() {
  const customLibs = cdnCustom.map(c => ({
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

const escapeAttr = s =>
  String(s).trim()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cssLinks() {
  return cdnRegistry()
    .filter(l => cdnEnabled.has(l.id))
    .flatMap(l => l.css)
    .map(u => `<link rel="stylesheet" href="${escapeAttr(u)}">`)
    .join('\n');
}

function jsScripts() {
  return cdnRegistry()
    .filter(l => cdnEnabled.has(l.id))
    .flatMap(l => l.js)
    .map(u => `<script src="${escapeAttr(u)}"></script>`)
    .join('\n');
}

function buildCdnRow(lib, isCustom) {
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

function renderCdnList() {
  cdnList.textContent = '';
  const all = cdnRegistry();
  let lastCat = '';
  for (const lib of all) {
    if (lib.category !== lastCat) {
      lastCat = lib.category;
      const head = document.createElement('div');
      head.className = 'cdn-cat';
      head.textContent = lib.category;
      cdnList.append(head);
    }
    const isCustom = lib.category === 'カスタム';
    const el = buildCdnRow(lib, isCustom);
    el.dataset.keywords = (lib.label + ' ' + (lib.keywords || '')).toLowerCase();
    cdnList.append(el);
  }
  applyCdnFilter(cdnSearch.value || '');
}

function applyCdnFilter(q) {
  const needle = q.trim().toLowerCase();
  let currentCat = null, visibleInCat = 0;
  const items = [...cdnList.children];
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

function deriveCdnLabel(url) {
  const last = url.split('/').pop() || url;
  const base = last.replace(/\.(min\s*)?\.(js|css)(\?|#.*)?$/i, '').replace(/\.(js|css)(\?|#.*)?$/i, '');
  return base || new URL(url).hostname;
}

function toggleLib(id) {
  if (cdnEnabled.has(id)) cdnEnabled.delete(id);
  else cdnEnabled.add(id);
  persistCdn();
  render();
}

function removeCustomLib(id) {
  cdnCustom = cdnCustom.filter(c => c.id !== id);
  cdnEnabled.delete(id);
  persistCdn();
  renderCdnList();
  render();
}

function closeCdnMenu() {
  cdnMenu.classList.remove('is-open');
  cdnBtn.setAttribute('aria-expanded', 'false');
}

function initCdn() {
  restoreCdn();
  renderCdnList();

  cdnBtn.addEventListener('click', () => {
    const open = cdnMenu.classList.toggle('is-open');
    cdnBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      renderCdnList();
      cdnSearch.value = '';
      applyCdnFilter('');
      setTimeout(() => cdnSearch.focus(), 30);
    }
  });

  cdnSearch.addEventListener('input', () => applyCdnFilter(cdnSearch.value));

  cdnList.addEventListener('click', e => {
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
    const on = cdnEnabled.has(id);
    row.classList.toggle('is-on', on);
    row.setAttribute('aria-pressed', String(on));
  });

  cdnCustomForm.addEventListener('submit', e => {
    e.preventDefault();
    const url = (cdnCustomUrl.value || '').trim();
    const type = cdnCustomForm.querySelector('input[name="cdn-kind"]:checked')?.value || 'js';
    let parsed = null;
    try { parsed = new URL(url); } catch { }
    if (!/^https?:\/\//i.test(url) || !parsed || !/^https?:$/.test(parsed.protocol)) {
      replayAnim(cdnCustomUrl, 'is-error');
      return;
    }
    const entry = {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: deriveCdnLabel(url),
      url,
      type: /^(js|css)$/.test(type) ? type : 'js'
    };
    cdnCustom.push(entry);
    cdnEnabled.add(entry.id);
    persistCdn();
    renderCdnList();
    cdnCustomUrl.value = '';
    render();
  });
}

const previewFrame = $('#preview');
const viewPane = $('#view');
const previewThemeToggle = $('#preview-theme-toggle');

let previewTheme = 'light';
let themeFlashTimer = null;

function adaptCss(css, theme) {
  return css.replace(
    /\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/gi,
    (_, mode) => mode.toLowerCase() === theme ? '(min-width: 0px)' : '(min-width: 999999px)'
  );
}

function wrapUserJs(js) {
  return `<script>${String(js).replace(/<\/script/gi, '<\\/script')}</script>`;
}

function buildDocument() {
  const links = cssLinks();
  const scripts = jsScripts();
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">` +
    `<style>:root{color-scheme:${previewTheme}}</style>` +
    `<style>${previewScrollbarCss(previewTheme)}</style>` +
    (links ? '\n' + links : '') +
    `<style>${adaptCss(code.css, previewTheme)}</style>` +
    `</head><body>${CONSOLE_SCRIPT}` +
    (scripts ? '\n' + scripts : '') +
    `\n${code.html}\n${wrapUserJs(code.javascript)}</body></html>`;
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

function appendLog(level, msg) {
  const row = document.createElement('div');
  row.className = 'log ' + level;
  const g = document.createElement('span');
  g.className = 'g';
  g.textContent = level === 'error' ? '×' : level === 'warn' ? '!' : level === 'input' ? '›' : '·';
  const body = document.createElement('span');
  body.className = 'msg';
  body.textContent = msg;
  row.append(g, body);
  const stick = isNearBottom();
  consoleLogs.append(row);
  while (consoleLogs.childElementCount > 500) consoleLogs.firstElementChild.remove();
  if (stick) consoleLogs.scrollTop = consoleLogs.scrollHeight;
}

function clearLogs() {
  consoleLogs.textContent = '';
  consoleJumpBtn.classList.remove('is-visible');
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
    appendLog(level, msg);
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
  tipHost.classList.remove('is-show', 'is-above');
  const rect = target.getBoundingClientRect();
  const tipW = tipHost.offsetWidth;
  const tipH = tipHost.offsetHeight;
  const margin = 8;
  let left = rect.left + rect.width / 2 - tipW / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
  let top = rect.bottom + 9;
  if (top + tipH > window.innerHeight - margin) {
    top = Math.max(margin, rect.top - tipH - 9);
    tipHost.classList.add('is-above');
  }
  tipHost.style.left = Math.round(left) + 'px';
  tipHost.style.top = Math.round(top) + 'px';
  const anchor = Math.min(Math.max(rect.left + rect.width / 2 - left, 15), tipW - 15);
  tipHost.style.setProperty('--tip-x', Math.round(anchor) + 'px');
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
      verticalScrollbarSize: FINE_POINTER.matches ? 12 : 16,
      horizontalScrollbarSize: FINE_POINTER.matches ? 12 : 16,
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      vertical: 'visible'
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

function onMonacoReady(onEditorReady) {
  defineSuiThemes();
  if (window.emmetMonaco) {
    emmetMonaco.emmetHTML(monaco);
    emmetMonaco.emmetCSS(monaco);
  }
  createModels();
  createEditor();

  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', e => {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    monaco.editor.setTheme(suiTheme());
    if (store.get('preview-theme', null) === null) {
      applyPreviewTheme(e.matches ? 'dark' : 'light');
    }
  });

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

async function onFormatClick() {
  if (isFormatting) return;
  const model = models[currentTab];
  if (!editor || !model) return;
  isFormatting = true;
  const btn = $('#btn-format');
  try {
    const ready = await waitForPrettier();
    if (!ready) { flash(btn, 'Failed'); return; }
    const formatted = await formatWithPrettier(model.getValue(), currentTab);
    if (formatted === null) { flash(btn, 'Failed'); return; }
    if (formatted !== model.getValue()) replaceModelText(model, formatted);
    flash(btn, 'Done');
  } finally {
    isFormatting = false;
  }
}

function replaceModelText(model, text) {
  model.pushStackElement();
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
  model.pushStackElement();
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

  $('#btn-format').addEventListener('click', onFormatClick);

  $('#btn-copy').addEventListener('click', () => {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getValue())
      .then(() => flash($('#btn-copy'), 'Copied'))
      .catch(() => flash($('#btn-copy'), 'Failed'));
  });
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

function composeExport(html, css, js) {
  html = String(html ?? '').replace(/\r\n?/g, '\n');
  const cssBlock = css ? '<style>\n' + css + '\n</style>' : '';
  const jsBlock = js ? '<script>\n' + String(js).replace(/<\/script/gi, '<\\/script') + '\n</script>' : '';
  const extra = { head: cssLinks(), body: jsScripts() };
  const hasCssRef = /<link\b[^>]*\bhref\s*=\s*["']?(?:\.\/)?style\.css(?=["'\s>?#])/i.test(html);
  const hasJsRef = /<script\b[^>]*\bsrc\s*=\s*["']?(?:\.\/)?script\.js(?=["'\s>?#])/i.test(html);

  if (hasCssRef) {
    let merged = false;
    html = html.replace(/<link\b[^>]*\bhref\s*=\s*["']?(?:\.\/)?style\.css(?=["'\s>?#])(?:[?#][^"'>]*)?["']?[^>]*>/gi, () => {
      if (merged) return '';
      merged = true;
      return cssBlock;
    });
  }
  if (hasJsRef) {
    let merged = false;
    html = html.replace(/<script\b[^>]*\bsrc\s*=\s*["']?(?:\.\/)?script\.js(?=["'\s>?#])(?:[?#][^"'>]*)?["']?[^>]*>\s*<\/script>/gi, () => {
      if (merged) return '';
      merged = true;
      return jsBlock;
    });
  }
  return composeDocument(
    html,
    hasCssRef ? '' : cssBlock,
    hasJsRef ? '' : jsBlock,
    extra
  );
}

function buildSplitFiles() {
  const ex = extractCode(code.html);
  const css = [code.css.trim(), ex.styles.join('\n\n')].filter(Boolean).join('\n\n');
  const js = [code.javascript.trim(), ex.scripts.join('\n\n')].filter(Boolean).join('\n\n');
  const hasCssRef = /<link\b[^>]*\bhref\s*=\s*["']?(?:\.\/)?style\.css(?=["'\s>?#])/i.test(ex.html);
  const hasJsRef = /<script\b[^>]*\bsrc\s*=\s*["']?(?:\.\/)?script\.js(?=["'\s>?#])/i.test(ex.html);
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

function applyImport(name, text) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'css') {
    setAllTexts({ css: text });
    setTab('css');
    return;
  }
  if (ext === 'js' || ext === 'mjs') {
    setAllTexts({ javascript: text });
    setTab('javascript');
    return;
  }
  const parsed = parseImportedHtml(text);
  const next = { html: parsed.html || text };
  if (parsed.css) next.css = parsed.css;
  if (parsed.js) next.javascript = parsed.js;
  setAllTexts(next);
  setTab('html');
}

const exportBtn = $('#btn-dl');
const exportMenu = $('#export-menu');
const fileImport = $('#file-import');

function closeExportMenu() {
  exportMenu.classList.remove('is-open');
  exportBtn.setAttribute('aria-expanded', 'false');
}

async function doExport(mode) {
  if (mode === 'split') {
    return saveFile(
      makeZip(buildSplitFiles()), 'suieditor.zip', 'application/zip',
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
    const file = fileImport.files && fileImport.files[0];
    fileImport.value = '';
    if (!file) return;
    try {
      applyImport(file.name, await file.text());
      render();
      pulsePreview();
      flash($('#btn-import'), 'Imported');
    } catch {
      flash($('#btn-import'), 'Failed');
    }
  });

  exportBtn.addEventListener('click', () => {
    const open = exportMenu.classList.toggle('is-open');
    exportBtn.setAttribute('aria-expanded', String(open));
  });
  exportMenu.querySelectorAll('[data-export]').forEach(b => {
    b.addEventListener('click', async () => {
      closeExportMenu();
      const result = await doExport(b.dataset.export);
      if (result) flash(exportBtn, result);
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

function wireClearDialog() {
  const btnClear = $('#btn-clear');
  const dlg = $('#clear-dialog');

  const run = texts => {
    setAllTexts(texts);
    render();
    flash(btnClear, 'Cleared');
  };

  btnClear.addEventListener('click', () => dlg.showModal());

  dlg.addEventListener('click', e => {
    if (e.target === dlg) dlg.close();
  });

  dlg.querySelectorAll('[data-clear]').forEach(b => {
    b.addEventListener('click', () => {
      const kind = b.dataset.clear;
      if (kind === 'reset') run(INITIAL_CODE);
      else if (kind === 'empty') run({ html: '', css: '', javascript: '' });
      dlg.close();
    });
  });
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
    if (!e.target.closest?.('.export-wrap')) closeExportMenu();
    if (!e.target.closest?.('.cdn-wrap')) closeCdnMenu();
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
    if (e.key === 'Escape') {
      if (e.target.closest?.('dialog')) return;
      closeExportMenu();
      closeCdnMenu();
      const consolePane = $('#console-pane');
      if (!e.target.closest?.('#monaco-editor') && !consolePane.classList.contains('is-hidden')) {
        $('#btn-toggle-console').click();
      }
    }
  });
}

initPreview();
initConsolePanel();
initCdn();
initEditor({ onEditorReady: clampDivider });
initExporter();
initLayout();
wireClearDialog();
wireGlobalHandlers();
initTooltips();

render();
positionThumb();
clampDivider();
syncViewportHeight();

addEventListener('pagehide', () => saveCode(true));
