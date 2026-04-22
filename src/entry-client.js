import { createApp } from './app.js';
import { setLocale } from './plugins/i18n.js';
import { apiFetch } from './utils/api.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

async function syncLocaleFromServer() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await apiFetch('/api/system/users/me/preferences');
    if (!res.ok) return;
    const { data } = await res.json();
    if (data?.language) setLocale(data.language);
  } catch { /* ignore */ }
}

createApp(false).then(({ app, router }) => {
  // wait until router is ready before mounting to ensure hydration mismatch
  // doesn't happen
  router.isReady().then(() => {
    app.mount('#app');
    syncLocaleFromServer();

    // Fade out and remove the global loader seamlessly
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
      setTimeout(() => loader.remove(), 400); // 400ms transition match
    }
  });
});
