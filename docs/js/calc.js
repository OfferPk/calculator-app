/**
 * Offer Calculator — core expression engine (offline, no deps).
 * Supports basic ops, %, scientific funcs, deg/rad, factorial, order of ops.
 */
(function (global) {
  'use strict';

  const DISPLAY_MAX = 14;
  const HISTORY_CAP = 50;
  const EPS = 1e-12;

  function formatNumber(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return 'Error';
    if (!Number.isFinite(n)) return 'Overflow';
    if (Object.is(n, -0)) n = 0;
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e14 || abs < 1e-10)) {
      const s = n.toExponential(10).replace(/\.?0+e/, 'e').replace(/e\+/, 'e');
      return trimExp(s);
    }
    // Round to avoid 0.1+0.2 junk while keeping sensible precision
    let s = Number(n.toPrecision(12)).toString();
    if (s.indexOf('e') !== -1) return trimExp(s);
    if (s.indexOf('.') !== -1) {
      s = s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '');
    }
    if (s === '-0') s = '0';
    if (s.length > DISPLAY_MAX) {
      return trimExp(n.toExponential(8));
    }
    return s;
  }

  function trimExp(s) {
    return s
      .replace(/(\.\d*?[1-9])0+e/, '$1e')
      .replace(/\.0+e/, 'e')
      .replace(/e\+/, 'e');
  }

  function factorial(n) {
    if (!Number.isFinite(n) || n < 0) throw new Error('Invalid factorial');
    if (Math.abs(n - Math.round(n)) > EPS) throw new Error('Factorial needs integer');
    n = Math.round(n);
    if (n > 170) throw new Error('Overflow');
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function toRad(x, angleMode) {
    return angleMode === 'deg' ? (x * Math.PI) / 180 : x;
  }

  function fromRad(x, angleMode) {
    return angleMode === 'deg' ? (x * 180) / Math.PI : x;
  }

  // Tokenizer: numbers, operators, functions, constants, parens
  const FUNC_NAMES = [
    'asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs'
  ];

  function tokenize(expr) {
    const s = String(expr).replace(/\s+/g, '');
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if ((c >= '0' && c <= '9') || c === '.') {
        let j = i + 1;
        while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.' || s[j] === 'e' || s[j] === 'E')) {
          if ((s[j] === 'e' || s[j] === 'E') && (s[j + 1] === '+' || s[j + 1] === '-')) j += 2;
          else j++;
        }
        const num = s.slice(i, j);
        if (num === '.' || Number.isNaN(Number(num))) throw new Error('Bad number');
        tokens.push({ type: 'num', value: Number(num) });
        i = j;
        continue;
      }
      if (c === 'π' || (c === 'p' && s[i + 1] === 'i')) {
        tokens.push({ type: 'num', value: Math.PI });
        i += c === 'π' ? 1 : 2;
        continue;
      }
      if (c === 'e' && (i + 1 >= s.length || !/[a-zA-Z0-9.]/.test(s[i + 1]))) {
        // standalone e constant (not part of function name — funcs handled below)
        tokens.push({ type: 'num', value: Math.E });
        i++;
        continue;
      }
      // functions (longest first)
      let matched = false;
      for (const name of FUNC_NAMES) {
        if (s.slice(i, i + name.length).toLowerCase() === name) {
          tokens.push({ type: 'func', value: name });
          i += name.length;
          matched = true;
          break;
        }
      }
      if (matched) continue;

      if (c === '×' || c === '*') { tokens.push({ type: 'op', value: '*' }); i++; continue; }
      if (c === '÷' || c === '/') { tokens.push({ type: 'op', value: '/' }); i++; continue; }
      if (c === '−' || c === '-') { tokens.push({ type: 'op', value: '-' }); i++; continue; }
      if (c === '+') { tokens.push({ type: 'op', value: '+' }); i++; continue; }
      if (c === '^') { tokens.push({ type: 'op', value: '^' }); i++; continue; }
      if (c === '%') { tokens.push({ type: 'op', value: '%' }); i++; continue; }
      if (c === '!') { tokens.push({ type: 'op', value: '!' }); i++; continue; }
      if (c === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
      if (c === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
      if (c === '√') { tokens.push({ type: 'func', value: 'sqrt' }); i++; continue; }
      throw new Error('Unexpected: ' + c);
    }
    return tokens;
  }

  // Insert implicit multiplication: 2π, 2(, )(, )2, π(, func after num
  function insertImplicitMul(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const prev = out[out.length - 1];
      if (prev) {
        const need =
          (prev.type === 'num' || prev.type === 'rparen' || prev.value === '!') &&
          (t.type === 'num' || t.type === 'lparen' || t.type === 'func');
        if (need) out.push({ type: 'op', value: '*' });
      }
      out.push(t);
    }
    return out;
  }

  // Unary minus: at start, after op or lparen
  function handleUnary(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'op' && t.value === '-') {
        const prev = out[out.length - 1];
        if (!prev || prev.type === 'op' || prev.type === 'lparen' || prev.type === 'func') {
          out.push({ type: 'func', value: 'neg' });
          continue;
        }
      }
      if (t.type === 'op' && t.value === '+') {
        const prev = out[out.length - 1];
        if (!prev || prev.type === 'op' || prev.type === 'lparen' || prev.type === 'func') {
          continue; // unary plus — skip
        }
      }
      out.push(t);
    }
    return out;
  }

  const PREC = { '!': 5, '%': 5, '^': 4, '*': 3, '/': 3, '+': 2, '-': 2 };
  const RIGHT_ASSOC = { '^': true };

  function toRPN(tokens) {
    const output = [];
    const stack = [];
    for (const t of tokens) {
      if (t.type === 'num') {
        output.push(t);
      } else if (t.type === 'func') {
        stack.push(t);
      } else if (t.type === 'op') {
        if (t.value === '!' || t.value === '%') {
          // postfix unary
          while (stack.length) {
            const top = stack[stack.length - 1];
            if (top.type === 'func') { output.push(stack.pop()); continue; }
            if (top.type === 'op' && PREC[top.value] > PREC[t.value]) {
              output.push(stack.pop());
              continue;
            }
            break;
          }
          output.push(t);
        } else {
          while (stack.length) {
            const top = stack[stack.length - 1];
            if (top.type === 'func') {
              output.push(stack.pop());
              continue;
            }
            if (top.type === 'op') {
              const pTop = PREC[top.value];
              const pCur = PREC[t.value];
              if (pTop > pCur || (pTop === pCur && !RIGHT_ASSOC[t.value])) {
                output.push(stack.pop());
                continue;
              }
            }
            break;
          }
          stack.push(t);
        }
      } else if (t.type === 'lparen') {
        stack.push(t);
      } else if (t.type === 'rparen') {
        while (stack.length && stack[stack.length - 1].type !== 'lparen') {
          output.push(stack.pop());
        }
        if (!stack.length) throw new Error('Mismatched )');
        stack.pop(); // lparen
        if (stack.length && stack[stack.length - 1].type === 'func') {
          output.push(stack.pop());
        }
      }
    }
    while (stack.length) {
      const t = stack.pop();
      if (t.type === 'lparen' || t.type === 'rparen') throw new Error('Mismatched (');
      output.push(t);
    }
    return output;
  }

  function evalRPN(rpn, angleMode) {
    const st = [];
    for (const t of rpn) {
      if (t.type === 'num') {
        st.push(t.value);
      } else if (t.type === 'func') {
        if (!st.length && t.value !== 'neg') throw new Error('Missing arg');
        const a = t.value === 'neg' ? (st.length ? st.pop() : 0) : st.pop();
        let r;
        switch (t.value) {
          case 'neg': r = -a; break;
          case 'sin': r = Math.sin(toRad(a, angleMode)); break;
          case 'cos': r = Math.cos(toRad(a, angleMode)); break;
          case 'tan': {
            const rad = toRad(a, angleMode);
            // Near odd multiples of π/2 → overflow
            const mod = Math.abs(rad / (Math.PI / 2));
            const nearest = Math.round(mod);
            if (nearest % 2 === 1 && Math.abs(mod - nearest) < 1e-10) throw new Error('Undefined');
            r = Math.tan(rad);
            break;
          }
          case 'asin':
            if (a < -1 || a > 1) throw new Error('Domain');
            r = fromRad(Math.asin(a), angleMode);
            break;
          case 'acos':
            if (a < -1 || a > 1) throw new Error('Domain');
            r = fromRad(Math.acos(a), angleMode);
            break;
          case 'atan':
            r = fromRad(Math.atan(a), angleMode);
            break;
          case 'log':
            if (a <= 0) throw new Error('Domain');
            r = Math.log10(a);
            break;
          case 'ln':
            if (a <= 0) throw new Error('Domain');
            r = Math.log(a);
            break;
          case 'sqrt':
            if (a < 0) throw new Error('Domain');
            r = Math.sqrt(a);
            break;
          case 'abs':
            r = Math.abs(a);
            break;
          default:
            throw new Error('Unknown func');
        }
        if (!Number.isFinite(r)) throw new Error('Overflow');
        // Snap near-integers (trig of nice angles)
        if (Math.abs(r) < EPS) r = 0;
        else if (Math.abs(r - Math.round(r)) < 1e-10) r = Math.round(r);
        st.push(r);
      } else if (t.type === 'op') {
        if (t.value === '!') {
          if (!st.length) throw new Error('Missing arg');
          st.push(factorial(st.pop()));
        } else if (t.value === '%') {
          if (!st.length) throw new Error('Missing arg');
          st.push(st.pop() / 100);
        } else {
          if (st.length < 2) throw new Error('Missing operand');
          const b = st.pop();
          const a = st.pop();
          let r;
          switch (t.value) {
            case '+': r = a + b; break;
            case '-': r = a - b; break;
            case '*': r = a * b; break;
            case '/':
              if (b === 0) throw new Error('÷ by 0');
              r = a / b;
              break;
            case '^':
              r = Math.pow(a, b);
              break;
            default:
              throw new Error('Unknown op');
          }
          if (!Number.isFinite(r)) throw new Error('Overflow');
          st.push(r);
        }
      }
    }
    if (st.length !== 1) throw new Error('Bad expression');
    return st[0];
  }

  function evaluate(expr, angleMode) {
    const raw = String(expr || '').trim();
    if (!raw) return { ok: true, value: 0, display: '0' };
    try {
      let tokens = tokenize(raw);
      tokens = insertImplicitMul(tokens);
      tokens = handleUnary(tokens);
      const rpn = toRPN(tokens);
      const value = evalRPN(rpn, angleMode || 'deg');
      return { ok: true, value, display: formatNumber(value) };
    } catch (e) {
      return { ok: false, error: e.message || 'Error', display: e.message || 'Error' };
    }
  }

  /** Live preview — returns display string or '' if incomplete/invalid */
  function preview(expr, angleMode) {
    const raw = String(expr || '').trim();
    if (!raw) return '';
    // Don't preview trailing operators (incomplete)
    if (/[+\-×÷*/^]$/.test(raw.replace(/\s+$/, ''))) return '';
    // Allow unmatched open parens by auto-closing for preview
    let open = 0;
    for (const ch of raw) {
      if (ch === '(') open++;
      else if (ch === ')') open--;
    }
    let patched = raw;
    while (open > 0) { patched += ')'; open--; }
    const r = evaluate(patched, angleMode);
    return r.ok ? r.display : '';
  }

  global.Calc = {
    evaluate,
    preview,
    formatNumber,
    HISTORY_CAP,
    DISPLAY_MAX
  };
})(typeof window !== 'undefined' ? window : global);
