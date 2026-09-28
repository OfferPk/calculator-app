/**
 * AdMob stubs — banner / interstitial / rewarded.
 * Banner ONLY on History / Themes secondary screens — never over keypad.
 * Rewarded unlocks premium themes + remove-ads (one-time stub).
 * Interstitial rare (e.g. after clearing long history) — never blocks calc.
 * Core calculate is 100% offline free.
 */
(function (global) {
  'use strict';

  const CONFIG = global.ADMOB_CONFIG || {
    enabled: false,
    bannerId: null,
    interstitialId: null,
    rewardedId: null
  };

  const REASON_LABELS = {
    premium_themes: 'Unlock premium themes + remove ads (one-time)',
    remove_ads: 'Remove ads + unlock premium themes (one-time)',
    interstitial_history: 'Interstitial after clearing long history'
  };

  function showBanner(slot) {
    // slot: 'history' | 'themes' — only allowed secondary screens
    if (slot !== 'history' && slot !== 'themes') {
      return Promise.resolve({ shown: false, reason: 'blocked-keypad' });
    }
    const el = document.getElementById('ad-banner');
    if (!el) return Promise.resolve({ shown: false, reason: 'no-el' });

    // Respect remove-ads unlock
    try {
      if (global.CalcStorage && global.CalcStorage.get().adsRemoved) {
        el.hidden = true;
        return Promise.resolve({ shown: false, reason: 'ads-removed' });
      }
    } catch (_) {}

    if (!CONFIG.enabled || !CONFIG.bannerId) {
      el.hidden = false;
      el.setAttribute('data-slot', slot);
      el.querySelector('.ad-banner-label') &&
        (el.querySelector('.ad-banner-label').textContent =
          'Ad banner stub (' + slot + ') — never on keypad');
      return Promise.resolve({ shown: true, stub: true, slot: slot });
    }
    return Promise.resolve({ shown: false, reason: 'no-plugin' });
  }

  function hideBanner() {
    const el = document.getElementById('ad-banner');
    if (el) el.hidden = true;
    return Promise.resolve();
  }

  function showInterstitial(reason) {
    return new Promise((resolve) => {
      if (!CONFIG.enabled || !CONFIG.interstitialId) {
        resolve({ shown: false, reason: 'stub', context: reason || 'interstitial_history' });
        return;
      }
      resolve({ shown: false, reason: 'no-plugin' });
    });
  }

  function showRewarded(reason) {
    return new Promise((resolve) => {
      const label = REASON_LABELS[reason] || ('Reward: ' + reason);
      if (!CONFIG.enabled || !CONFIG.rewardedId) {
        const host = document.getElementById('modal-ad-stub');
        if (host) {
          const title = host.querySelector('.ad-stub-title');
          const body = host.querySelector('.ad-stub-body');
          if (title) title.textContent = 'Rewarded Ad (stub)';
          if (body) {
            body.textContent =
              label +
              '\n\nNo AdMob ID configured. Offline stub.\nGrant unlock for this device?';
          }
          host.hidden = false;
          const yesBtn = host.querySelector('[data-ad-yes]');
          const noBtn = host.querySelector('[data-ad-no]');
          const onYes = () => {
            cleanup();
            resolve({ rewarded: true, stub: true, reason: reason });
          };
          const onNo = () => {
            cleanup();
            resolve({ rewarded: false, stub: true, reason: reason });
          };
          function cleanup() {
            host.hidden = true;
            yesBtn && yesBtn.removeEventListener('click', onYes);
            noBtn && noBtn.removeEventListener('click', onNo);
          }
          yesBtn && yesBtn.addEventListener('click', onYes);
          noBtn && noBtn.addEventListener('click', onNo);
          return;
        }
        const ok = confirm('Rewarded ad stub (no AdMob).\n\n' + label + '\n\nGrant reward?');
        resolve({ rewarded: !!ok, stub: true, reason: reason });
        return;
      }
      resolve({ rewarded: false, reason: 'no-plugin' });
    });
  }

  global.Ads = {
    CONFIG,
    showBanner,
    hideBanner,
    showInterstitial,
    showRewarded
  };
})(typeof window !== 'undefined' ? window : global);
