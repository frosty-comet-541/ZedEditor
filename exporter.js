/* ============================================================================
   exporter.js — ファイルの読み込みと書き出し
   ----------------------------------------------------------------------------
   - Import : .html / .css / .js を読み込み、style/script は抽出して各タブへ
   - Export :
     ・一括（1ファイル）… CDN タグ＋ユーザーコードを index.html へ統合
     ・分割（3ファイル）… index.html / style.css / script.js の ZIP
       ※ どちらも有効中のCDNライブラリの <link>/<script> を index.html に注入
   - ZIP は外部ライブラリなしで生成（CRC32・STORE 方式を自前実装）
   ========================================================================== */

import { code } from './state.js';
import { cssLinks, jsScripts } from './cdn.js';
import { setAllTexts, setTab } from './editor.js';
import { render, pulsePreview } from './preview.js';
import { $, flash } from './ui.js';

/* -------------------------------------------------- HTML フラグメント処理 -- */

/** <style> とインライン <script> を HTML から切り出す。 */
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

/** 読み込んだHTMLを3タブぶんの内容へ分解する。 */
function parseImportedHtml(text) {
  const ex = extractCode(text);
  const body = ex.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return {
    html: (body ? body[1] : ex.html).trim(),
    css: ex.styles.join('\n\n'),
    js: ex.scripts.join('\n\n')
  };
}

/* ------------------------------------------------------ 文書の骨格構築 --- */

/**
 * ブロック（<link>/<style>/<script> の文字列）を文書へ注入するヘルパー。
 * injectHead    : head の末尾へ（<body> の直前に入るフォールバック付き）
 * injectBodyEnd : body の末尾へ（</body> → <body>開始後 → </html>前 の順で代替）
 */
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

/**
 * 断片の HTML を完全な文書へ組み立てる。
 * extra = { head, body } はCDNライブラリ等の追加タグ。
 * 注入順は「ライブラリ → ユーザーコード」となり、ユーザー側が常に優先される。
 */
function composeDocument(html, cssBlock, jsBlock, extra = {}) {
  const headExtra = extra.head || '';
  const bodyExtra = extra.body || '';
  html = String(html ?? '').replace(/\r\n?/g, '\n').trim();

  // 完全な文書に近い場合はそのまま、断片なら骨格を補う
  if (!/<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]|<\/head|<\/body|<\/html/i.test(html)) {
    let out = '<!DOCTYPE html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n';
    if (headExtra) out += headExtra + '\n';
    if (cssBlock) out += cssBlock + '\n';
    out += '</head>\n<body>\n';
    if (bodyExtra) out += bodyExtra + '\n';   // ライブラリを先に（インラインscriptからの利用可）
    out += html + '\n';
    if (jsBlock) out += jsBlock + '\n';
    return out + '</body>\n</html>';
  }

  let out = html;
  const has = re => re.test(out);

  // <body> の補完
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
  // <head> の補完
  if (!has(/<head[\s>]|<\/head\s*>/i) && has(/<body(\s[^>]*)?>/i)) {
    out = out.replace(/<body(\s[^>]*)?>/i, m => '<head>\n<meta charset="utf-8">\n</head>\n' + m);
  }
  // </body> の補完
  if (has(/<body(\s[^>]*)?>/i) && !has(/<\/body\s*>/i)) {
    out = has(/<\/html\s*>/i)
      ? out.replace(/<\/html\s*>/i, m => '</body>\n' + m)
      : out + '\n</body>';
  }
  // <html> / </html> / <!DOCTYPE> の補完
  if (!has(/<html[\s>]/i)) {
    out = has(/<head(\s[^>]*)?>/i)
      ? out.replace(/<head(\s[^>]*)?>/i, m => '<html>\n' + m)
      : has(/<body(\s[^>]*)?>/i)
        ? out.replace(/<body(\s[^>]*)?>/i, m => '<html>\n' + m)
        : '<html>\n' + out;
  }
  if (!has(/<\/html\s*>/i)) out += '\n</html>';
  if (!has(/<!doctype\s+html/i)) out = '<!DOCTYPE html>\n' + out;

  // ユーザーコード（後から入るのでライブラリより優先される）
  out = injectHead(out, headExtra);
  out = injectHead(out, cssBlock);
  out = injectBodyEnd(out, bodyExtra);
  out = injectBodyEnd(out, jsBlock);
  return out;
}

/* ---------------------------------------------------- 書き出し用の組み立て -- */

/** 一括書き出し：style.css / script.js 参照をインラインへ統合した index.html。 */
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

/** 分割書き出し：index.html / style.css / script.js の3ファイル分。 */
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

/* ------------------------------------------------------ ファイル保存 --- */

/** File System Access API → a[download] → クリップボード の順でフォールバック。 */
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
      } catch { /* クリップボードも不可 */ }
    }
    return 'Failed';
  }
}

/* ---------------------------------------------------------- ZIP 生成 --- */

/** 外部ライブラリなしの ZIP（STORE 圧縮 + CRC32）。 */
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

/* ---------------------------------------------------------- 読み込み --- */

/** 読み込んだファイルの内容を各タブへ反映する。 */
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

/* ------------------------------------------------------------- 配線 --- */

const btnDl = $('#btn-dl');
const exportMenu = $('#export-menu');
const fileImport = $('#file-import');

export function closeExportMenu() {
  exportMenu.classList.remove('is-open');
  btnDl.setAttribute('aria-expanded', 'false');
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

export function initExporter() {
  // 読み込み
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

  // 書き出しメニュー
  btnDl.addEventListener('click', () => {
    const open = exportMenu.classList.toggle('is-open');
    btnDl.setAttribute('aria-expanded', String(open));
  });
  exportMenu.querySelectorAll('[data-export]').forEach(b => {
    b.addEventListener('click', async () => {
      closeExportMenu();
      const result = await doExport(b.dataset.export);
      if (result) flash(btnDl, result);
    });
  });
}
