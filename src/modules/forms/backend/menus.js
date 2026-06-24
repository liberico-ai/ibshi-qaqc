import { hooks } from '../../../core/hooks.js';

export function registerFormsMenus() {
  hooks.addFilter('system.menus', (menus) => {
    menus.push({
      id: 'forms',
      section: 'QAQC',
      permission: 'forms.rfi.read',
      order: 30,
      items: [
        {
          label: 'RFI',
          to: '/forms/rfi',
          permission: 'forms.rfi.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z"></path></svg>'
        },
        {
          label: 'Sơn / DFT',
          to: '/forms/painting',
          permission: 'forms.painting.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>'
        },
        {
          label: 'Thử áp lực',
          to: '/forms/pressure',
          permission: 'forms.pressure.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>'
        },
      ]
    });
    return menus;
  });
}
