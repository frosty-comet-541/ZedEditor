/* ============================================================================
   storage.js — localStorage の堅牢なラッパー（要件1：ローカルストレージの堅牢性）
   ----------------------------------------------------------------------------
   耐性の仕組み：
   1) probe()      … 起動時に一度だけ書き込みテストを行い、利用可否を判定
                      （無効化・プライベートモード・ドメイン制限等を拾う）
   2) メモリフォールバック … 書き込みは常にインメモリ Map へミラー。
                      localStorage に書けなくても「セッション内」では動作し続ける
   3) JSON 破損    … get はパース失敗時に既定値へフォールバック
   4) クォータ超過 … set 失敗時、自アプリのキーを掃除して 1 度だけ再試行し、
                      それでも失敗すれば以降はメモリ専用モードへ切り替え
   ========================================================================== */

/** このアプリが使うキー（クォータ超過時の掃除対象）。 */
const OWN_KEYS = ['theme', 'code', 'preview-theme', 'cdn', 'cdn-custom'];

const memory = new Map();
/** 'unknown' | 'local' | 'memory' */
let mode = 'unknown';
let noticed = false;

function probe() {
  if (mode !== 'unknown') return;
  try {
    const k = '__sui_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    mode = 'local';
  } catch {
    mode = 'memory';
    if (!noticed) {
      noticed = true;
      console.info(
        'SuiEditor: localStorage が利用できないため、保存はこのセッション内のみ有効です。'
      );
    }
  }
}

/** クォータ超過時に自アプリのキーを掃除する。 */
function sweepOwnKeys() {
  for (const k of OWN_KEYS) {
    try { window.localStorage.removeItem(k); } catch { /* 読み書き自体が失敗する環境 */ }
  }
}

function parse(raw) {
  try {
    const v = JSON.parse(raw);
    return (v === null || v === undefined) ? undefined : v;
  } catch {
    return undefined; // 破損データ
  }
}

export const store = {
  /**
   * 値の読み出し。優先順位は
   *   ① メモリミラー（直近の書き込み結果）
   *   ② localStorage（JSON 破損時は fallback）
   *   ③ fallback
   */
  get(key, fallback) {
    if (memory.has(key)) {
      const v = memory.get(key);
      return (v === undefined || v === null) ? fallback : v;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      const v = parse(raw);
      return v === undefined ? fallback : v;
    } catch {
      return fallback;
    }
  },

  /**
   * 値の書き込み。メモリへ必ずミラーした上で localStorage を試す。
   * localStorage に書けなくても、セッション内の動作は維持されるため
   * 戻り値は true（=アプリとして保持成功）。false は検証エラー等のみ。
   */
  set(key, value) {
    probe();
    memory.set(key, value);
    if (mode === 'memory') return true;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      mode = 'local';
      return true;
    } catch {
      // クォータ超過の可能性 → 掃除して 1 度だけ再試行
      sweepOwnKeys();
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        // 以降はメモリ専用モード（毎回例外を投げないよう打ち切る）
        mode = 'memory';
        if (!noticed) {
          noticed = true;
          console.info(
            'SuiEditor: localStorage に書き込めなかったため、保存はこのセッション内のみ有効です。'
          );
        }
        return true;
      }
    }
  }
};

// モジュール読み込み時に一度だけ判定しておく（以降の get/set が軽くなる）
probe();
