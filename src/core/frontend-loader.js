export async function loadFrontendModules(app, router) {
  const modules = import.meta.glob('../modules/*/frontend/index.js', { eager: true });
  
  const keys = Object.keys(modules).sort((a, b) => {
    if (a.includes('/system/')) return -1;
    if (b.includes('/system/')) return 1;
    return a.localeCompare(b);
  });

  for (const path of keys) {
    const mod = modules[path];
    if (typeof mod.default === 'function') {
      mod.default(app, router);
    }
  }
}
