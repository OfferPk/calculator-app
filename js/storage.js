/**
 * localStorage: history, memory, themes, settings, premium unlocks.
 */
(function (global) {
  'use strict';

  const KEY = 'offer-calc-v1';
  const HISTORY_CAP = 50;

  const DEFAULTS = {
    history: [],
    memory: null,
    angleMode: 'deg', // deg | rad
    theme: 'light', // light | dark | oled
    accent: 'blue', // blue | green | purple | orange | pink
    premiumThemes: false,
    adsRemoved: false,
    sound: false,
    haptic: false,
    keepScreenOn: false,
    lastTab: 'basic'
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      const data = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, data);
    } catch (_) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) { /* quota / private mode */ }
  }

  let state = load();

  function get() {
    return state;
  }

  function set(patch) {
    state = Object.assign({}, state, patch);
    save(state);
    return state;
  }

  function addHistory(expr, result) {
    const entry = {
      expr: String(expr),
      result: String(result),
      ts: Date.now()
    };
    const history = [entry].concat(state.history || []).slice(0, HISTORY_CAP);
    return set({ history });
  }

  function clearHistory() {
    return set({ history: [] });
  }

  function setMemory(v) {
    return set({ memory: v === null || v === undefined ? null : Number(v) });
  }

  function getMemory() {
    return state.memory;
  }

  global.CalcStorage = {
    KEY,
    HISTORY_CAP,
    DEFAULTS,
    get,
    set,
    addHistory,
    clearHistory,
    setMemory,
    getMemory,
    reload: function () { state = load(); return state; }
  };
})(typeof window !== 'undefined' ? window : global);
