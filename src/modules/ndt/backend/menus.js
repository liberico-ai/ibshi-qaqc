import { hooks } from '../../../core/hooks.js';

export function registerNDTMenus() {
  hooks.addFilter('system.menus', (menus) => {
    menus.push({
      id: 'ndt',
      section: 'NDT',
      permission: 'ndt.request.read',
      order: 31,
      items: [
        {
          label: 'Yêu cầu NDT',
          to: '/ndt/requests',
          permission: 'ndt.request.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>'
        },
        {
          label: 'Nhà thầu NDT',
          to: '/ndt/vendors',
          permission: 'ndt.request.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>'
        },
      ]
    });
    return menus;
  });
}
