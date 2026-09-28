#!/usr/bin/env node
/** Smoke tests for calc engine + storage helpers */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = {
  console,
  Math,
  Date,
  Number,
  String,
  Object,
  Array,
  JSON,
  parseInt,
  parseFloat,
  isNaN: Number.isNaN,
  localStorage: (() => {
    const store = {};
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    };
  })()
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

load('js/calc.js');
load('js/storage.js');

const Calc = sandbox.Calc;
const Storage = sandbox.CalcStorage;
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✓', msg); }
  else { failed++; console.error('  ✗', msg); }
}

console.log('== Basic ==');
{
  const r = Calc.evaluate('2+2', 'deg');
  assert(r.ok && r.value === 4 && r.display === '4', '2+2 = 4 (got ' + r.display + ')');
}
{
  const r = Calc.evaluate('0.1+0.2', 'deg');
  assert(r.ok && r.display === '0.3', '0.1+0.2 displays 0.3 (got ' + r.display + ')');
}
{
  const r = Calc.evaluate('2+3×4', 'deg');
  assert(r.ok && r.value === 14, 'order of ops 2+3×4 = 14');
}
{
  const r = Calc.evaluate('(2+3)×4', 'deg');
  assert(r.ok && r.value === 20, 'parens (2+3)×4 = 20');
}
{
  const r = Calc.evaluate('10÷0', 'deg');
  assert(!r.ok && /0/.test(r.error || r.display), '÷0 friendly error');
}

console.log('== Trig deg/rad ==');
{
  const r = Calc.evaluate('sin(90)', 'deg');
  assert(r.ok && Math.abs(r.value - 1) < 1e-9, 'sin(90) deg = 1 (got ' + r.value + ')');
}
{
  const r = Calc.evaluate('sin(π/2)', 'rad');
  // π token + /2 — need expression with pi
  const r2 = Calc.evaluate('sin(π÷2)', 'rad');
  assert(r2.ok && Math.abs(r2.value - 1) < 1e-9, 'sin(π÷2) rad = 1 (got ' + r2.value + ')');
}
{
  const r = Calc.evaluate('cos(0)', 'deg');
  assert(r.ok && r.value === 1, 'cos(0)=1');
}

console.log('== Scientific ==');
{
  const r = Calc.evaluate('√(16)', 'deg');
  assert(r.ok && r.value === 4, '√16 = 4');
}
{
  const r = Calc.evaluate('5!', 'deg');
  assert(r.ok && r.value === 120, '5! = 120');
}
{
  const r = Calc.evaluate('2^10', 'deg');
  assert(r.ok && r.value === 1024, '2^10 = 1024');
}
{
  const r = Calc.evaluate('log(100)', 'deg');
  assert(r.ok && r.value === 2, 'log(100)=2');
}
{
  const r = Calc.evaluate('50%', 'deg');
  assert(r.ok && r.value === 0.5, '50% = 0.5');
}

console.log('== Memory / history storage ==');
{
  Storage.setMemory(42);
  assert(Storage.getMemory() === 42, 'MS / memory store');
  Storage.setMemory(null);
  assert(Storage.getMemory() === null, 'MC');
  Storage.clearHistory();
  Storage.addHistory('2+2', '4');
  assert(Storage.get().history.length === 1, 'history add');
  for (let i = 0; i < 60; i++) Storage.addHistory('x' + i, String(i));
  assert(Storage.get().history.length === 50, 'history capped at 50');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
