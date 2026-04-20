import { createApp } from './app.js';

createApp(false).then(({ app, router }) => {
  // wait until router is ready before mounting to ensure hydration mismatch
  // doesn't happen
  router.isReady().then(() => {
    app.mount('#app');
    
    // Fade out and remove the global loader seamlessly
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
      setTimeout(() => loader.remove(), 400); // 400ms transition match
    }
  });
});
