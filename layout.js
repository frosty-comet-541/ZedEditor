/* ============================================================================
   layout.js — エディタ／プレビューの分割とビューポート追従
   ----------------------------------------------------------------------------
   - ドラッグ・キーボード・プログラム指定で分割比を変更（25〜75%にクランプ）
   - モバイル縦画面では visualViewport に合わせて高さを補正（キーボード対策）
   - 最小幅は nav の内容量から動的に計算（折り返しで崩れないように）
   ========================================================================== */

import { $ } from './ui.js';
import { positionThumb, getActiveEditor } from './editor.js';

const divider = $('#divider');
const consolePane = $('#console-pane');

/* 最小幅の計測用に一時的に min-content へ */
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
  const consoleOpen = !consolePane.classList.contains('is-hidden');
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
      viewMinPx = viewNavH + gap + (consolePane?.offsetHeight || 0);
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

/** 現在の分割比を制限内へ再クランプする（resize・console開閉後に呼ぶ）。 */
export function clampDivider() {
  const L = computeLimits();
  divider.setAttribute('aria-valuemin', String(Math.round(L.minS)));
  divider.setAttribute('aria-valuemax', String(Math.round(L.maxS)));
  setSplit(parseFloat(document.body.style.getPropertyValue('--s')) || 50, L);
}

/* -------------------------------------------------------- ドラッグ操作 -- */

let isDragging = false;
let dragLimits = null;

function stopDrag(e) {
  if (!isDragging) return;
  isDragging = false;
  dragLimits = null;
  try { divider.releasePointerCapture(e.pointerId); } catch { /* すでに解放済み */ }
  document.body.classList.remove('is-dragging');
  $('#edit').style.transition = '';
}

/* ---------------------------------------------------- モバイルの高さ補正 -- */

let prevVH = 0;
let splitBeforeKeyboard = null;

export function syncViewportHeight() {
  const vv = window.visualViewport;
  if (!vv) return;
  if (window.innerWidth <= 720) {
    const h = Math.round(vv.height);
    document.body.style.height = h + 'px';
    const y = Math.round(vv.offsetTop || 0);
    document.body.style.transform = y ? 'translateY(' + y + 'px)' : '';
    if (prevVH && prevVH - h > 120 && splitBeforeKeyboard === null) {
      splitBeforeKeyboard = parseFloat(document.body.style.getPropertyValue('--s')) || 50;
    } else if (prevVH && h - prevVH > 120 && splitBeforeKeyboard !== null) {
      document.body.style.setProperty('--s', splitBeforeKeyboard + '%');
      splitBeforeKeyboard = null;
    }
    prevVH = h;
  } else if (document.body.style.height) {
    document.body.style.height = '';
    document.body.style.transform = '';
    prevVH = 0;
    splitBeforeKeyboard = null;
  }
  clampDivider();
}

export function initLayout() {
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
