import { hooks } from '../../../core/hooks.js';

export function registerWeldingMenus() {
  hooks.addFilter('system.menus', (menus) => {
    menus.push({
      id: 'welding',
      section: 'Quản lý hàn',
      permission: 'welding.wps.read',
      order: 30,
      items: [
        {
          label: 'WPS / PQR',
          to: '/welding/wps',
          permission: 'welding.wps.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
        },
        {
          label: 'Thợ hàn',
          to: '/welding/welders',
          permission: 'welding.welder.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
        },
        {
          label: 'Bản đồ mối hàn',
          to: '/welding/weldmaps',
          permission: 'welding.weldmap.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>'
        },
      ]
    });
    return menus;
  });
}
