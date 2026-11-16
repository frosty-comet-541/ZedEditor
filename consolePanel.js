/* ============================================================================
   consolePanel.js — 専用コンソール（UI・メッセージング・対話実行）
   ----------------------------------------------------------------------------
   - プレビュー（iframe）からの postMessage を受けてログを表示
   - 入力欄からプレビュー内で JavaScript を eval
   - sui:beforerender イベント（render の直前）でログを消去
   ========================================================================== */

import { $ } from './ui.js';
import { clampDivider } from './layout.js';

const preview = $('#preview');
const consoleLogs = $('#console-logs');
const consolePane = $('#console-pane');
const jumpBtn = $('#console-jump');
const consoleInput = $('#console-input');

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');

/** どれだけ下までスクロールしているか（最新に追従中か）。 */
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
  jumpBtn.classList.remove('is-visible');
}

export function initConsolePanel() {
  // ログ領域のスクロールで「最新へ」ボタンの出し入れ
  consoleLogs.addEventListener('scroll', () => {
    jumpBtn.classList.toggle(
      'is-visible',
      consoleLogs.childElementCount > 0 && !isNearBottom()
    );
  }, { passive: true });

  jumpBtn.addEventListener('click', () => {
    consoleLogs.scrollTo({
      top: consoleLogs.scrollHeight,
      behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth'
    });
  });

  // プレビューからのログ受信
  window.addEventListener('message', e => {
    if (e.source !== preview.contentWindow || !e.data || e.data.type !== 'console') return;
    const level = ['log', 'warn', 'error'].includes(e.data.level) ? e.data.level : 'log';
    const msg = typeof e.data.msg === 'string' ? e.data.msg.slice(0, 10000) : String(e.data.msg);
    appendLog(level, msg);
  });

  // 対話実行
  consoleInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || !e.target.value.trim()) return;
    appendLog('input', e.target.value);
    preview.contentWindow?.postMessage({ type: 'eval', cmd: e.target.value }, '*');
    e.target.value = '';
  });

  // フォーカスで最新までスクロール + レイアウト追従
  consoleInput.addEventListener('focus', () => {
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
    setTimeout(clampDivider, 60);
    setTimeout(clampDivider, 350);
  });

  // 開閉トグル
  const btnConsole = $('#btn-toggle-console');
  btnConsole.addEventListener('click', () => {
    const open = !consolePane.classList.toggle('is-hidden');
    btnConsole.classList.toggle('is-armed', open);
    btnConsole.setAttribute('aria-expanded', String(open));
    requestAnimationFrame(clampDivider);
    setTimeout(clampDivider, 420);
  });

  // ログ消去
  $('#btn-clear-console').addEventListener('click', clearLogs);

  // プレビュー再描画の直前にログをリセット
  document.addEventListener('sui:beforerender', clearLogs);
}
