import { createSSRApp } from 'vue';
import { createMemoryHistory, createWebHistory, createRouter } from 'vue-router';
import './index.css';
import App from './App.vue';
import { loadFrontendModules } from './core/frontend-loader.js';
import { vCan } from './directives/can.js';

export async function createApp(isServer) {
  const app = createSSRApp(App);
  
  // Register global directives
  app.directive('can', vCan);  
  const router = createRouter({
    history: isServer ? createMemoryHistory() : createWebHistory(),
    routes: [] // modules will inject routes here
  });

  // Call feature modules to register components, routes, stores
  await loadFrontendModules(app, router);

  // Default catch-all route if none matched
  router.addRoute({
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: { template: '<div>Page Not Found</div>' }
  });

  app.use(router);
  return { app, router };
}
