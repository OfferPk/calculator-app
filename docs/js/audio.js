/**
 * Optional key click sound (Web Audio) + haptic vibration stub.
 */
(function (global) {
  'use strict';

  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function beep(freq, dur, gain) {
    try {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = freq || 620;
      g.gain.value = gain || 0.04;
      o.connect(g);
      g.connect(c.destination);
      const t = c.currentTime;
      g.gain.setValueAtTime(gain || 0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.04));
      o.start(t);
      o.stop(t + (dur || 0.05));
    } catch (_) {}
  }

  function keySound() {
    const st = global.CalcStorage && global.CalcStorage.get();
    if (!st || !st.sound) return;
    beep(720, 0.035, 0.035);
  }

  function haptic() {
    const st = global.CalcStorage && global.CalcStorage.get();
    if (!st || !st.haptic) return;
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch (_) {}
  }

  function feedback() {
    keySound();
    haptic();
  }

  global.CalcAudio = { beep, keySound, haptic, feedback };
})(typeof window !== 'undefined' ? window : global);
