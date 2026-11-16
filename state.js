/* ============================================================================
   state.js — 3タブ分のコード（アプリの中心的な状態）
   ----------------------------------------------------------------------------
   - 保存データがあればそれで上書きし、初回起動時はスターターコード。
   - 保存は 500ms のデバウンス（タイピング中に毎回書き込まない）。
   ========================================================================== */

import { INITIAL_CODE } from './config.js';
import { store } from './storage.js';

/** 現在のコード。参照は shared だが、更新は setLang / mutateAll 経由で行うこと。 */
export const code = { ...INITIAL_CODE, ...store.get('code', {}) };

let saveTimer = null;

/** コードを保存する。immediate=true でデバウンスを飛ばして即時書き込み。 */
export function saveCode(immediate = false) {
  clearTimeout(saveTimer);
  if (immediate) store.set('code', code);
  else saveTimer = setTimeout(() => store.set('code', code), 500);
}

/** 1言語ぶんの更新（エディタのモデル変更時に呼ばれる）。 */
export function setLang(lang, value) {
  code[lang] = value;
  saveCode();
}
