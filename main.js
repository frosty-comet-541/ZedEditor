/* ============================================================================
   main.js — エントリポイント（各モジュールの初期化と横断的な配線）
   ----------------------------------------------------------------------------
   依存の向き：
     config ← storage ← state ← editor ← preview ← cdn
     consolePanel / exporter / layout は上記を参照するだけで互いを参照しない。
     このファイルだけが全モジュールを束ねる（composition root）。
   ========================================================================== */

import { INITIAL_CODE } from './config.js';
import { saveCode } from './state.js';
import { render, pulsePreview, initPreview } from './preview.js';
import { initConsolePanel } from './consolePanel.js';
import { initCdn, closeCdnMenu } from './cdn.js';
import { initEditor, positionThumb, setAllTexts } from './editor.js';
import { initExporter, closeExportMenu } from './exporter.js';
import { initLayout, clampDivider, syncViewportHeight } from './layout.js';
import { $, flash } from './ui.js';

/* ============================================================================
   クリア機能（要件5）— 操作を選べるダイアログ
   ① 初期コードに戻す ／ ② すべて空にする ／ ③ キャンセル
   ========================================================================== */

function wireClearDialog() {
  const btnClear = $('#btn-clear');
  const dlg = $('#clear-dialog');

  const run = texts => {
    setAllTexts(texts);   // model・state の両方を更新して即時保存
    render();             // ログも消えてプレビューが再描画される
    flash(btnClear, 'Cleared');
  };

  btnClear.addEventListener('click', () => dlg.showModal());

  // 背景クリックで閉じる（dialog 自体は閉じないので判定して close）
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

/* ============================================================================
   横断的なグローバルハンドラ
   ========================================================================== */

function wireGlobalHandlers() {
  // ピンチズーム・Ctrl+ホイール拡大の抑止
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });

  // タップ時にボタンの裏へ残った選択を解除 ＆ メニューを閉じる
  document.addEventListener('pointerdown', e => {
    if (e.target.closest?.('button, #console-input')) {
      const sel = getSelection();
      if (sel && !sel.isCollapsed) sel.removeAllRanges();
    }
    if (!e.target.closest?.('.export-wrap')) closeExportMenu();
    if (!e.target.closest?.('.cdn-wrap')) closeCdnMenu();
  });

  // キーボードショートカット
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
      if (e.target.closest?.('dialog')) return;  // dialog は cancel で自前処理
      closeExportMenu();
      closeCdnMenu();
      const consolePane = $('#console-pane');
      if (!e.target.closest?.('#monaco-editor') && !consolePane.classList.contains('is-hidden')) {
        $('#btn-toggle-console').click();
      }
    }
  });
}

/* ============================================================================
   起動
   ========================================================================== */

initPreview();
initConsolePanel();
initCdn({ onRefresh: render });          // CDN トグルで即プレビューへ反映
initEditor({ onEditorReady: clampDivider }); // Monaco 起動後に再計算
initExporter();
initLayout();
wireClearDialog();
wireGlobalHandlers();

// 初回描画とレイアウト確定
render();
positionThumb();
clampDivider();
syncViewportHeight();

// ページ離脱時はデバウンスを飛ばして即保存
addEventListener('pagehide', () => saveCode(true));
