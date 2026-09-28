/**
 * Offer Calculator UI — screens: Basic | Scientific | History | Themes | Settings
 */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let expression = '';
  let justEvaluated = false;
  let wakeLock = null;

  function state() {
    return CalcStorage.get();
  }

  function applyTheme() {
    const s = state();
    const root = document.documentElement;
    root.setAttribute('data-theme', s.theme || 'light');
    root.setAttribute('data-accent', s.accent || 'blue');
    // Premium OLED / accent extras
    root.classList.toggle('premium-unlocked', !!s.premiumThemes);
    root.classList.toggle('ads-removed', !!s.adsRemoved);
  }

  function updateDisplay() {
    const exprEl = $('#expr-line');
    const resultEl = $('#result-line');
    const memEl = $('#mem-indicator');
    const angleEl = $('#angle-indicator');
    const s = state();

    if (exprEl) exprEl.textContent = expression || '0';
    if (memEl) {
      memEl.hidden = s.memory === null || s.memory === undefined;
      memEl.textContent = 'M';
    }
    if (angleEl) angleEl.textContent = (s.angleMode || 'deg').toUpperCase();

    if (!resultEl) return;
    if (!expression) {
      resultEl.textContent = '0';
      resultEl.classList.remove('error');
      return;
    }
    if (justEvaluated) {
      // result already set by equals
      return;
    }
    const prev = Calc.preview(expression, s.angleMode);
    if (prev !== '') {
      resultEl.textContent = prev;
      resultEl.classList.remove('error');
    } else {
      // incomplete — show last number chunk if any
      resultEl.textContent = '';
      resultEl.classList.remove('error');
    }
  }

  function setResult(text, isError) {
    const resultEl = $('#result-line');
    if (!resultEl) return;
    resultEl.textContent = text;
    resultEl.classList.toggle('error', !!isError);
  }

  function append(token) {
    CalcAudio.feedback();
    if (justEvaluated) {
      // After equals: digit/decimal/func/const starts fresh; operator continues from result
      if (/^[0-9.]$/.test(token) || token === '(' || token === 'π' || token === 'e' ||
          /^(sin|cos|tan|asin|acos|atan|log|ln|√)/.test(token)) {
        expression = '';
      } else if (/^[+\-×÷^]$/.test(token) || token === 'x^y') {
        // keep expression as the result value
      } else {
        expression = '';
      }
      justEvaluated = false;
    }
    if (token === 'x^y') {
      expression += '^';
    } else if (token === 'x²') {
      expression += '^2';
    } else if (token === '1/x') {
      if (!expression || justEvaluated) expression = '1/';
      else expression = '1/(' + expression + ')';
    } else if (/^(sin|cos|tan|asin|acos|atan|log|ln)$/.test(token)) {
      expression += token + '(';
    } else if (token === '√') {
      expression += '√(';
    } else {
      expression += token;
    }
    updateDisplay();
  }

  function backspace() {
    CalcAudio.feedback();
    if (justEvaluated) {
      expression = '';
      justEvaluated = false;
      updateDisplay();
      return;
    }
    // Remove multi-char funcs from end if present
    const funcs = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'log', 'ln', 'sqrt'];
    for (const f of funcs) {
      if (expression.endsWith(f)) {
        expression = expression.slice(0, -f.length);
        updateDisplay();
        return;
      }
    }
    expression = expression.slice(0, -1);
    updateDisplay();
  }

  function clearAll() {
    CalcAudio.feedback();
    expression = '';
    justEvaluated = false;
    updateDisplay();
  }

  function clearEntry() {
    CalcAudio.feedback();
    // Clear last number entry
    expression = expression.replace(/([+\-×÷*/^%(]|√|sin|cos|tan|asin|acos|atan|log|ln)?[\d.]+e?[+\-]?\d*$/i, function (m, op) {
      return op || '';
    });
    if (justEvaluated) {
      expression = '';
      justEvaluated = false;
    }
    updateDisplay();
  }

  function toggleSign() {
    CalcAudio.feedback();
    if (justEvaluated) {
      const r = Calc.evaluate(expression, state().angleMode);
      if (r.ok) {
        expression = Calc.formatNumber(-r.value);
        justEvaluated = false;
        updateDisplay();
      }
      return;
    }
    // Toggle sign of trailing number
    const m = expression.match(/^(.*?)([+\-×÷*/^(])?(-?\d+\.?\d*(?:e[+\-]?\d+)?)$/i);
    if (m) {
      const head = m[1] + (m[2] || '');
      let num = m[3];
      if (num.charAt(0) === '-') num = num.slice(1);
      else num = '-' + num;
      expression = head + num;
    } else if (expression) {
      expression = '-(' + expression + ')';
    }
    updateDisplay();
  }

  function equals() {
    CalcAudio.feedback();
    const s = state();
    const r = Calc.evaluate(expression, s.angleMode);
    if (r.ok) {
      CalcStorage.addHistory(expression, r.display);
      setResult(r.display, false);
      expression = r.display;
      justEvaluated = true;
      const exprEl = $('#expr-line');
      if (exprEl) exprEl.textContent = expression;
    } else {
      setResult(friendlyError(r.error || r.display), true);
      justEvaluated = true;
    }
  }

  function friendlyError(msg) {
    const map = {
      '÷ by 0': 'Cannot divide by zero',
      Overflow: 'Number too large',
      Domain: 'Invalid input',
      Undefined: 'Undefined',
      'Invalid factorial': 'Invalid factorial',
      'Factorial needs integer': 'Factorial needs a whole number',
      'Mismatched )': 'Check parentheses',
      'Mismatched (': 'Check parentheses',
      'Bad expression': 'Incomplete expression',
      'Missing operand': 'Incomplete expression',
      'Missing arg': 'Incomplete expression',
      'Bad number': 'Invalid number'
    };
    return map[msg] || msg || 'Error';
  }

  // —— Memory ——
  function memClear() {
    CalcAudio.feedback();
    CalcStorage.setMemory(null);
    updateDisplay();
  }
  function memRecall() {
    CalcAudio.feedback();
    const m = CalcStorage.getMemory();
    if (m === null || m === undefined) return;
    const t = Calc.formatNumber(m);
    if (justEvaluated || !expression) {
      expression = t;
      justEvaluated = false;
    } else {
      expression += t;
    }
    updateDisplay();
  }
  function memAdd() {
    CalcAudio.feedback();
    const s = state();
    const r = Calc.evaluate(expression || '0', s.angleMode);
    if (!r.ok) return;
    const cur = CalcStorage.getMemory();
    CalcStorage.setMemory((cur == null ? 0 : cur) + r.value);
    updateDisplay();
  }
  function memSub() {
    CalcAudio.feedback();
    const s = state();
    const r = Calc.evaluate(expression || '0', s.angleMode);
    if (!r.ok) return;
    const cur = CalcStorage.getMemory();
    CalcStorage.setMemory((cur == null ? 0 : cur) - r.value);
    updateDisplay();
  }
  function memStore() {
    CalcAudio.feedback();
    const s = state();
    const r = Calc.evaluate(expression || '0', s.angleMode);
    if (!r.ok) return;
    CalcStorage.setMemory(r.value);
    updateDisplay();
  }

  async function copyResult() {
    CalcAudio.feedback();
    const text = ($('#result-line') && $('#result-line').textContent) || expression || '0';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast('Copied');
    } catch (_) {
      toast('Copy failed');
    }
  }

  async function pasteExpr() {
    CalcAudio.feedback();
    try {
      let text = '';
      if (navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
      text = String(text || '').trim().replace(/,/g, '');
      if (!text) { toast('Clipboard empty'); return; }
      // sanitize: keep calc chars
      text = text.replace(/[^0-9+\-×÷*/^().%πeEasincoqtlg√!\s]/gi, '');
      if (!text) { toast('Nothing to paste'); return; }
      if (justEvaluated) {
        expression = text;
        justEvaluated = false;
      } else {
        expression += text;
      }
      updateDisplay();
      toast('Pasted');
    } catch (_) {
      toast('Paste not available');
    }
  }

  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 1400);
  }

  // —— Tabs / screens ——
  function showScreen(name) {
    $$('.screen').forEach((s) => {
      const on = s.dataset.screen === name;
      s.hidden = !on;
      s.classList.toggle('active', on);
    });
    $$('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === name);
      b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false');
    });
    CalcStorage.set({ lastTab: name });

    const disp = document.getElementById('calc-display-wrap');
    if (disp) disp.hidden = !(name === 'basic' || name === 'scientific');

    // Banner only on history / themes — NEVER over keypad
    if (name === 'history' || name === 'themes') {
      Ads.showBanner(name);
      if (name === 'history') renderHistory();
      if (name === 'themes') renderThemes();
    } else {
      Ads.hideBanner();
    }
    if (name === 'settings') renderSettings();
    if (name === 'basic' || name === 'scientific') updateDisplay();
  }

  function renderHistory() {
    const list = $('#history-list');
    if (!list) return;
    const hist = state().history || [];
    if (!hist.length) {
      list.innerHTML = '<p class="empty-hint">No history yet. Calculate something!</p>';
      return;
    }
    list.innerHTML = hist
      .map(
        (h, i) =>
          `<button type="button" class="history-item" data-idx="${i}" aria-label="Reuse ${escapeHtml(h.expr)} = ${escapeHtml(h.result)}">
            <span class="h-expr">${escapeHtml(h.expr)}</span>
            <span class="h-res">= ${escapeHtml(h.result)}</span>
          </button>`
      )
      .join('');
    list.querySelectorAll('.history-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const h = state().history[idx];
        if (!h) return;
        expression = h.expr;
        justEvaluated = false;
        showScreen('basic');
        updateDisplay();
      });
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function clearHistoryUI() {
    const len = (state().history || []).length;
    CalcStorage.clearHistory();
    renderHistory();
    toast('History cleared');
    // Rare interstitial after clearing a long history — never blocks calc
    if (len >= 10) {
      await Ads.showInterstitial('interstitial_history');
    }
  }

  const THEMES = [
    { id: 'light', label: 'Light', premium: false },
    { id: 'dark', label: 'Dark', premium: false },
    { id: 'oled', label: 'OLED Black', premium: true }
  ];
  const ACCENTS = [
    { id: 'blue', label: 'Blue', premium: false },
    { id: 'green', label: 'Green', premium: false },
    { id: 'purple', label: 'Purple', premium: true },
    { id: 'orange', label: 'Orange', premium: true },
    { id: 'pink', label: 'Pink', premium: true }
  ];

  function renderThemes() {
    const host = $('#themes-panels');
    if (!host) return;
    const s = state();
    const unlocked = !!s.premiumThemes;

    let html = '<h2 class="panel-title">Theme</h2><div class="theme-grid">';
    THEMES.forEach((t) => {
      const locked = t.premium && !unlocked;
      html += `<button type="button" class="theme-card ${s.theme === t.id ? 'selected' : ''} ${locked ? 'locked' : ''}"
        data-theme="${t.id}" ${locked ? 'data-locked="1"' : ''} aria-label="Theme ${t.label}${locked ? ' (premium)' : ''}">
        <span class="swatch theme-${t.id}"></span>
        <span>${t.label}${locked ? ' 🔒' : ''}</span>
      </button>`;
    });
    html += '</div><h2 class="panel-title">Accent</h2><div class="theme-grid">';
    ACCENTS.forEach((a) => {
      const locked = a.premium && !unlocked;
      html += `<button type="button" class="theme-card ${s.accent === a.id ? 'selected' : ''} ${locked ? 'locked' : ''}"
        data-accent="${a.id}" ${locked ? 'data-locked="1"' : ''} aria-label="Accent ${a.label}${locked ? ' (premium)' : ''}">
        <span class="swatch accent-${a.id}"></span>
        <span>${a.label}${locked ? ' 🔒' : ''}</span>
      </button>`;
    });
    html += '</div>';
    html += `<div class="unlock-box">
      <p>${unlocked ? 'Premium themes unlocked. Ads removed.' : 'Watch a rewarded ad (stub) to unlock premium themes and remove the banner.'}</p>
      ${unlocked ? '' : '<button type="button" class="btn-primary" id="btn-unlock-premium" aria-label="Unlock premium themes">Unlock premium</button>'}
    </div>`;
    host.innerHTML = html;

    host.querySelectorAll('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (btn.dataset.locked) {
          await unlockPremium();
          return;
        }
        CalcStorage.set({ theme: btn.dataset.theme });
        applyTheme();
        renderThemes();
      });
    });
    host.querySelectorAll('[data-accent]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (btn.dataset.locked) {
          await unlockPremium();
          return;
        }
        CalcStorage.set({ accent: btn.dataset.accent });
        applyTheme();
        renderThemes();
      });
    });
    const unlockBtn = $('#btn-unlock-premium');
    if (unlockBtn) unlockBtn.addEventListener('click', unlockPremium);
  }

  async function unlockPremium() {
    const res = await Ads.showRewarded('premium_themes');
    if (res && res.rewarded) {
      CalcStorage.set({ premiumThemes: true, adsRemoved: true });
      applyTheme();
      Ads.hideBanner();
      renderThemes();
      toast('Premium unlocked');
    } else {
      toast('Unlock cancelled');
    }
  }

  function renderSettings() {
    const s = state();
    const sound = $('#set-sound');
    const haptic = $('#set-haptic');
    const keep = $('#set-keep-on');
    const angle = $('#set-angle');
    if (sound) sound.checked = !!s.sound;
    if (haptic) haptic.checked = !!s.haptic;
    if (keep) keep.checked = !!s.keepScreenOn;
    if (angle) angle.value = s.angleMode || 'deg';
  }

  async function toggleWakeLock(on) {
    CalcStorage.set({ keepScreenOn: !!on });
    try {
      if (on) {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; });
          toast('Keep screen on');
        } else {
          toast('Wake Lock not supported (stub OK)');
        }
      } else if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (_) {
      toast('Wake Lock unavailable');
    }
  }

  function bindKeys() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-key]');
      if (!btn) return;
      const key = btn.getAttribute('data-key');
      handleKey(key);
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key;
      if (k >= '0' && k <= '9') { handleKey(k); e.preventDefault(); }
      else if (k === '.') { handleKey('.'); e.preventDefault(); }
      else if (k === '+') { handleKey('+'); e.preventDefault(); }
      else if (k === '-') { handleKey('−'); e.preventDefault(); }
      else if (k === '*') { handleKey('×'); e.preventDefault(); }
      else if (k === '/') { handleKey('÷'); e.preventDefault(); }
      else if (k === '%') { handleKey('%'); e.preventDefault(); }
      else if (k === '^') { handleKey('x^y'); e.preventDefault(); }
      else if (k === '(' || k === ')') { handleKey(k); e.preventDefault(); }
      else if (k === 'Enter' || k === '=') { handleKey('='); e.preventDefault(); }
      else if (k === 'Backspace') { handleKey('back'); e.preventDefault(); }
      else if (k === 'Escape') { handleKey('C'); e.preventDefault(); }
      else if (k === '!') { handleKey('!'); e.preventDefault(); }
    });
  }

  function handleKey(key) {
    switch (key) {
      case 'C': clearAll(); break;
      case 'CE': clearEntry(); break;
      case 'back': backspace(); break;
      case '±': toggleSign(); break;
      case '=': equals(); break;
      case 'MC': memClear(); break;
      case 'MR': memRecall(); break;
      case 'M+': memAdd(); break;
      case 'M−': memSub(); break;
      case 'MS': memStore(); break;
      case 'DEG':
      case 'RAD': {
        const next = state().angleMode === 'deg' ? 'rad' : 'deg';
        CalcStorage.set({ angleMode: next });
        updateDisplay();
        CalcAudio.feedback();
        break;
      }
      case 'copy': copyResult(); break;
      case 'paste': pasteExpr(); break;
      default:
        append(key);
    }
  }

  function bindChrome() {
    $$('.tab-btn').forEach((b) => {
      b.addEventListener('click', () => showScreen(b.dataset.tab));
    });
    const clearHist = $('#btn-clear-history');
    if (clearHist) clearHist.addEventListener('click', clearHistoryUI);

    const sound = $('#set-sound');
    if (sound) sound.addEventListener('change', () => CalcStorage.set({ sound: sound.checked }));
    const haptic = $('#set-haptic');
    if (haptic) haptic.addEventListener('change', () => CalcStorage.set({ haptic: haptic.checked }));
    const keep = $('#set-keep-on');
    if (keep) keep.addEventListener('change', () => toggleWakeLock(keep.checked));
    const angle = $('#set-angle');
    if (angle) {
      angle.addEventListener('change', () => {
        CalcStorage.set({ angleMode: angle.value });
        updateDisplay();
      });
    }
  }

  function init() {
    applyTheme();
    bindKeys();
    bindChrome();
    const tab = state().lastTab || 'basic';
    const valid = ['basic', 'scientific', 'history', 'themes', 'settings'];
    showScreen(valid.indexOf(tab) >= 0 ? tab : 'basic');
    updateDisplay();

    // SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
