/* ============================================================================
   config.js — アプリ全体で共有する定義
   （状態の変更は一切行わない、純粋な定数モジュール）
   ========================================================================== */

/** エディタのタブ（言語キー）。 */
export const LANGS = ['html', 'css', 'javascript'];

/** Monaco Editor の CDN ベースパス。 */
export const MONACO_BASE =
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min';

/** 「初期コードに戻す」で復元されるスターターコード。 */
export const INITIAL_CODE = {
  html: '<div class="container">\n  <h1>こんにちは、SuiEditorへようこそ！</h1>\n  <p>コードを編集すると、リアルタイムでプレビューが更新されます。</p>\n</div>',
  css: ':root {\n  --bg: #ffffff;\n  --text: #1e1e1e;\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n    --bg: #1a1a1a;\n    --text: #e7e7e7;\n  }\n}\n\nbody {\n  font-family: system-ui, -apple-system, sans-serif;\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n  margin: 0;\n  background-color: var(--bg);\n  color: var(--text);\n  transition:\n    background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),\n    color 0.2s cubic-bezier(0.16, 1, 0.3, 1);\n}\n\n.container {\n  text-align: center;\n  padding: 2rem;\n  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n}\n\n@keyframes fadeIn {\n  from {\n    opacity: 0;\n    transform: translateY(8px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}',
  javascript: 'console.log("SuiEditorの準備が完了しました。");'
};

/** Prettier による整形オプション（js-beautify 側の設定は editor.js で組み立てる）。 */
export const PRETTIER_OPTS = {
  printWidth: 80, tabWidth: 2, useTabs: false,
  singleQuote: false, semi: true, trailingComma: 'all',
  bracketSpacing: true, arrowParens: 'always', endOfLine: 'lf'
};

/* ============================================================================
   プレビュー内で console・エラー・eval を親ウィンドウへ中継するグルー処理。
   srcdoc 内で <script> として展開するため、開始／終了タグごと文字列にしている。
   ========================================================================== */
export const CONSOLE_SCRIPT = `
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

/* ============================================================================
   CDN ライブラリのワンクリック追加 — プリセット一覧
   version は全 URL の到達性を検証済みの固定値。
   js / css の順序がそのまま読み込み順になる（依存関係のあるものは昇順に）。
   ========================================================================== */
export const CDN_LIBRARIES = [
  /* --- フレームワーク ------------------------------------------------- */
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

  /* --- UI / デザイン --------------------------------------------------- */
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

  /* --- アニメーション ------------------------------------------------- */
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

  /* --- グラフ / データ -------------------------------------------------- */
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

  /* --- ユーティリティ -------------------------------------------------- */
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

  /* --- 3D / クリエイティブ ---------------------------------------------- */
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
