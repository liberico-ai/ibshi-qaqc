import { hooks } from '../../../core/hooks.js';

export function registerPortalMenus() {
  hooks.addFilter('system.menus', (menus) => {
    menus.push({
      id: 'portal',
      section: 'Cổng khách hàng',
      permission: 'portal.view',
      order: 90,
      items: [
        {
          label: 'Cổng khách hàng',
          to: '/portal/projects',
          permission: 'portal.view',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>'
        },
      ]
    });
    return menus;
  });
}
