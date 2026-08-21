'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type MaarSettings } from '@/lib/db/settings';

export function useSettings() {
  const [settings, setSettings] = useState<MaarSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setReady(true);
      applyThemeToDocument(s.theme);
      applyMotionToDocument(s.reduceMotion);
    });
  }, []);

  const update = useCallback((patch: Partial<MaarSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      if (patch.theme) {
        localStorage.setItem('maar-theme', patch.theme);
        applyThemeToDocument(patch.theme);
      }
      if (typeof patch.reduceMotion === 'boolean') {
        applyMotionToDocument(patch.reduceMotion);
      }
      return next;
    });
  }, []);

  return { settings, updateSettings: update, ready };
}

function applyThemeToDocument(theme: MaarSettings['theme']) {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  document.documentElement.classList.toggle('light', resolved === 'light');
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function applyMotionToDocument(reduceMotion: boolean) {
  document.documentElement.classList.toggle('reduce-motion', reduceMotion);
}
