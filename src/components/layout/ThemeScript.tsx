/**
 * Inlined, blocking script that applies the saved theme class before React
 * hydrates, so there is no flash of the wrong theme. Reads only a tiny
 * localStorage flag (not IndexedDB, which is async) — the full settings
 * object still lives in IndexedDB and is loaded by useSettings afterward.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('maar-theme');
    var theme = stored || 'system';
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    document.documentElement.classList.toggle('light', resolved === 'light');
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduce-motion');
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
