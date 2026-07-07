/**
 * Post-processing for the web export so it works as an installable PWA on
 * GitHub Pages:
 *   1. Inject PWA meta tags (manifest, apple-touch-icon, theme-color, etc.)
 *      into index.html. We do this here rather than via app/+html.tsx because
 *      the "single" (SPA) web output does not render +html.tsx, and switching
 *      to "static" output would server-render components that touch
 *      localStorage (our persisted store) and break.
 *   2. Copy index.html to 404.html so GitHub Pages serves the SPA for deep
 *      links / refreshes on sub-routes instead of a 404.
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const indexPath = path.join(dist, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

// Base path must match app.json expo.experiments.baseUrl (+ trailing slash).
const base = '/foodtracker/';

const head = `
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <style>
      /* Paint the whole page (incl. the safe-area / home-indicator region) in the
         app's dark background so no white shows through under a standalone PWA. */
      html, body, #root { background-color: #0e1116; }
    </style>
    <link rel="manifest" href="${base}manifest.json" />
    <meta name="theme-color" content="#0e1116" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Health" />
    <link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />
    <link rel="icon" type="image/png" href="${base}icon-192.png" />
    <script>
      // Drive in-app navigation as pure client-side transitions so tab taps and
      // links never trigger a full reload (which a static host serves as a fresh
      // document). react-navigation listens for popstate, so pushState + a
      // synthesized popstate switches the route in place.
      document.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        var h = a.getAttribute('href');
        if (h && h.charAt(0) === '/' && !a.target) {
          e.preventDefault();
          if (location.pathname !== h) {
            history.pushState(null, '', h);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      }, true);
    </script>
`;

let html = fs.readFileSync(indexPath, 'utf8');

// Ensure the viewport opts into the safe-area insets (viewport-fit=cover), so
// react-native-safe-area-context reports a non-zero bottom inset in a
// standalone iPhone PWA and the tab bar can pad above the home indicator.
html = html.replace(/<meta name="viewport"[^>]*>/i, (m) =>
  /viewport-fit=cover/i.test(m) ? m : m.replace(/"\s*\/?>$/, ', viewport-fit=cover" />'),
);
if (!/viewport-fit=cover/i.test(html)) {
  html = html.replace(
    '</head>',
    '  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n  </head>',
  );
}

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${head}  </head>`);
  fs.writeFileSync(indexPath, html);
  console.log('Injected PWA meta tags into index.html');
} else {
  console.log('PWA meta tags already present');
}

// SPA fallback for GitHub Pages.
fs.writeFileSync(path.join(dist, '404.html'), html);
console.log('Wrote dist/404.html (SPA fallback)');
