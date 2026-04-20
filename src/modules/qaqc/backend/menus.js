import { hooks } from '../../../core/hooks.js';

export function registerQAQCMenus() {
  hooks.addFilter('system.menus', (menus) => {
    menus.push({
      id: 'qaqc',
      section: 'QAQC',
      permission: 'qaqc.projects.read',
      order: 20,
      items: [
        {
          label: 'Dự Án',
          to: '/qaqc/projects',
          permission: 'qaqc.projects.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>'
        },
        {
          label: 'Tiêu Chuẩn KB',
          to: '/qaqc/standards',
          permission: 'qaqc.standards.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
        },
        {
          label: 'Tra Cứu Tiêu Chuẩn',
          to: '/qaqc/standards/lookup',
          permission: 'qaqc.standards.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"></path></svg>'
        },
        {
          label: 'ITP',
          to: '/qaqc/itp',
          permission: 'qaqc.itp.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>'
        },
        {
          label: 'Kiểm Tra',
          to: '/qaqc/inspections',
          permission: 'qaqc.inspection.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        },
        {
          label: 'MIR',
          to: '/qaqc/mir',
          permission: 'qaqc.mir.read',
          icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>'
        },
      ]
    });
    return menus;
  });
}
