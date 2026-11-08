'use strict';

const audioSettings = (() => {
  const channels = {
    menu: { label: 'Menu music', legacy: 'rr-music' },
    level: { label: 'Level music', legacy: 'rr-music' },
    engine: { label: 'Engine sound', legacy: 'rr-sound' },
    effects: { label: 'Race cues and effects', legacy: 'rr-sound' }
  };
  const key = 'rr-audio-settings';
  let settings = {};

  function reload() {
    try {
      settings = JSON.parse(localStorage.getItem(key)) ?? {};
    } catch {
      settings = {};
    }
  }

  function get(channel) {
    const saved = settings[channel];
    let enabled = saved?.enabled;
    if (typeof enabled !== 'boolean') {
      try {
        enabled = localStorage.getItem(channels[channel].legacy) !== 'off';
      } catch {
        enabled = true;
      }
    }
    const volume = saved?.volume;
    return { enabled, volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1 };
  }

  function set(channel, change) {
    settings = { ...settings, [channel]: { ...get(channel), ...change } };
    try {
      localStorage.setItem(key, JSON.stringify(settings));
    } catch {}
  }

  function level(channel) {
    const { enabled, volume } = get(channel);
    return enabled ? volume : 0;
  }

  reload();
  return { channels, get, set, level, reload, key };
})();
